import { Bot } from "https://deno.land/x/grammy@v1.21.1/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  playerName: string;
  gameDate: string;
  signupCount: number;
  pitchSize: string | null;
  isRemoval?: boolean;
  isDropout?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      console.error("Missing Telegram configuration");
      return new Response(
        JSON.stringify({ error: "Telegram not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: NotificationPayload = await req.json();
    const { playerName, gameDate, signupCount, pitchSize, isRemoval, isDropout } = payload;

    console.log("Received notification request:", payload);

    const bot = new Bot(botToken);
    
    // Calculate capacity based on pitch size
    const capacity = pitchSize === 'small' ? 12 : 14;
    
    // Determine emoji and action text
    let emoji: string;
    let action: string;
    
    if (isDropout) {
      emoji = '⚠️';
      action = 'dropped out from';
    } else if (isRemoval) {
      emoji = '❌';
      action = 'left';
    } else {
      emoji = '✅';
      action = 'signed up for';
    }
    
    // Format the message
    const spotsInfo = signupCount <= capacity 
      ? `${signupCount}/${capacity} spots filled`
      : `${capacity}/${capacity} + ${signupCount - capacity} waitlist`;
    
    const message = `${emoji} *${playerName}* ${action} the game on *${gameDate}*\n📊 ${spotsInfo}`;

    await bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });

    console.log("Telegram notification sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
