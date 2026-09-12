import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import MvpVoteCard, { type MvpCandidate } from '@/components/MvpVoteCard';
import { fetchAllPages } from '@/lib/fetchAllPages';
import type { Player, ScheduledGame } from '@/types';

interface MvpTabProps {
  /** When set, show archived (read-only) MVP data for this season */
  archiveSeasonId?: string | null;
  /** Season-aware player list, already loaded by the home page */
  players: Player[];
}

interface FixtureBlock {
  game: ScheduledGame;
  candidates: MvpCandidate[];
  /** Archive only: recorded winners with their vote counts */
  archivedWinners: { name: string; avatarUrl: string | null; votes: number }[];
}

const capacityFor = (pitchSize?: string | null) => (pitchSize === 'small' ? 12 : 14);

const MvpTab = ({ archiveSeasonId = null, players }: MvpTabProps) => {
  const [fixtures, setFixtures] = useState<FixtureBlock[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const nowIso = new Date().toISOString();

        const { data: games, error: gamesError } = archiveSeasonId
          ? await supabase
              .from('archived_games_schedule')
              .select('*')
              .eq('season_id', archiveSeasonId)
              .order('scheduled_at', { ascending: false })
              .limit(5)
          : await supabase
              .from('games_schedule')
              .select('*')
              .lte('scheduled_at', nowIso)
              .order('scheduled_at', { ascending: false })
              .limit(5);

        if (gamesError) throw gamesError;

        const list = (games as ScheduledGame[]) || [];
        const gameIds = list.map(g => g.id);

        const playerMap = new Map(players.map(p => [p.id, p]));

        // Votes: total for the summary line, and per-player tallies for archive winners
        const votesRes = archiveSeasonId
          ? await supabase
              .from('archived_mvp_votes')
              .select('game_schedule_id, voted_player_id')
              .eq('season_id', archiveSeasonId)
          : await supabase.from('mvp_votes').select('game_schedule_id, voted_player_id');
        if (votesRes.error) throw votesRes.error;

        const voteCounts = new Map<string, Map<string, number>>();
        (votesRes.data || []).forEach((v: any) => {
          if (!v.game_schedule_id || !v.voted_player_id) return;
          const per = voteCounts.get(v.game_schedule_id) || new Map<string, number>();
          per.set(v.voted_player_id, (per.get(v.voted_player_id) || 0) + 1);
          voteCounts.set(v.game_schedule_id, per);
        });

        // Signups feed the candidate lists (live only — archived votes are read-only)
        let signupRows: any[] = [];
        if (gameIds.length > 0 && !archiveSeasonId) {
          signupRows = await fetchAllPages((from, to) =>
            supabase
              .from('games_schedule_signups')
              .select('game_schedule_id, last_minute_dropout, players:player_id (id, name, avatar_url)')
              .in('game_schedule_id', gameIds)
              .order('signed_up_at', { ascending: true })
              .range(from, to),
          );
        }

        // Archive fallback: MVPs recorded on the game result when no ballot exists
        let resultMvp = new Map<string, string[]>();
        if (archiveSeasonId && gameIds.length > 0) {
          const { data: results, error } = await supabase
            .from('archived_games')
            .select('game_schedule_id, mvp_player, mvp_players')
            .eq('season_id', archiveSeasonId);
          if (error) throw error;
          (results || []).forEach((g: any) => {
            if (!g.game_schedule_id) return;
            const ids = g.mvp_players?.length ? g.mvp_players : g.mvp_player ? [g.mvp_player] : [];
            if (ids.length) resultMvp.set(g.game_schedule_id, ids);
          });
        }

        const blocks: FixtureBlock[] = list.map(game => {
          const candidates: MvpCandidate[] = signupRows
            .filter(s => s.game_schedule_id === game.id)
            .slice(0, capacityFor(game.pitch_size))
            .filter(s => !s.last_minute_dropout && s.players?.id)
            .map(s => ({
              playerId: s.players.id as string,
              name: s.players.name as string,
              avatarUrl: (s.players.avatar_url ?? null) as string | null,
            }));

          const winnerIds = game.mvp_vote_winners?.length
            ? game.mvp_vote_winners
            : game.mvp_vote_winner
              ? [game.mvp_vote_winner]
              : resultMvp.get(game.id) || [];

          const archivedWinners = archiveSeasonId
            ? winnerIds
                .map(id => {
                  const p = playerMap.get(id);
                  if (!p) return null;
                  return {
                    name: p.name,
                    avatarUrl: p.avatar_url ?? null,
                    votes: voteCounts.get(game.id)?.get(id) || 0,
                  };
                })
                .filter((w): w is { name: string; avatarUrl: string | null; votes: number } => !!w)
            : [];

          return { game, candidates, archivedWinners };
        });

        if (!cancelled) {
          setFixtures(blocks);
          setTotalVotes((votesRes.data || []).length);
        }
      } catch (error) {
        console.error('Error loading MVP tab:', error);
        if (!cancelled) {
          setFixtures([]);
          setTotalVotes(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // players only feed name lookups, so the id list is enough to refresh on
  }, [archiveSeasonId, players.length]);

  const leaders = players
    .filter(p => (p.mvp_awards || 0) > 0)
    .sort((a, b) => b.mvp_awards - a.mvp_awards)
    .slice(0, 10);
  const topAwards = leaders[0]?.mvp_awards ?? 0;
  const gamesWithMvp = players.reduce((sum, p) => sum + (p.mvp_awards || 0), 0);

  return (
    <div className="space-y-6">
      {/* MVP votes per fixture */}
      <Card>
        <CardHeader className="card-header-glass py-4">
          <CardTitle className="card-header-glass-title">
            <Crown className="card-header-glass-icon h-6 w-6" />
            MVP Votes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : fixtures.length === 0 ? (
            <div className="empty-tile">
              <Crown className="h-6 w-6 text-muted-foreground" />
              <p>No MVP votes yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fixtures.map(({ game, candidates, archivedWinners }) => (
                <div key={game.id} className="glass-row-static p-4 sm:p-5">
                  {archiveSeasonId ? (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-display text-2xl text-foreground tracking-wide uppercase">
                          {format(new Date(game.scheduled_at), 'EEE d MMM')}
                        </h3>
                        <span className="bg-white/[0.06] text-muted-foreground text-[10px] px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-wide">
                          Closed
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap mb-4">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        <span>{format(new Date(game.scheduled_at), 'h:mm a')}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span>{game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}</span>
                      </p>
                      {archivedWinners.length === 0 ? (
                        <div className="empty-tile">
                          <Trophy className="h-6 w-6 text-muted-foreground" />
                          <p>No MVP recorded for this game.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {archivedWinners.map(winner => (
                            <div
                              key={winner.name}
                              className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/10"
                            >
                              <Avatar className="h-11 w-11 avatar-glow">
                                <AvatarImage src={winner.avatarUrl || undefined} />
                                <AvatarFallback>{winner.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                                  {archivedWinners.length > 1 ? 'Joint player of the match' : 'Player of the match'}
                                </p>
                                <p className="font-display text-2xl text-foreground leading-none truncate">
                                  {winner.name}
                                </p>
                              </div>
                              {winner.votes > 0 && (
                                <Badge className="badge-trophy ml-auto shrink-0">
                                  <span>👑</span>
                                  {winner.votes} {winner.votes === 1 ? 'vote' : 'votes'}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <MvpVoteCard
                      gameScheduleId={game.id}
                      candidates={candidates}
                      heading={format(new Date(game.scheduled_at), 'EEE d MMM').toUpperCase()}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MVP leaders */}
      <Card>
        <CardHeader className="card-header-glass py-4">
          <CardTitle className="card-header-glass-title">
            <Trophy className="card-header-glass-icon h-6 w-6" />
            MVP Leaders
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap mb-4">
            <span>{gamesWithMvp} {gamesWithMvp === 1 ? 'award' : 'awards'} given</span>
            <span className="text-muted-foreground/40">•</span>
            <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} cast</span>
            {leaders[0] && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span>Leader {leaders[0].name}</span>
              </>
            )}
          </p>

          {leaders.length === 0 ? (
            <div className="empty-tile">
              <Trophy className="h-6 w-6 text-muted-foreground" />
              <p>No MVP awards yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaders.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-xl transition-all duration-300 hover:bg-white/5"
                >
                  <Avatar className="h-8 w-8 border border-white/10">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate text-sm sm:text-base text-foreground flex-1">
                    {player.name}
                  </span>
                  <div className="hidden sm:block w-28 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/50"
                      style={{ width: `${topAwards ? (player.mvp_awards / topAwards) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="font-display text-base text-muted-foreground w-6 text-right">
                    {player.mvp_awards}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MvpTab;
