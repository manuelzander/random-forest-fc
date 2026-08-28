import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { CalendarDays, ChevronRight, Crown, History, Trophy } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from '@/lib/fetchAllPages';
import type { Player } from '@/types';

interface HomepageStatsCardsProps {
  archiveSeasonId?: string | null;
  totalGames: number;
  players: Player[];
  isSeasonDataLoading?: boolean;
  onOpenSchedule?: () => void;
  onOpenGames?: () => void;
}

interface SummaryGame {
  id: string;
  scheduled_at: string;
  pitch_size?: string | null;
}

interface LastGame {
  id: string;
  team1_goals: number;
  team2_goals: number;
  mvp_player?: string | null;
  created_at: string;
  team1_players?: string[] | null;
  team2_players?: string[] | null;
}

const getPitchCapacity = (pitchSize?: string | null) => (pitchSize === 'small' ? 12 : 14);

const HomepageStatsCards = ({
  archiveSeasonId = null,
  totalGames,
  players,
  isSeasonDataLoading = false,
  onOpenSchedule,
  onOpenGames,
}: HomepageStatsCardsProps) => {
  const [nextGame, setNextGame] = useState<SummaryGame | null>(null);
  const [nextGameSignupCount, setNextGameSignupCount] = useState(0);
  const [isNextGameLoading, setIsNextGameLoading] = useState(true);
  const [lastGame, setLastGame] = useState<LastGame | null>(null);
  const [isLastGameLoading, setIsLastGameLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const fetchNextGame = async () => {
      setIsNextGameLoading(true);

      // Archived seasons have no upcoming fixtures.
      if (archiveSeasonId) {
        if (isActive) {
          setNextGame(null);
          setNextGameSignupCount(0);
          setIsNextGameLoading(false);
        }
        return;
      }

      try {
        const gamesResponse = await supabase
          .from('games_schedule')
          .select('id, scheduled_at, pitch_size')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1);

        if (gamesResponse.error) throw gamesResponse.error;
        const game = ((gamesResponse.data || [])[0] as SummaryGame | undefined) || null;

        let signupCount = 0;
        if (game) {
          const signups = await fetchAllPages<{ id: string }>((from, to) =>
            supabase
              .from('games_schedule_signups')
              .select('id')
              .eq('game_schedule_id', game.id)
              .range(from, to),
          );
          signupCount = signups.length;
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

    const fetchLastGame = async () => {
      setIsLastGameLoading(true);

      try {
        const response = archiveSeasonId
          ? await supabase
              .from('archived_games')
              .select('id, team1_goals, team2_goals, mvp_player, created_at, team1_players, team2_players')
              .eq('season_id', archiveSeasonId)
              .order('created_at', { ascending: false })
              .limit(1)
          : await supabase
              .from('games')
              .select('id, team1_goals, team2_goals, mvp_player, created_at, team1_players, team2_players')
              .order('created_at', { ascending: false })
              .limit(1);

        if (response.error) throw response.error;
        if (!isActive) return;
        setLastGame(((response.data || [])[0] as LastGame | undefined) || null);
      } catch (error) {
        console.error('Error fetching homepage last game:', error);
        if (isActive) setLastGame(null);
      } finally {
        if (isActive) setIsLastGameLoading(false);
      }
    };

    fetchNextGame();
    fetchLastGame();

    return () => {
      isActive = false;
    };
  }, [archiveSeasonId]);

  const mvpLeader = useMemo(() => {
    return [...players]
      .filter((player) => player.mvp_awards > 0)
      .sort((a, b) => b.mvp_awards - a.mvp_awards || b.points - a.points || a.name.localeCompare(b.name))[0];
  }, [players]);

  const lastGameMvpName = useMemo(() => {
    if (!lastGame?.mvp_player) return null;
    return players.find((player) => player.id === lastGame.mvp_player)?.name || null;
  }, [lastGame, players]);

  const pitchCapacity = nextGame ? getPitchCapacity(nextGame.pitch_size) : 14;
  const signupProgress = Math.min(100, Math.round((nextGameSignupCount / pitchCapacity) * 100));
  const nextGameDate = nextGame ? new Date(nextGame.scheduled_at) : null;
  const lastGameDate = lastGame ? new Date(lastGame.created_at) : null;
  const lastGamePlayerCount = lastGame
    ? (lastGame.team1_players?.length || 0) + (lastGame.team2_players?.length || 0)
    : 0;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6" aria-label="Homepage summary">
      <div className="glass-panel relative overflow-hidden p-5 sm:p-6 md:col-span-2 lg:col-span-2">
        <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex min-h-[13rem] flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="section-kicker">Next game</span>
              {isNextGameLoading ? (
                <div className="mt-4 h-8 w-44 animate-pulse rounded-md bg-white/10" />
              ) : (
                <h2 className="mt-2 font-display text-3xl leading-none tracking-wide text-foreground sm:text-4xl">
                  {nextGameDate ? format(nextGameDate, 'EEE, MMM d') : 'No fixture'}
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
            <>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>{format(nextGameDate, 'h:mm a')}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>{nextGame.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}</span>
                <span className="text-muted-foreground/40">•</span>
                <span>{formatDistanceToNowStrict(nextGameDate, { addSuffix: true })}</span>
              </p>
              <div className="mt-auto space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Signed up</span>
                  <span className="text-primary">{nextGameSignupCount} / {pitchCapacity}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${signupProgress}%` }} />
                </div>
              </div>
            </>
          ) : (
            <p className="mt-auto text-sm text-muted-foreground">
              {archiveSeasonId ? 'No more fixtures planned' : 'No upcoming game is scheduled yet'}
            </p>
          )}

          {onOpenSchedule && (
            <div className="border-t border-white/10 pt-3">
              <button type="button" onClick={onOpenSchedule} className="card-action-link">
                View Schedule
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel relative overflow-hidden p-5 sm:p-6 md:col-span-2 lg:col-span-2">
        <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex min-h-[13rem] flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="section-kicker">Last game</span>
              {isLastGameLoading ? (
                <div className="mt-4 h-8 w-44 animate-pulse rounded-md bg-white/10" />
              ) : (
                <h2 className="mt-2 font-display text-3xl leading-none tracking-wide text-foreground sm:text-4xl">
                  {lastGameDate ? format(lastGameDate, 'EEE, MMM d') : 'No result'}
                </h2>
              )}
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-primary">
              <History className="h-5 w-5" />
            </div>
          </div>

          {isLastGameLoading ? (
            <div className="space-y-3">
              <div className="h-4 w-36 animate-pulse rounded bg-white/10" />
              <div className="h-8 w-24 animate-pulse rounded bg-white/10" />
            </div>
          ) : lastGame ? (
            <>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Final score</span>
                {lastGamePlayerCount > 0 && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span>{lastGamePlayerCount} players</span>
                  </>
                )}

                {lastGameMvpName && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="truncate">MVP {lastGameMvpName}</span>
                  </>
                )}
              </p>
              <div className="mt-auto flex items-center gap-3">
                <span
                  className={`font-display text-4xl leading-none ${
                    lastGame.team1_goals >= lastGame.team2_goals ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {lastGame.team1_goals}
                </span>
                <span className="text-sm text-muted-foreground/50">vs</span>
                <span
                  className={`font-display text-4xl leading-none ${
                    lastGame.team2_goals >= lastGame.team1_goals ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {lastGame.team2_goals}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-auto text-sm text-muted-foreground">No results yet</p>
          )}

          {onOpenGames && (
            <div className="border-t border-white/10 pt-3">
              <button type="button" onClick={onOpenGames} className="card-action-link">
                View Games
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>


      <div className="stat-tile flex min-h-[13rem] flex-col items-start justify-between p-5 text-left sm:p-6">
        <div className="flex w-full items-start justify-between gap-3">
          <span className="section-kicker">Games Played</span>
          <Trophy className="h-5 w-5 text-primary" />
        </div>
        <div>
          <span className="font-display text-5xl leading-none text-foreground">{totalGames}</span>
          <p className="mt-2 text-sm text-muted-foreground">Recorded results</p>
        </div>
      </div>

      <div className="stat-tile flex min-h-[13rem] flex-col items-start justify-between p-5 text-left sm:p-6">
        <div className="flex w-full items-start justify-between gap-3">
          <span className="section-kicker">MVP Race</span>
          <Crown className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <span className="block truncate font-display text-3xl leading-none text-foreground">
            {isSeasonDataLoading ? '—' : mvpLeader?.name || 'No MVP yet'}
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            {mvpLeader ? `${mvpLeader.mvp_awards} award${mvpLeader.mvp_awards === 1 ? '' : 's'}` : 'Awaiting first award'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HomepageStatsCards;
