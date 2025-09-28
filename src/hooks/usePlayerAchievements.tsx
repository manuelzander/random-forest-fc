import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types';

interface PlayerWithProfile extends Player {
  profile?: {
    football_skills?: string[];
    skill_ratings?: any;
  };
}

interface PlayerAchievements {
  players: PlayerWithProfile[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache for player achievements
let cachedAchievementsData: PlayerWithProfile[] | null = null;
let achievementsCacheTimestamp: number | null = null;
const CACHE_DURATION = 30000; // 30 seconds

export const usePlayerAchievements = (): PlayerAchievements => {
  const [players, setPlayers] = useState<PlayerWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerAchievements = useCallback(async (useCache = true) => {
    // Check cache first
    if (useCache && cachedAchievementsData && achievementsCacheTimestamp && Date.now() - achievementsCacheTimestamp < CACHE_DURATION) {
      setPlayers(cachedAchievementsData);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the database function to get all player data including profiles
      const { data, error: achievementsError } = await supabase.rpc('get_player_achievements');
      
      if (achievementsError) throw achievementsError;

      const formattedPlayers: PlayerWithProfile[] = (data || []).map((player: any) => ({
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
        profile: player.user_id ? {
          football_skills: Array.isArray(player.football_skills) ? player.football_skills : [],
          skill_ratings: (player.skill_ratings && typeof player.skill_ratings === 'object') 
            ? player.skill_ratings 
            : {}
        } : undefined
      }));

      // Update cache
      cachedAchievementsData = formattedPlayers;
      achievementsCacheTimestamp = Date.now();
      
      setPlayers(formattedPlayers);
    } catch (err) {
      console.error('Error fetching player achievements:', err);
      setError('Failed to fetch player achievements');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchPlayerAchievements(false); // Force refresh, skip cache
  }, [fetchPlayerAchievements]);

  useEffect(() => {
    fetchPlayerAchievements();
  }, [fetchPlayerAchievements]);

  return { players, isLoading, error, refetch };
};

// Clear cache when needed (e.g., after game is saved)
export const clearPlayerAchievementsCache = () => {
  cachedAchievementsData = null;
  achievementsCacheTimestamp = null;
};