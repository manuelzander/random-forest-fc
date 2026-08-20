import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types';

interface PlayerWithProfile extends Player {
  profile?: {
    football_skills?: string[];
    skill_ratings?: any;
  };
}

/** Historical standings for an archived season. Pass null to skip fetching. */
export const useArchivedAchievements = (seasonId: string | null) => {
  const [players, setPlayers] = useState<PlayerWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(!!seasonId);

  useEffect(() => {
    if (!seasonId) {
      setPlayers([]);
      setIsLoading(false);
      return;
    }
    let active = true;
    setIsLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc('get_archived_player_achievements', {
        p_season_id: seasonId,
      });
      if (!active) return;
      if (error) {
        console.error('Error fetching archived achievements:', error);
        setPlayers([]);
      } else {
        setPlayers(
          (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            user_id: p.user_id,
            avatar_url: p.avatar_url,
            points: p.points || 0,
            games_played: p.games_played || 0,
            wins: p.wins || 0,
            draws: p.draws || 0,
            losses: p.losses || 0,
            mvp_awards: p.mvp_awards || 0,
            goal_difference: p.goal_difference || 0,
            profile: p.user_id
              ? {
                  football_skills: Array.isArray(p.football_skills) ? p.football_skills : [],
                  skill_ratings:
                    p.skill_ratings && typeof p.skill_ratings === 'object' ? p.skill_ratings : {},
                }
              : undefined,
          }))
        );
      }
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [seasonId]);

  return { players, isLoading };
};
