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
  type?: 'signup' | 'new_game' | 'low_signup_warning' | 'game_full' | 'waitlist_promoted';
  promotedPlayerName?: string;
  droppedPlayerName?: string;
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
  promotedPlayerName,
  droppedPlayerName,
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
        promotedPlayerName,
        droppedPlayerName,
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

// Convenience function for game full notification
export const sendGameFullNotification = async (
  gameDate: Date | string,
  pitchSize: string | null
): Promise<void> => {
  const capacity = pitchSize === 'small' ? 12 : 14;
  return sendTelegramNotification({
    gameDate,
    signupCount: capacity,
    pitchSize,
    type: 'game_full',
  });
};

// Convenience function for waitlist promotion
export const sendWaitlistPromotedNotification = async (
  gameDate: Date | string,
  signupCount: number,
  pitchSize: string | null,
  promotedPlayerName: string,
  droppedPlayerName?: string
): Promise<void> => {
  return sendTelegramNotification({
    gameDate,
    signupCount,
    pitchSize,
    type: 'waitlist_promoted',
    promotedPlayerName,
    droppedPlayerName,
  });
};