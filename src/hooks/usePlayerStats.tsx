import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types';

interface PlayerStats {
  players: Player[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache for player stats
let cachedData: Player[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 30000; // 30 seconds

export const usePlayerStats = (): PlayerStats => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerStats = useCallback(async (useCache = true) => {
    // Check cache first
    if (useCache && cachedData && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setPlayers(cachedData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the database function instead of client-side calculation
      const { data, error: statsError } = await supabase.rpc('get_player_stats');
      
      if (statsError) throw statsError;

      const formattedPlayers: Player[] = (data || []).map((player: any) => ({
        id: player.id,
        name: player.name,
        user_id: player.user_id,
        avatar_url: player.avatar_url,
        points: player.points || 0,
        games_played: player.games_played || 0,
        wins: player.wins || 0,
        draws: player.draws || 0,
        losses: player.losses || 0,
        mvp_awards: player.mvp_awards || 0,
        goal_difference: player.goal_difference || 0,
        created_by: null,
        badges: null
      }));

      // Sort by points, then PPG, then goal difference
      formattedPlayers.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        
        const aPPG = a.games_played > 0 ? a.points / a.games_played : 0;
        const bPPG = b.games_played > 0 ? b.points / b.games_played : 0;
        if (bPPG !== aPPG) {
          return bPPG - aPPG;
        }
        
        return b.goal_difference - a.goal_difference;
      });

      // Update cache
      cachedData = formattedPlayers;
      cacheTimestamp = Date.now();
      
      setPlayers(formattedPlayers);
    } catch (err) {
      console.error('Error fetching player stats:', err);
      setError('Failed to fetch player stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchPlayerStats(false); // Force refresh, skip cache
  }, [fetchPlayerStats]);

  useEffect(() => {
    fetchPlayerStats();
  }, [fetchPlayerStats]);

  return { players, isLoading, error, refetch };
};

// Clear cache when needed (e.g., after game is saved)
export const clearPlayerStatsCache = () => {
  cachedData = null;
  cacheTimestamp = null;
};