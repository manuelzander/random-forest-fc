import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UnmatchedFixture {
  id: string;
  scheduled_at: string;
  pitch_size: string | null;
  mvp_vote_winners: string[];
  mvp_vote_winner: string | null;
  mvp_votes_finalized_at: string | null;
}

export interface VoteTally {
  playerId: string;
  votes: number;
}

/**
 * Lists past scheduled fixtures that no saved result points at yet, and exposes
 * the MVP vote tallies for the selected fixture so the result form can suggest
 * the players' choice.
 */
export const useMvpSuggestion = (selectedFixtureId: string, enabled = true) => {
  const [fixtures, setFixtures] = useState<UnmatchedFixture[]>([]);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [tallies, setTallies] = useState<VoteTally[]>([]);
  const [isLoadingVotes, setIsLoadingVotes] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      setIsLoadingFixtures(true);
      try {
        const [scheduleRes, gamesRes] = await Promise.all([
          supabase
            .from('games_schedule')
            .select('id, scheduled_at, pitch_size, mvp_vote_winners, mvp_vote_winner, mvp_votes_finalized_at')
            .lte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: false })
            .limit(50),
          supabase.from('games').select('game_schedule_id').not('game_schedule_id', 'is', null),
        ]);

        if (scheduleRes.error) throw scheduleRes.error;
        if (gamesRes.error) throw gamesRes.error;

        const linked = new Set((gamesRes.data || []).map((g: any) => g.game_schedule_id as string));
        const open = (scheduleRes.data || [])
          .filter((f: any) => !linked.has(f.id))
          .map((f: any) => ({
            id: f.id as string,
            scheduled_at: f.scheduled_at as string,
            pitch_size: (f.pitch_size ?? null) as string | null,
            mvp_vote_winners: (f.mvp_vote_winners ?? []) as string[],
            mvp_vote_winner: (f.mvp_vote_winner ?? null) as string | null,
            mvp_votes_finalized_at: (f.mvp_votes_finalized_at ?? null) as string | null,
          }))
          // oldest unmatched fixture first
          .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

        if (!cancelled) setFixtures(open);
      } catch (error) {
        console.error('Error loading unmatched fixtures:', error);
        if (!cancelled) setFixtures([]);
      } finally {
        if (!cancelled) setIsLoadingFixtures(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !selectedFixtureId) {
      setTallies([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setIsLoadingVotes(true);
      try {
        const { data, error } = await supabase
          .from('mvp_votes')
          .select('voted_player_id')
          .eq('game_schedule_id', selectedFixtureId);

        if (error) throw error;

        const counts = new Map<string, number>();
        (data || []).forEach((row: any) => {
          const id = row.voted_player_id as string;
          counts.set(id, (counts.get(id) || 0) + 1);
        });

        const sorted = Array.from(counts.entries())
          .map(([playerId, votes]) => ({ playerId, votes }))
          .sort((a, b) => b.votes - a.votes);

        if (!cancelled) setTallies(sorted);
      } catch (error) {
        console.error('Error loading MVP votes:', error);
        if (!cancelled) setTallies([]);
      } finally {
        if (!cancelled) setIsLoadingVotes(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, selectedFixtureId]);

  const selectedFixture = fixtures.find(f => f.id === selectedFixtureId) || null;
  const topVotes = tallies.length > 0 ? tallies[0].votes : 0;
  const leaders = tallies.filter(t => t.votes === topVotes && topVotes > 0).map(t => t.playerId);
  const isClosed = !!selectedFixture?.mvp_votes_finalized_at;

  // A tie of three or more awards nobody
  const suggestedWinners = leaders.length > 0 && leaders.length <= 2 ? leaders : [];

  return {
    fixtures,
    isLoadingFixtures,
    tallies,
    isLoadingVotes,
    selectedFixture,
    leaders,
    suggestedWinners,
    isClosed,
    totalVotes: tallies.reduce((sum, t) => sum + t.votes, 0),
  };
};
