import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar, Copy, User, CheckCircle, Users, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ScheduledGame, GameScheduleSignup } from '@/types';

const ScheduleDisplay = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([]);
  const [signups, setSignups] = useState<{ [gameId: string]: GameScheduleSignup[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledGames();
  }, []);

  const fetchScheduledGames = async () => {
    setLoading(true);
    try {
      // Fetch scheduled games that are in the future
      const { data: games, error: gamesError } = await supabase
        .from('games_schedule')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (gamesError) throw gamesError;
      setScheduledGames(games || []);

      // Fetch signups for all games
      const { data: signupsData, error: signupsError } = await supabase
        .from('games_schedule_signups')
        .select(`
          *,
          players:player_id (
            id,
            name,
            avatar_url,
            user_id
          )
        `)
        .order('signed_up_at', { ascending: true });

      if (signupsError) throw signupsError;

      // Group signups by game
      const groupedSignups: { [gameId: string]: GameScheduleSignup[] } = {};
      (signupsData || []).forEach((signup: any) => {
        if (!groupedSignups[signup.game_schedule_id]) {
          groupedSignups[signup.game_schedule_id] = [];
        }
        groupedSignups[signup.game_schedule_id].push({
          ...signup,
          player: signup.players
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

  if (scheduledGames.length === 0) {
    return (
      <Card>
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <Calendar className="h-6 w-6" />
            Upcoming Games Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No upcoming games scheduled yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
          <Calendar className="h-6 w-6" />
          Upcoming Games Schedule
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
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="sm:hidden">{format(new Date(game.scheduled_at), "MMM d, h:mm a")}</span>
                        <span className="hidden sm:inline">{format(new Date(game.scheduled_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </CardTitle>
                      {game.pitch_size && (
                        <Badge variant="outline" className="text-xs w-fit">
                          {game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigateToSignup(game.id)}
                      className="w-full sm:w-auto"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Sign Up
                    </Button>
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
                        {gameSignups.map((signup, index) => (
                          <div key={signup.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <Badge variant="outline" className="shrink-0 text-xs">#{index + 1}</Badge>
                              <span className="font-medium truncate text-sm sm:text-base">
                                {signup.is_guest ? signup.guest_name : (signup.player?.name || 'Unknown')}
                              </span>
                              <div className="flex gap-1 shrink-0">
                                {signup.player?.user_id && (
                                  <Badge className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0 hover:bg-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    <span className="hidden sm:inline">Verified</span>
                                  </Badge>
                                )}
                                {signup.is_guest && (
                                  <Badge className="text-xs h-5 px-1.5 bg-blue-100 text-blue-700 border-0 hover:bg-blue-200">
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
                        ))}
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