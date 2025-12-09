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
  type?: 'signup' | 'new_game' | 'low_signup_warning' | 'game_full' | 'waitlist_promoted' | 'game_result';
  promotedPlayerName?: string;
  droppedPlayerName?: string;
  signupUrl?: string;
  // For game result notification
  team1Goals?: number;
  team2Goals?: number;
  team1Players?: string[];
  team2Players?: string[];
  team1Captain?: string;
  team2Captain?: string;
  mvpPlayerName?: string;
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
  signupUrl,
  team1Goals,
  team2Goals,
  team1Players,
  team2Players,
  team1Captain,
  team2Captain,
  mvpPlayerName,
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
        signupUrl,
        team1Goals,
        team2Goals,
        team1Players,
        team2Players,
        team1Captain,
        team2Captain,
        mvpPlayerName,
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
  pitchSize: string | null,
  signupUrl?: string
): Promise<void> => {
  return sendTelegramNotification({
    gameDate,
    signupCount: 0,
    pitchSize,
    type: 'new_game',
    signupUrl,
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

// Convenience function for game result notification
export const sendGameResultNotification = async (
  team1Goals: number,
  team2Goals: number,
  team1PlayerNames: string[],
  team2PlayerNames: string[],
  team1CaptainName?: string,
  team2CaptainName?: string,
  mvpPlayerName?: string
): Promise<void> => {
  return sendTelegramNotification({
    gameDate: new Date(),
    signupCount: 0,
    pitchSize: null,
    type: 'game_result',
    team1Goals,
    team2Goals,
    team1Players: team1PlayerNames,
    team2Players: team2PlayerNames,
    team1Captain: team1CaptainName,
    team2Captain: team2CaptainName,
    mvpPlayerName,
  });
};