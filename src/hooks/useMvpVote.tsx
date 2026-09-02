import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MvpVoteResult {
  player_id: string;
  name: string;
  avatar_url: string | null;
  votes: number;
}

export interface MvpVoteState {
  scheduled_at: string;
  closes_at: string;
  is_open: boolean;
  is_closed: boolean;
  eligible_voters: number;
  votes_cast: number;
  my_player_id: string | null;
  am_eligible: boolean;
  my_vote: string | null;
  winner_player_id: string | null;
  results: MvpVoteResult[];
}

export const useMvpVote = (gameScheduleId?: string) => {
  const [state, setState] = useState<MvpVoteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  const fetchState = useCallback(async () => {
    if (!gameScheduleId) {
      setState(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc('get_mvp_vote_state', {
      _game_schedule_id: gameScheduleId,
    });
    if (error) {
      console.error('Error loading MVP vote state:', error);
      setState(null);
    } else {
      setState((data as unknown as MvpVoteState) ?? null);
    }
    setLoading(false);
  }, [gameScheduleId]);

  useEffect(() => {
    setLoading(true);
    fetchState();
  }, [fetchState]);

  // Live progress while the ballot is open
  useEffect(() => {
    if (!gameScheduleId) return;
    const channel = supabase
      .channel(`mvp-votes-${gameScheduleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mvp_votes',
          filter: `game_schedule_id=eq.${gameScheduleId}`,
        },
        () => {
          fetchState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameScheduleId, fetchState]);

  const castVote = useCallback(
    async (votedPlayerId: string) => {
      if (!gameScheduleId || !state?.my_player_id) return { error: 'Not eligible to vote' };
      setIsVoting(true);
      try {
        const { error } = await supabase.from('mvp_votes').upsert(
          {
            game_schedule_id: gameScheduleId,
            voter_player_id: state.my_player_id,
            voted_player_id: votedPlayerId,
          },
          { onConflict: 'game_schedule_id,voter_player_id' }
        );
        if (error) throw error;
        await fetchState();
        return { error: null };
      } catch (error) {
        console.error('Error casting MVP vote:', error);
        return { error: 'Could not save your vote' };
      } finally {
        setIsVoting(false);
      }
    },
    [gameScheduleId, state?.my_player_id, fetchState]
  );

  const clearVote = useCallback(async () => {
    if (!gameScheduleId || !state?.my_player_id) return { error: 'Not eligible to vote' };
    setIsVoting(true);
    try {
      const { error } = await supabase
        .from('mvp_votes')
        .delete()
        .eq('game_schedule_id', gameScheduleId)
        .eq('voter_player_id', state.my_player_id);
      if (error) throw error;
      await fetchState();
      return { error: null };
    } catch (error) {
      console.error('Error clearing MVP vote:', error);
      return { error: 'Could not remove your vote' };
    } finally {
      setIsVoting(false);
    }
  }, [gameScheduleId, state?.my_player_id, fetchState]);

  return { state, loading, isVoting, castVote, clearVote, refresh: fetchState };
};
