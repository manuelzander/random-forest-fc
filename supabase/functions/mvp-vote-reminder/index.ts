import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VOTE_WINDOW_HOURS = 72;
const APP_URL = 'https://random-forest-fc.lovable.app';
const TZ = 'Europe/London';

/** YYYY-MM-DD in London time */
const londonDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const londonHour = (d: Date) =>
  parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d), 10);

Deno.serve(async (req) => {
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

    const now = new Date();
    const hour = londonHour(now);

    // Candidate fixtures: kicked off within the open voting window
    const windowStart = new Date(now.getTime() - VOTE_WINDOW_HOURS * 3600 * 1000);
    const { data: fixtures, error: fixturesError } = await supabase
      .from('games_schedule')
      .select('id, scheduled_at, pitch_size, mvp_votes_finalized_at')
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', now.toISOString());

    if (fixturesError) throw fixturesError;

    // "Morning after": kickoff was yesterday (London), fired once in the 09:00 hour
    const yesterday = londonDate(new Date(now.getTime() - 24 * 3600 * 1000));
    // "Last call": kickoff 47h45m - 48h15m ago (24h before the ballot closes)
    const lastCallFrom = new Date(now.getTime() - (48 * 60 + 15) * 60 * 1000);
    const lastCallTo = new Date(now.getTime() - (47 * 60 + 45) * 60 * 1000);

    const toProcess: Array<{ fixture: any; kind: 'open' | 'last_call' }> = [];

    for (const fixture of fixtures || []) {
      if (fixture.mvp_votes_finalized_at) continue;
      const kickoff = new Date(fixture.scheduled_at);

      if (kickoff >= lastCallFrom && kickoff <= lastCallTo) {
        toProcess.push({ fixture, kind: 'last_call' });
      } else if (hour === 9 && londonDate(kickoff) === yesterday) {
        toProcess.push({ fixture, kind: 'open' });
      }
    }

    console.log(`MVP reminder check: ${fixtures?.length || 0} open ballots, ${toProcess.length} to notify`);

    if (toProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: "No MVP ballots due a reminder" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sent: string[] = [];

    for (const { fixture, kind } of toProcess) {
      const capacity = fixture.pitch_size === 'small' ? 12 : 14;

      // Eligible voters: non-dropout, registered players inside the playing roster
      const { data: signups, error: signupsError } = await supabase
        .from('games_schedule_signups')
        .select('player_id, is_guest, signed_up_at, last_minute_dropout')
        .eq('game_schedule_id', fixture.id)
        .or('last_minute_dropout.is.null,last_minute_dropout.eq.false')
        .order('signed_up_at', { ascending: true });

      if (signupsError) {
        console.error(`Error fetching signups for ${fixture.id}:`, signupsError);
        continue;
      }

      const roster = (signups || []).slice(0, capacity);
      const eligible = roster.filter((s: any) => !s.is_guest && s.player_id);
      if (eligible.length === 0) {
        console.log(`Skipping ${fixture.id}: no eligible voters`);
        continue;
      }

      const { count: votesCast, error: votesError } = await supabase
        .from('mvp_votes')
        .select('id', { count: 'exact', head: true })
        .eq('game_schedule_id', fixture.id);

      if (votesError) {
        console.error(`Error counting votes for ${fixture.id}:`, votesError);
        continue;
      }

      const voted = votesCast || 0;
      if (voted >= eligible.length) {
        console.log(`Skipping ${fixture.id}: everyone voted (${voted}/${eligible.length})`);
        continue;
      }

      const kickoff = new Date(fixture.scheduled_at);
      const formattedDate = kickoff.toLocaleDateString('en-GB', {
        timeZone: TZ,
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      let message = kind === 'last_call'
        ? `⏳ *MVP VOTING CLOSES IN 24 HOURS*\n`
        : `⭐ *MVP VOTING IS OPEN*\n`;
      message += `🗓️ ${formattedDate}\n`;
      message += `🗳️ *${voted} of ${eligible.length}* voted\n`;
      message += kind === 'last_call'
        ? `🔴 Last call — pick your player of the match!\n\n`
        : `Votes stay secret until the ballot closes.\n\n`;
      message += `👉 ${APP_URL}/signup/${fixture.id}`;

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log(`MVP ${kind} reminder sent for ${fixture.id}`);
        sent.push(fixture.id);
      } else {
        console.error(`Failed to send MVP reminder for ${fixture.id}:`, result);
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sent.length} MVP reminders`, sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in mvp-vote-reminder:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
