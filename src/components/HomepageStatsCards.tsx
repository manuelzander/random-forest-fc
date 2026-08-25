import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { CalendarDays, Crown, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from '@/lib/fetchAllPages';
import type { Player } from '@/types';

interface HomepageStatsCardsProps {
  archiveSeasonId?: string | null;
  totalPlayers: number;
  totalGames: number;
  players: Player[];
  isSeasonDataLoading?: boolean;
  onOpenSchedule?: () => void;
}

interface SummaryGame {
  id: string;
  scheduled_at: string;
  pitch_size?: string | null;
}

const getPitchCapacity = (pitchSize?: string | null) => (pitchSize === 'small' ? 12 : 14);

const HomepageStatsCards = ({
  archiveSeasonId = null,
  totalPlayers,
  totalGames,
  players,
  isSeasonDataLoading = false,
  onOpenSchedule,
}: HomepageStatsCardsProps) => {
  const [nextGame, setNextGame] = useState<SummaryGame | null>(null);
  const [nextGameSignupCount, setNextGameSignupCount] = useState(0);
  const [isNextGameLoading, setIsNextGameLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const fetchNextGame = async () => {
      setIsNextGameLoading(true);

      try {
        const gamesResponse = archiveSeasonId
          ? await supabase
              .from('archived_games_schedule')
              .select('id, scheduled_at, pitch_size')
              .eq('season_id', archiveSeasonId)
              .order('scheduled_at', { ascending: true })
              .limit(1)
          : await supabase
              .from('games_schedule')
              .select('id, scheduled_at, pitch_size')
              .gte('scheduled_at', new Date().toISOString())
              .order('scheduled_at', { ascending: true })
              .limit(1);

        if (gamesResponse.error) throw gamesResponse.error;
        const game = ((gamesResponse.data || [])[0] as SummaryGame | undefined) || null;

        let signupCount = 0;
        if (game) {
          if (archiveSeasonId) {
            const signups = await fetchAllPages<{ id: string }>((from, to) =>
              supabase
                .from('archived_games_schedule_signups')
                .select('id')
                .eq('season_id', archiveSeasonId)
                .eq('game_schedule_id', game.id)
                .range(from, to),
            );
            signupCount = signups.length;
          } else {
            const signups = await fetchAllPages<{ id: string }>((from, to) =>
              supabase
                .from('games_schedule_signups')
                .select('id')
                .eq('game_schedule_id', game.id)
                .range(from, to),
            );
            signupCount = signups.length;
          }
        }

        if (!isActive) return;
        setNextGame(game);
        setNextGameSignupCount(signupCount);
      } catch (error) {
        console.error('Error fetching homepage next game:', error);
        if (!isActive) return;
        setNextGame(null);
        setNextGameSignupCount(0);
      } finally {
        if (isActive) {
          setIsNextGameLoading(false);
        }
      }
    };

    fetchNextGame();

    return () => {
      isActive = false;
    };
  }, [archiveSeasonId]);

  const mvpLeader = useMemo(() => {
    return [...players]
      .filter((player) => player.mvp_awards > 0)
      .sort((a, b) => b.mvp_awards - a.mvp_awards || b.points - a.points || a.name.localeCompare(b.name))[0];
  }, [players]);

  const pitchCapacity = nextGame ? getPitchCapacity(nextGame.pitch_size) : 14;
  const signupProgress = Math.min(100, Math.round((nextGameSignupCount / pitchCapacity) * 100));
  const nextGameDate = nextGame ? new Date(nextGame.scheduled_at) : null;
  const nextGameLabel = archiveSeasonId ? 'Season opener' : 'Next game';

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5" aria-label="Homepage summary">
      <div className="glass-panel relative overflow-hidden p-4 sm:p-5 md:col-span-2 lg:col-span-2">
        <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex min-h-[10rem] flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="section-kicker">{nextGameLabel}</span>
              {isNextGameLoading ? (
                <div className="mt-4 h-8 w-44 animate-pulse rounded-md bg-white/10" />
              ) : nextGameDate ? (
                <h2 className="mt-2 font-display text-3xl leading-none tracking-wide text-foreground sm:text-4xl">
                  {format(nextGameDate, 'EEE, MMM d')}
                </h2>
              ) : (
                <h2 className="mt-2 font-display text-3xl leading-none tracking-wide text-foreground sm:text-4xl">
                  No fixture
                </h2>
              )}
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>

          {isNextGameLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
              <div className="h-2 w-full animate-pulse rounded-full bg-white/10" />
            </div>
          ) : nextGameDate ? (
            <div className="space-y-3">
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>{format(nextGameDate, 'h:mm a')}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>{nextGame.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>{archiveSeasonId ? format(nextGameDate, 'yyyy') : formatDistanceToNowStrict(nextGameDate, { addSuffix: true })}</span>
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Signed up</span>
                  <span className="text-primary">{nextGameSignupCount} / {pitchCapacity}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${signupProgress}%` }} />
                </div>
              </div>
              {onOpenSchedule && (
                <Button type="button" size="sm" variant="outline" className="header-nav-button" onClick={onOpenSchedule}>
                  View Schedule
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {archiveSeasonId ? 'No archived schedule is available for this season.' : 'No upcoming game is scheduled yet.'}
              </p>
              {onOpenSchedule && (
                <Button type="button" size="sm" variant="outline" className="header-nav-button" onClick={onOpenSchedule}>
                  View Schedule
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="stat-tile flex min-h-[8rem] flex-col items-start justify-between p-4 text-left sm:p-5">
        <div className="flex w-full items-start justify-between gap-3">
          <span className="section-kicker">Total Players</span>
          <Users className="h-5 w-5 text-primary" />
        </div>
        <span className="font-display text-5xl leading-none text-foreground">{isSeasonDataLoading ? '—' : totalPlayers}</span>
      </div>

      <div className="stat-tile flex min-h-[8rem] flex-col items-start justify-between p-4 text-left sm:p-5">
        <div className="flex w-full items-start justify-between gap-3">
          <span className="section-kicker">Games Played</span>
          <Trophy className="h-5 w-5 text-primary" />
        </div>
        <span className="font-display text-5xl leading-none text-foreground">{totalGames}</span>
      </div>

      <div className="stat-tile flex min-h-[8rem] flex-col items-start justify-between p-4 text-left sm:p-5">
        <div className="flex w-full items-start justify-between gap-3">
          <span className="section-kicker">MVP Race</span>
          <Crown className="h-5 w-5 text-primary" />
        </div>
        <span className="block truncate font-display text-3xl leading-none text-foreground">
          {isSeasonDataLoading ? '—' : mvpLeader?.name || 'No MVP yet'}
        </span>
      </div>
    </section>
  );
};

export default HomepageStatsCards;