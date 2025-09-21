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
        <div className="space-y-6">
          {scheduledGames.map((game) => {
            const gameSignups = signups[game.id] || [];
            const signupCount = gameSignups.length;
            
            return (
              <div key={game.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      <span className="sm:hidden">{format(new Date(game.scheduled_at), "MMM do, yyyy 'at' h:mm a")}</span>
                      <span className="hidden sm:inline">{format(new Date(game.scheduled_at), "PPP 'at' p")}</span>
                    </h3>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigateToSignup(game.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Sign Up</span>
                      <span className="sm:hidden">Sign Up</span>
                    </Button>
                  </div>
                </div>

                {/* Players List */}
                {signupCount > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Signed Up Players ({signupCount})
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gameSignups.map((signup) => (
                          <TableRow key={signup.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span>{signup.is_guest ? signup.guest_name : (signup.player?.name || 'Unknown Player')}</span>
                                {signup.player?.user_id && (
                                  <Badge className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                                {signup.is_guest && (
                                  <Badge className="text-xs h-5 px-1.5 bg-blue-100 text-blue-700 border-0 hover:bg-blue-200">
                                    <User className="h-3 w-3 mr-1" />
                                    Guest
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <span className="sm:hidden">{format(new Date(signup.signed_up_at), "M/d h:mm a")}</span>
                              <span className="hidden sm:inline">{format(new Date(signup.signed_up_at), "MMM d, h:mm a")}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No players signed up yet
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleDisplay;