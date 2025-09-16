import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar, Users, UserPlus, ArrowLeft, Clock } from 'lucide-react';
import type { ScheduledGame, GameScheduleSignup, Player } from '@/types';

const GameSignup = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [game, setGame] = useState<ScheduledGame | null>(null);
  const [signups, setSignups] = useState<GameScheduleSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSignedUp, setIsSignedUp] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchGameData();
    }
  }, [gameId, user]);

  const fetchGameData = async () => {
    if (!gameId) return;

    setLoading(true);
    try {
      // Fetch game details
      const { data: gameData, error: gameError } = await supabase
        .from('games_schedule')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);

      // Fetch signups
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
        .eq('game_schedule_id', gameId)
        .order('signed_up_at', { ascending: true });

      if (signupsError) throw signupsError;

      const formattedSignups = (signupsData || []).map((signup: any) => ({
        ...signup,
        player: signup.players
      }));

      setSignups(formattedSignups);

      // Check if current user is already signed up
      if (user) {
        const userSignup = formattedSignups.find(
          signup => signup.player?.user_id === user.id
        );
        setIsSignedUp(!!userSignup);
      }

    } catch (error) {
      console.error('Error fetching game data:', error);
      toast({
        title: "Error",
        description: "Failed to load game information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const signUpAsUser = async () => {
    if (!user || !gameId) return;

    setIsSigningUp(true);
    try {
      // First, check if user has a claimed player profile
      let { data: existingPlayer, error: playerError } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let playerId = existingPlayer?.id;

      // If no claimed player exists, create one
      if (!playerId) {
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            name: user.email?.split('@')[0] || 'Anonymous Player',
            user_id: user.id,
            created_by: user.id
          })
          .select('id')
          .single();

        if (createError) throw createError;
        playerId = newPlayer.id;
      }

      // Sign up for the game
      const { error } = await supabase
        .from('games_schedule_signups')
        .insert({
          game_schedule_id: gameId,
          player_id: playerId,
          is_guest: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully signed up for the game!",
      });

      fetchGameData();
    } catch (error) {
      console.error('Error signing up:', error);
      toast({
        title: "Error",
        description: "Failed to sign up for the game",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const signUpAsGuest = async () => {
    if (!playerName.trim() || !gameId) return;

    setIsSigningUp(true);
    try {
      // Sign up as guest directly without creating a player record
      const { error } = await supabase
        .from('games_schedule_signups')
        .insert({
          game_schedule_id: gameId,
          guest_name: playerName.trim(),
          is_guest: true,
          player_id: null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${playerName} has been signed up for the game!`,
      });

      setPlayerName('');
      fetchGameData();
    } catch (error) {
      console.error('Error signing up guest:', error);
      toast({
        title: "Error",
        description: "Failed to sign up for the game",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const removeSignup = async () => {
    if (!user || !gameId) return;

    try {
      const userSignup = signups.find(
        signup => signup.player?.user_id === user.id
      );

      if (!userSignup) return;

      const { error } = await supabase
        .from('games_schedule_signups')
        .delete()
        .eq('id', userSignup.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully removed from the game",
      });

      fetchGameData();
    } catch (error) {
      console.error('Error removing signup:', error);
      toast({
        title: "Error",
        description: "Failed to remove signup",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page-container">
        <div className="page-main-content">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold">Game Not Found</h2>
                <p className="text-muted-foreground">
                  The scheduled game you're looking for doesn't exist or has been removed.
                </p>
                <Link to="/">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const gameDate = new Date(game.scheduled_at);
  const isPastGame = gameDate < new Date();

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-inner">
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Game Signup</h1>
                <p className="text-sm text-muted-foreground">
                  {format(gameDate, "EEEE, MMMM do, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            {isPastGame && (
              <Badge variant="secondary" className="ml-auto">
                <Clock className="h-3 w-3 mr-1" />
                Past Event
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="page-main-content">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Game Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Game Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-medium">Date:</span> {format(gameDate, "EEEE, MMMM do, yyyy")}</p>
                <p><span className="font-medium">Time:</span> {format(gameDate, "h:mm a")}</p>
                <p><span className="font-medium">Players signed up:</span> {signups.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Signup Actions */}
          {!isPastGame && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Join the Game
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user ? (
                  <div className="space-y-3">
                    {isSignedUp ? (
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-green-800 font-medium">You're signed up for this game!</span>
                        <Button variant="outline" onClick={removeSignup}>
                          Remove Signup
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={signUpAsUser} 
                        disabled={isSigningUp}
                        className="w-full"
                      >
                        {isSigningUp ? "Signing up..." : "Sign Me Up"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-muted-foreground">
                      Sign in to join as yourself or add a player below
                    </p>
                    <Link to="/auth">
                      <Button variant="outline">Sign In</Button>
                    </Link>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Add another player:</h4>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="playerName" className="sr-only">Player Name</Label>
                      <Input
                        id="playerName"
                        placeholder="Player name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && signUpAsGuest()}
                      />
                    </div>
                    <Button 
                      onClick={signUpAsGuest}
                      disabled={!playerName.trim() || isSigningUp}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Signed Up Players ({signups.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signups.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No players signed up yet. Be the first!
                </p>
              ) : (
                <div className="space-y-2">
                  {signups.map((signup, index) => (
                    <div key={signup.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">
                          {signup.is_guest ? signup.guest_name : (signup.player?.name || 'Unknown Player')}
                        </span>
                        {signup.player?.user_id && (
                          <Badge variant="secondary">Registered</Badge>
                        )}
                        {signup.is_guest && (
                          <Badge variant="outline">Guest</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(signup.signed_up_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GameSignup;