import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MvpVoteState } from '@/hooks/useMvpVote';

const VOTE_WINDOW_HOURS = 72;

export interface OpenMvpReminder {
  gameScheduleId: string;
  scheduledAt: string;
  closesAt: string;
}

/**
 * Finds fixtures where the signed-in player is on the roster of an open MVP
 * ballot and has not voted yet. Reads existing state only — no vote changes.
 */
export const useOpenMvpReminders = (excludeGameScheduleId?: string) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<OpenMvpReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }
    const now = new Date();
    const windowStart = new Date(now.getTime() - VOTE_WINDOW_HOURS * 3600 * 1000);

    const { data: fixtures, error } = await supabase
      .from('games_schedule')
      .select('id, scheduled_at')
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: false });

    if (error || !fixtures?.length) {
      setReminders([]);
      setLoading(false);
      return;
    }

    const candidates = fixtures.filter(f => f.id !== excludeGameScheduleId);
    const states = await Promise.all(
      candidates.map(async f => {
        const { data } = await supabase.rpc('get_mvp_vote_state', { _game_schedule_id: f.id });
        return { fixture: f, state: (data as unknown as MvpVoteState) ?? null };
      })
    );

    const open = states
      .filter(({ state }) => state?.is_open && state.am_eligible && !state.my_vote)
      .map(({ fixture, state }) => ({
        gameScheduleId: fixture.id,
        scheduledAt: fixture.scheduled_at,
        closesAt: state!.closes_at,
      }))
      .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());

    setReminders(open);
    setLoading(false);
  }, [user, excludeGameScheduleId]);

  useEffect(() => {
    setLoading(true);
    fetch();
  }, [fetch]);

  return { reminders, loading, refresh: fetch };
};
