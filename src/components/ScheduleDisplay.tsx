import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar, User, CheckCircle, Users, ExternalLink, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ScheduledGame, GameScheduleSignup } from '@/types';
import { fetchAllPages } from '@/lib/fetchAllPages';


interface ScheduleDisplayProps {
  /** When set, show the archived schedule for this season (read-only) */
  archiveSeasonId?: string | null;
}

const ScheduleDisplay = ({ archiveSeasonId = null }: ScheduleDisplayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([]);
  const [signups, setSignups] = useState<{ [gameId: string]: GameScheduleSignup[] }>({});
  const [mvpWinners, setMvpWinners] = useState<{ [gameId: string]: { name: string; votes: number } }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledGames();
  }, [archiveSeasonId]);

  const fetchScheduledGames = async () => {
    setLoading(true);
    setMvpWinners({});
    try {
      // Live: upcoming games only. Archive: the full season schedule, newest first.
      const { data: games, error: gamesError } = archiveSeasonId
        ? await supabase
            .from('archived_games_schedule')
            .select('*')
            .eq('season_id', archiveSeasonId)
            .order('scheduled_at', { ascending: false })
        : await supabase
            .from('games_schedule')
            .select('*')
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true });

      if (gamesError) throw gamesError;
      setScheduledGames((games as ScheduledGame[]) || []);

      // Fetch signups for the fetched games only, paginated past Supabase's
      // 1000-row default cap (an unscoped fetch silently dropped recent signups).
      const gameIds = ((games as ScheduledGame[]) || []).map((g) => g.id);
      let signupsData: any[] | null = [];

      const fetchAllSignups = fetchAllPages;


      if (gameIds.length === 0) {
        signupsData = [];
      } else if (archiveSeasonId) {
        const [signupRows, playersRes, resultsRes, votesRes] = await Promise.all([
          fetchAllSignups((from, to) =>
            supabase
              .from('archived_games_schedule_signups')
              .select('*')
              .eq('season_id', archiveSeasonId)
              .in('game_schedule_id', gameIds)
              .order('signed_up_at', { ascending: true })
              .range(from, to),
          ),
          supabase.from('players').select('id, name, avatar_url, user_id'),
          supabase
            .from('archived_games')
            .select('game_schedule_id, mvp_player')
            .eq('season_id', archiveSeasonId),
          supabase
            .from('archived_mvp_votes')
            .select('game_schedule_id, voted_player_id')
            .eq('season_id', archiveSeasonId),
        ]);

        if (playersRes.error) throw playersRes.error;

        const playerMap = new Map((playersRes.data || []).map((p) => [p.id, p]));
        signupsData = signupRows.map((s: any) => ({
          ...s,
          players: s.player_id ? playerMap.get(s.player_id) ?? null : null,
          guests: null,
        }));

        // Archived MVP: prefer the ballot winner, fall back to the MVP recorded on the game result
        const voteCounts: { [gameId: string]: { [playerId: string]: number } } = {};
        (votesRes.data || []).forEach((v: any) => {
          if (!v.game_schedule_id || !v.voted_player_id) return;
          const perGame = voteCounts[v.game_schedule_id] || (voteCounts[v.game_schedule_id] = {});
          perGame[v.voted_player_id] = (perGame[v.voted_player_id] || 0) + 1;
        });

        const resultMvp = new Map<string, string>();
        (resultsRes.data || []).forEach((g: any) => {
          if (g.game_schedule_id && g.mvp_player) resultMvp.set(g.game_schedule_id, g.mvp_player);
        });

        const winners: { [gameId: string]: { name: string; votes: number } } = {};
        ((games as ScheduledGame[]) || []).forEach((g) => {
          const winnerId = g.mvp_vote_winner || resultMvp.get(g.id) || null;
          if (!winnerId) return;
          const name = playerMap.get(winnerId)?.name;
          if (!name) return;
          winners[g.id] = { name, votes: voteCounts[g.id]?.[winnerId] || 0 };
        });
        setMvpWinners(winners);

      } else {
        signupsData = await fetchAllSignups((from, to) =>
          supabase
            .from('games_schedule_signups')
            .select(`
              *,
              players:player_id (
                id,
                name,
                avatar_url,
                user_id
              ),
              guests:guest_id (
                id,
                name,
                credit
              )
            `)
            .in('game_schedule_id', gameIds)
            .order('signed_up_at', { ascending: true })
            .range(from, to),
        );

      }

      // Group signups by game
      const groupedSignups: { [gameId: string]: GameScheduleSignup[] } = {};
      (signupsData || []).forEach((signup: any) => {
        if (!groupedSignups[signup.game_schedule_id]) {
          groupedSignups[signup.game_schedule_id] = [];
        }
        groupedSignups[signup.game_schedule_id].push({
          ...signup,
          player: signup.players,
          guest: signup.guests
        });
      });
      setSignups(groupedSignups);

    } catch (error) {
      console.error('Error fetching scheduled games:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduled games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySignupUrl = (gameId: string) => {
    const url = `${window.location.origin}/signup/${gameId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Success",
      description: "Signup URL copied to clipboard",
    });
  };

  const navigateToSignup = (gameId: string) => {
    window.open(`/signup/${gameId}`, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const heading = archiveSeasonId ? 'Season Schedule' : 'Upcoming Games Schedule';

  if (scheduledGames.length === 0) {
    return (
      <Card>
        <CardHeader className="card-header-glass py-4">
          <CardTitle className="card-header-glass-title">
            <Calendar className="card-header-glass-icon h-6 w-6" />
            {heading}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {archiveSeasonId ? 'No games recorded for this season.' : 'No upcoming games scheduled yet.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="card-header-glass py-4">
        <CardTitle className="card-header-glass-title">
          <Calendar className="card-header-glass-icon h-6 w-6" />
          {heading}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {scheduledGames.map((game) => {
            const gameSignups = signups[game.id] || [];
            const gameDate = new Date(game.scheduled_at);
            const pitchCapacity = game.pitch_size === 'small' ? 12 : 14;
            const mvp = mvpWinners[game.id];

            return (
              <div key={game.id} className="glass-panel overflow-hidden">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight leading-none mb-2 uppercase">
                        {format(gameDate, "EEEE, MMM d")}
                      </h3>
                      <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span>{format(gameDate, "h:mm a")}</span>
                        {game.pitch_size && (
                          <>
                            <span className="text-muted-foreground/40">•</span>
                            <span>{game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}</span>
                          </>
                        )}
                      </p>
                      {mvp && (
                        <div className="flex items-center gap-2 mt-3">
                          <Badge className="badge-trophy h-auto w-fit">
                            <span>👑</span>
                            {mvp.name}
                          </Badge>
                          {mvp.votes > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {`${mvp.votes} ${mvp.votes === 1 ? 'vote' : 'votes'}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {!archiveSeasonId && (
                      <Button
                        size="sm"
                        onClick={() => navigateToSignup(game.id)}
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Sign Up
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-white/[0.02] border-t border-white/10 p-5 sm:p-6">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="font-display text-lg sm:text-xl text-foreground tracking-wide">
                      PLAYERS SIGNED UP
                    </h4>
                    <span className="relative flex items-center justify-center">
                      <span className="relative bg-primary/10 text-primary text-[10px] px-2 py-1 rounded border border-primary/20 font-bold">
                        {gameSignups.length} / {pitchCapacity}
                      </span>
                    </span>
                  </div>

                  {gameSignups.length === 0 ? (
                    <div className="empty-tile">
                      <Users className="h-6 w-6 text-muted-foreground" />
                      <p>No players yet. Be the first!</p>
                    </div>
                  ) : (
                      <div className="space-y-2">
                        {gameSignups.map((signup, index) => {
                          const isWaitlisted = index >= pitchCapacity;
                          const isLastMinuteDropout = signup.last_minute_dropout === true;

                          return (
                            <div key={signup.id} className={`group/row flex items-center justify-between p-2 -mx-2 rounded-xl transition-all duration-300 hover:bg-white/5 ${
                              isLastMinuteDropout ? 'bg-destructive/5 border border-destructive/20' : ''
                            }`}>
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <Badge variant="outline" className="slot-number">
                                  {isWaitlisted ? `W${index - pitchCapacity + 1}` : `#${index + 1}`}
                                </Badge>

                                <span className={`font-medium truncate text-sm sm:text-base ${isLastMinuteDropout ? 'line-through text-destructive' : 'text-foreground'}`}>
                                  {signup.is_guest ? signup.guest_name : (signup.player?.name || 'Unknown')}
                                </span>
                                <div className="flex gap-1 shrink-0">
                                   {isLastMinuteDropout && (
                                     <Badge className="status-badge status-badge-dropout">
                                       <AlertTriangle className="h-3 w-3 mr-1" />
                                       <span className="hidden sm:inline">Dropout</span>
                                     </Badge>
                                   )}
                                   {isWaitlisted && !isLastMinuteDropout && (
                                     <Badge className="status-badge status-badge-waitlist">
                                       <Clock className="h-3 w-3 mr-1" />
                                       <span className="hidden sm:inline">Waitlist</span>
                                     </Badge>
                                   )}
                                  {signup.player?.user_id && !isLastMinuteDropout && (
                                    <Badge className="status-badge status-badge-verified">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      <span className="hidden sm:inline">Verified</span>
                                    </Badge>
                                  )}
                                  {signup.is_guest && !isLastMinuteDropout && (
                                    <Badge className="status-badge status-badge-guest">
                                      <User className="h-3 w-3 mr-1" />
                                      <span className="hidden sm:inline">Guest</span>
                                    </Badge>
                                  )}
                                  {!signup.is_guest && !signup.player?.user_id && !isLastMinuteDropout && (
                                    <Badge className="status-badge status-badge-unverified">
                                      <User className="h-3 w-3 mr-1" />
                                      <span className="hidden sm:inline">Unverified</span>
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2 hidden sm:inline">
                                {format(new Date(signup.signed_up_at), "MMM d")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleDisplay;