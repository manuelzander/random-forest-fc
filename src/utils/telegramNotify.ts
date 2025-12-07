import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface NotifyParams {
  playerName?: string;
  gameDate: Date | string;
  signupCount: number;
  pitchSize: string | null;
  isRemoval?: boolean;
  isDropout?: boolean;
  isRejoin?: boolean;
  isAdmin?: boolean;
  addedBy?: string;
  removedBy?: string;
  type?: 'signup' | 'new_game' | 'low_signup_warning';
}

export const sendTelegramNotification = async ({
  playerName,
  gameDate,
  signupCount,
  pitchSize,
  isRemoval = false,
  isDropout = false,
  isRejoin = false,
  isAdmin = false,
  addedBy,
  removedBy,
  type = 'signup',
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
        isRejoin,
        isAdmin,
        addedBy,
        removedBy,
        type,
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

// Convenience function for new game notifications
export const sendNewGameNotification = async (
  gameDate: Date | string,
  pitchSize: string | null
): Promise<void> => {
  return sendTelegramNotification({
    gameDate,
    signupCount: 0,
    pitchSize,
    type: 'new_game',
  });
};

// Convenience function for low signup warning
export const sendLowSignupWarning = async (
  gameDate: Date | string,
  signupCount: number,
  pitchSize: string | null
): Promise<void> => {
  return sendTelegramNotification({
    gameDate,
    signupCount,
    pitchSize,
    type: 'low_signup_warning',
  });
};