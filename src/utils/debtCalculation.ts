export const TOTAL_GAME_COST = 93.6;

export interface GameScheduleForDebt {
  id: string;
  pitch_size: string | null;
}

export interface SignupForDebt {
  id: string;
  game_schedule_id: string;
  player_id: string | null;
  guest_id: string | null;
  guest_name?: string | null;
  signed_up_at: string;
}

/**
 * Calculate debt for a player across all scheduled games.
 * Only the top 12 (small pitch) or 14 (big pitch) players by signup position owe payment.
 */
export function calculatePlayerDebt(
  playerId: string,
  scheduledGames: GameScheduleForDebt[],
  allSignups: SignupForDebt[]
): number {
  let debt = 0;

  scheduledGames.forEach((game) => {
    const pitchCapacity = game.pitch_size === 'small' ? 12 : 14;
    const costPerPlayer = TOTAL_GAME_COST / pitchCapacity;

    // Get all signups for this game, sorted by signup time
    const gameSignups = allSignups
      .filter((s) => s.game_schedule_id === game.id)
      .sort((a, b) => new Date(a.signed_up_at).getTime() - new Date(b.signed_up_at).getTime());

    // Find the player's signup position
    const playerSignupIndex = gameSignups.findIndex((s) => s.player_id === playerId);
    
    if (playerSignupIndex !== -1) {
      const position = playerSignupIndex + 1;
      // Only top positions owe debt
      if (position <= pitchCapacity) {
        debt += costPerPlayer;
      }
    }
  });

  return debt;
}

/**
 * Helper to normalize guest names for matching
 */
function normalizeGuestName(name?: string | null): string {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Calculate debt for a guest across all scheduled games.
 * Matches by guest_id first, then by guest_name if guest_id is null.
 * Only the top 12 (small pitch) or 14 (big pitch) signups by position owe payment.
 */
export function calculateGuestDebt(
  guestId: string,
  scheduledGames: GameScheduleForDebt[],
  allSignups: SignupForDebt[],
  guestName?: string
): number {
  let debt = 0;
  const normalizedName = guestName ? normalizeGuestName(guestName) : '';

  scheduledGames.forEach((game) => {
    const pitchCapacity = game.pitch_size === 'small' ? 12 : 14;
    const costPerPlayer = TOTAL_GAME_COST / pitchCapacity;

    // Get all signups for this game, sorted by signup time
    const gameSignups = allSignups
      .filter((s) => s.game_schedule_id === game.id)
      .sort((a, b) => new Date(a.signed_up_at).getTime() - new Date(b.signed_up_at).getTime());

    // Find the guest's signup position - match by guest_id OR by guest_name
    const guestSignupIndex = gameSignups.findIndex((s) => {
      // Match by guest_id if available
      if (s.guest_id === guestId) return true;
      // Match by normalized guest_name if guest_id is null and we have a name to match
      if (!s.guest_id && normalizedName && normalizeGuestName(s.guest_name) === normalizedName) {
        return true;
      }
      return false;
    });
    
    if (guestSignupIndex !== -1) {
      const position = guestSignupIndex + 1;
      // Only top positions owe debt
      if (position <= pitchCapacity) {
        debt += costPerPlayer;
      }
    }
  });

  return debt;
}
