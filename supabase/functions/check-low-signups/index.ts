import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      console.error("Missing Telegram configuration");
      return new Response(
        JSON.stringify({ error: "Telegram not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get games scheduled between 23 and 25 hours from now (to catch the ~24 hour window)
    const now = new Date();
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log(`Checking for games between ${in23Hours.toISOString()} and ${in25Hours.toISOString()}`);

    // Fetch games in the 24-hour window
    const { data: games, error: gamesError } = await supabase
      .from('games_schedule')
      .select('id, scheduled_at, pitch_size')
      .gte('scheduled_at', in23Hours.toISOString())
      .lte('scheduled_at', in25Hours.toISOString());

    if (gamesError) {
      console.error("Error fetching games:", gamesError);
      throw gamesError;
    }

    console.log(`Found ${games?.length || 0} games in 24-hour window`);

    if (!games || games.length === 0) {
      return new Response(
        JSON.stringify({ message: "No games in 24-hour window" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notifications: string[] = [];

    for (const game of games) {
      // Fetch signups with player/guest details (excluding dropouts)
      const { data: signups, error: signupsError } = await supabase
        .from('games_schedule_signups')
        .select(`
          id,
          is_guest,
          guest_name,
          signed_up_at,
          players:player_id (id, name),
          guests:guest_id (id, name)
        `)
        .eq('game_schedule_id', game.id)
        .or('last_minute_dropout.is.null,last_minute_dropout.eq.false')
        .order('signed_up_at', { ascending: true });

      if (signupsError) {
        console.error(`Error fetching signups for game ${game.id}:`, signupsError);
        continue;
      }

      const signupCount = signups?.length || 0;
      const capacity = game.pitch_size === 'small' ? 12 : 14;
      const isUnderCapacity = signupCount < capacity;

      console.log(`Game ${game.id}: ${signupCount}/${capacity} signups, under capacity: ${isUnderCapacity}`);

      // Format game date
      const gameDate = new Date(game.scheduled_at);
      const formattedDate = gameDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Build player list
      const playerNames: string[] = [];
      const waitlistNames: string[] = [];
      
      (signups || []).forEach((signup: any, index: number) => {
        let name = '';
        if (signup.is_guest) {
          name = signup.guests?.name || signup.guest_name || 'Unknown Guest';
          name = `👤 ${name} (guest)`;
        } else {
          name = signup.players?.name || 'Unknown';
        }
        
        if (index < capacity) {
          playerNames.push(`${index + 1}. ${name}`);
        } else {
          waitlistNames.push(`${index - capacity + 1}. ${name}`);
        }
      });

      // Build message
      let message: string;
      const pitchInfo = game.pitch_size === 'small' ? 'Small pitch' : game.pitch_size === 'big' ? 'Big pitch' : 'Pitch TBD';
      
      if (isUnderCapacity) {
        // Warning style - under capacity
        const spotsNeeded = capacity - signupCount;
        message = `⚠️ *TOMORROW'S GAME NEEDS PLAYERS!*\n`;
        message += `🗓️ ${formattedDate}\n`;
        message += `⚽ ${pitchInfo}\n`;
        message += `📊 *${signupCount}/${capacity}* signed up\n`;
        message += `🔴 *${spotsNeeded} more needed!*\n\n`;
      } else {
        // Normal style - at or over capacity
        message = `📋 *Tomorrow's Game Summary*\n`;
        message += `🗓️ ${formattedDate}\n`;
        message += `⚽ ${pitchInfo}\n`;
        message += `✅ *${signupCount >= capacity ? 'Full' : signupCount + '/' + capacity}*\n\n`;
      }

      // Add player list
      if (playerNames.length > 0) {
        message += `*Playing:*\n${playerNames.join('\n')}\n`;
      } else {
        message += `_No players signed up yet_\n`;
      }

      // Add waitlist if any
      if (waitlistNames.length > 0) {
        message += `\n*Waitlist:*\n${waitlistNames.join('\n')}`;
      }

      // Send Telegram notification
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`Summary sent for game ${game.id}`);
        notifications.push(game.id);
      } else {
        console.error(`Failed to send summary for game ${game.id}:`, result);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Checked ${games.length} games, sent ${notifications.length} summaries`,
        notifications 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in check-low-signups:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});