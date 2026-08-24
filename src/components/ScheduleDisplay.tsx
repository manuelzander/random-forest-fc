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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledGames();
  }, [archiveSeasonId]);

  const fetchScheduledGames = async () => {
    setLoading(true);
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
        const [signupRows, playersRes] = await Promise.all([
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
        ]);

        if (playersRes.error) throw playersRes.error;

        const playerMap = new Map((playersRes.data || []).map((p) => [p.id, p]));
        signupsData = signupRows.map((s: any) => ({
          ...s,
          players: s.player_id ? playerMap.get(s.player_id) ?? null : null,
          guests: null,
        }));
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
            
            return (
              <Card key={game.id}>
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="sm:hidden">{format(new Date(game.scheduled_at), "MMM d, h:mm a")}</span>
                          <span className="hidden sm:inline">{format(new Date(game.scheduled_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        </CardTitle>
                        {game.pitch_size && (
                          <Badge variant="outline" className="text-xs sm:hidden">
                            {game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}
                          </Badge>
                        )}
                      </div>
                      {game.pitch_size && (
                        <Badge variant="outline" className="text-xs w-fit hidden sm:inline-flex">
                          {game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}
                        </Badge>
                      )}
                    </div>
                    {!archiveSeasonId && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigateToSignup(game.id)}
                        className="w-full sm:w-auto"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Sign Up
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm sm:text-base text-muted-foreground">
                        <Users className="h-4 w-4 inline mr-1" />
                        Players ({gameSignups.length})
                      </h4>
                    </div>
                    {gameSignups.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6 text-sm">
                        No players yet. Be the first!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {gameSignups.map((signup, index) => {
                          const pitchCapacity = game.pitch_size === 'small' ? 12 : game.pitch_size === 'big' ? 14 : 14;
                          const isWaitlisted = index >= pitchCapacity;
                          const isLastMinuteDropout = signup.last_minute_dropout === true;
                          
                          return (
                            <div key={signup.id} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                              isLastMinuteDropout ? 'bg-destructive/10 border border-destructive/30' :
                              isWaitlisted ? 'bg-[hsl(var(--aurora-blue))]/10 border border-[hsl(var(--aurora-blue))]/30' : 'bg-muted/50'
                            }`}>
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  {isWaitlisted ? `W${index - pitchCapacity + 1}` : `#${index + 1}`}
                                </Badge>
                                <span className={`font-medium truncate text-sm sm:text-base ${isLastMinuteDropout ? 'line-through text-destructive' : ''}`}>
                                  {signup.is_guest ? signup.guest_name : (signup.player?.name || 'Unknown')}
                                </span>
                                <div className="flex gap-1 shrink-0">
                                   {isLastMinuteDropout && (
                                     <Badge className="text-xs h-5 px-1.5 bg-destructive/15 text-destructive border-0">
                                       <AlertTriangle className="h-3 w-3 mr-1" />
                                       <span className="hidden sm:inline">Dropout</span>
                                     </Badge>
                                   )}
                                   {isWaitlisted && !isLastMinuteDropout && (
                                     <Badge className="text-xs h-5 px-1.5 bg-[hsl(var(--aurora-blue))]/15 text-[hsl(var(--aurora-blue))] border-0">
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
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                {format(new Date(signup.signed_up_at), "MMM d")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleDisplay;