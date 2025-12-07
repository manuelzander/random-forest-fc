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

    const warnings: string[] = [];

    for (const game of games) {
      // Count signups for this game (excluding last_minute_dropout)
      const { count, error: countError } = await supabase
        .from('games_schedule_signups')
        .select('*', { count: 'exact', head: true })
        .eq('game_schedule_id', game.id)
        .or('last_minute_dropout.is.null,last_minute_dropout.eq.false');

      if (countError) {
        console.error(`Error counting signups for game ${game.id}:`, countError);
        continue;
      }

      const signupCount = count || 0;
      const capacity = game.pitch_size === 'small' ? 12 : 14;
      const minimumPlayers = Math.floor(capacity * 0.7); // 70% minimum (8 for small, 10 for big)

      console.log(`Game ${game.id}: ${signupCount}/${capacity} signups (minimum: ${minimumPlayers})`);

      // Only send warning if below minimum threshold
      if (signupCount < minimumPlayers) {
        const gameDate = new Date(game.scheduled_at);
        const formattedDate = gameDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        const spotsLeft = capacity - signupCount;
        const message = `⚠️ *Game tomorrow needs players!*\n🗓️ *${formattedDate}*\n📊 Only ${signupCount}/${capacity} signed up\n🔴 ${spotsLeft} more players needed!\n\nSign up now to avoid cancellation!`;

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
          console.log(`Warning sent for game ${game.id}`);
          warnings.push(game.id);
        } else {
          console.error(`Failed to send warning for game ${game.id}:`, result);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Checked ${games.length} games, sent ${warnings.length} warnings`,
        warnings 
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