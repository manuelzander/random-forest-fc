import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface NotifyParams {
  playerName: string;
  gameDate: Date | string;
  signupCount: number;
  pitchSize: string | null;
  isRemoval?: boolean;
  isDropout?: boolean;
}

export const sendTelegramNotification = async ({
  playerName,
  gameDate,
  signupCount,
  pitchSize,
  isRemoval = false,
  isDropout = false,
}: NotifyParams): Promise<void> => {
  try {
    const formattedDate = format(
      typeof gameDate === 'string' ? new Date(gameDate) : gameDate,
      "MMM d, yyyy 'at' h:mm a"
    );

    const { error } = await supabase.functions.invoke('telegram-notify', {
      body: {
        playerName,
        gameDate: formattedDate,
        signupCount,
        pitchSize,
        isRemoval,
        isDropout,
      },
    });

    if (error) {
      console.error('Telegram notification failed:', error);
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
    // Don't throw - notifications shouldn't block the main flow
  }
};
