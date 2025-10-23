import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar, Users, UserPlus, ArrowLeft, Clock, CheckCircle, User, UserMinus, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ScheduledGame, GameScheduleSignup, Player } from '@/types';
const GameSignup = () => {
  const {
    gameId
  } = useParams<{
    gameId: string;
  }>();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [game, setGame] = useState<ScheduledGame | null>(null);
  const [signups, setSignups] = useState<GameScheduleSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
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
      const {
        data: gameData,
        error: gameError
      } = await supabase.from('games_schedule').select('*').eq('id', gameId).single();
      if (gameError) throw gameError;
      setGame(gameData);

      // Fetch signups with player and guest details
      const {
        data: signupsData,
        error: signupsError
      } = await supabase.from('games_schedule_signups').select(`
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
        `).eq('game_schedule_id', gameId).order('signed_up_at', {
        ascending: true
      });
      if (signupsError) throw signupsError;
      const formattedSignups = (signupsData || []).map((signup: any) => ({
        ...signup,
        player: signup.players,
        guest: signup.guests
      }));
      setSignups(formattedSignups);

      // Check if current user is already signed up
      if (user) {
        const userSignup = formattedSignups.find(signup => signup.player?.user_id === user.id);
        setIsSignedUp(!!userSignup);
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
      toast({
        title: "Error",
        description: "Failed to load game information",
        variant: "destructive"
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
      let {
        data: existingPlayer,
        error: playerError
      } = await supabase.from('players').select('id').eq('user_id', user.id).maybeSingle();
      let playerId = existingPlayer?.id;

      // If no claimed player exists, create one
      if (!playerId) {
        const {
          data: newPlayer,
          error: createError
        } = await supabase.from('players').insert({
          name: user.email?.split('@')[0] || 'Anonymous Player',
          user_id: user.id,
          created_by: user.id
        }).select('id').single();
        if (createError) throw createError;
        playerId = newPlayer.id;
      }

      // Sign up for the game
      const {
        error
      } = await supabase.from('games_schedule_signups').insert({
        game_schedule_id: gameId,
        player_id: playerId,
        is_guest: false
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Successfully signed up for the game!"
      });
      fetchGameData();
    } catch (error) {
      console.error('Error signing up:', error);
      toast({
        title: "Error",
        description: "Failed to sign up for the game",
        variant: "destructive"
      });
    } finally {
      setIsSigningUp(false);
    }
  };
  const signUpAsGuest = async () => {
    if (!playerName.trim() || !gameId) return;
    setIsSigningUp(true);
    try {
      const guestName = playerName.trim();
      
      // Validate guest name is not empty
      if (!guestName) {
        throw new Error('Guest name cannot be empty');
      }
      
      // Check if guest already exists
      let { data: existingGuest, error: guestError } = await supabase
        .from('guests')
        .select('id')
        .eq('name', guestName)
        .maybeSingle();

      let guestId = existingGuest?.id;

      // If guest doesn't exist, create new guest record
      if (!guestId) {
        const { data: newGuest, error: createError } = await supabase
          .from('guests')
          .insert({ name: guestName })
          .select('id')
          .single();
        
        if (createError) throw createError;
        guestId = newGuest.id;
      }

      // Ensure we have both guest_id and guest_name before creating signup
      if (!guestId || !guestName) {
        throw new Error('Failed to create guest record properly');
      }

      // Sign up guest for the game
      const { error } = await supabase
        .from('games_schedule_signups')
        .insert({
          game_schedule_id: gameId,
          guest_name: guestName,
          guest_id: guestId,
          is_guest: true,
          player_id: null,
          created_by_user_id: user?.id || null
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${guestName} has been signed up for the game!`
      });
      setPlayerName('');
      fetchGameData();
    } catch (error) {
      console.error('Error signing up guest:', error);
      toast({
        title: "Error",
        description: "Failed to sign up for the game",
        variant: "destructive"
      });
    } finally {
      setIsSigningUp(false);
    }
  };
  const removeSignup = async () => {
    if (!user || !gameId) return;

    try {
      const userSignup = signups.find(signup => signup.player?.user_id === user.id);
      if (!userSignup) return;

      // Determine player's position in the signup list
      const signupPosition = signups.findIndex(s => s.id === userSignup.id) + 1;
      const pitchCapacity = game.pitch_size === 'small' ? 12 : 14;
      const isInTopPositions = signupPosition <= pitchCapacity;

      // Check if within 24 hours and in top positions - confirmation required
      if (isWithin24Hours && isInTopPositions && !confirmReplacement) {
        toast({
          title: "Confirmation Required",
          description: "Please confirm that you will ask the group for a replacement",
          variant: "destructive"
        });
        return;
      }

      // Only mark as dropout if within 24 hours AND in top 12/14 positions
      if (isWithin24Hours && isInTopPositions) {
        // Mark as dropout instead of deleting
        const { error } = await supabase
          .from('games_schedule_signups')
          .update({ last_minute_dropout: true })
          .eq('id', userSignup.id);
        
        if (error) throw error;
        
        toast({
          title: "Marked as Last Minute Dropout",
          description: "You were in the top players and still owe payment for this game."
        });
      } else {
        // Delete the signup (either outside 24h window or on waitlist)
        const { error } = await supabase
          .from('games_schedule_signups')
          .delete()
          .eq('id', userSignup.id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: isWithin24Hours 
            ? "You were on the waitlist and have been removed" 
            : "Successfully removed from the game"
        });
      }
      
      setConfirmReplacement(false);
      fetchGameData();
    } catch (error) {
      console.error('Error removing signup:', error);
      toast({
        title: "Error",
        description: "Failed to remove signup",
        variant: "destructive"
      });
    }
  };
  const removeGuestSignup = async (signupId: string) => {
    if (!user) return;
    
    try {
      const guestSignup = signups.find(s => s.id === signupId);
      if (!guestSignup) return;

      // Determine guest's position in the signup list
      const signupPosition = signups.findIndex(s => s.id === signupId) + 1;
      const pitchCapacity = game.pitch_size === 'small' ? 12 : 14;
      const isInTopPositions = signupPosition <= pitchCapacity;

      // Check if within 24 hours and in top positions - confirmation required
      if (isWithin24Hours && isInTopPositions && !confirmReplacement) {
        toast({
          title: "Confirmation Required",
          description: "Please confirm that you will ask the group for a replacement",
          variant: "destructive"
        });
        return;
      }

      // Only mark as dropout if within 24 hours AND in top 12/14 positions
      if (isWithin24Hours && isInTopPositions) {
        // Mark as dropout instead of deleting
        const { error } = await supabase
          .from('games_schedule_signups')
          .update({ last_minute_dropout: true })
          .eq('id', signupId);
        
        if (error) throw error;
        
        toast({
          title: "Marked as Last Minute Dropout",
          description: "Guest was in the top players and still owes payment for this game."
        });
      } else {
        // Delete the guest signup (either outside 24h window or on waitlist)
        const { error } = await supabase
          .from('games_schedule_signups')
          .delete()
          .eq('id', signupId);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: isWithin24Hours 
            ? "Guest was on the waitlist and has been removed" 
            : "Successfully removed guest from the game"
        });
      }
      
      setConfirmReplacement(false);
      fetchGameData();
    } catch (error) {
      console.error('Error removing guest signup:', error);
      toast({
        title: "Error",
        description: "Failed to remove guest signup",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="loading-container">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  if (!game) {
    return <div className="page-container">
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
      </div>;
  }
  const gameDate = new Date(game.scheduled_at);
  const isPastGame = gameDate < new Date();

  // Check if game is within 24 hours
  const timeUntilGame = gameDate.getTime() - new Date().getTime();
  const hoursUntilGame = timeUntilGame / (1000 * 60 * 60);
  const isWithin24Hours = hoursUntilGame <= 24 && hoursUntilGame > 0;
  return <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-inner">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Game Signup</h1>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm sm:text-base text-muted-foreground truncate">
                    <span className="sm:hidden">{format(gameDate, "MMM d, h:mm a")}</span>
                    <span className="hidden sm:inline">{format(gameDate, "MMM d, yyyy 'at' h:mm a")}</span>
                  </p>
                  {game.pitch_size && <Badge variant="outline" className="text-xs">
                      {game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}
                    </Badge>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-main-content">
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-4">

          {/* Main Signup Section */}
          {!isPastGame && <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
                  Join This Game
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {user ? <div className="space-y-3">
                    {isSignedUp ? <div className="space-y-3">
                        {isWithin24Hours && <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>Game is within 24 hours. If you cancel, please ask for a replacement player.</AlertDescription>
                          </Alert>}
                        <div className="flex flex-col gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-green-800 font-medium text-sm sm:text-base">You're signed up for this game!</span>
                          </div>
                          {isWithin24Hours && <div className="flex items-start gap-2 pt-2">
                              <Checkbox id="confirm-replacement" checked={confirmReplacement} onCheckedChange={checked => setConfirmReplacement(checked as boolean)} />
                              <label htmlFor="confirm-replacement" className="text-sm text-muted-foreground cursor-pointer leading-tight">
                                I confirm I will ask the group for a replacement player
                              </label>
                            </div>}
                          <Button variant="outline" size="sm" onClick={removeSignup} disabled={isWithin24Hours && !confirmReplacement}>
                            Cancel Signup
                          </Button>
                        </div>
                      </div> : <div className="text-center space-y-3">
                        <p className="text-muted-foreground text-sm">
                          Ready to play? Sign up now!
                        </p>
                        <Button onClick={signUpAsUser} disabled={isSigningUp} className="w-full" size="lg">
                          {isSigningUp ? "Signing up..." : "Sign Me Up"}
                        </Button>
                      </div>}
                  </div> : <div className="text-center space-y-4 p-6 bg-muted/30 rounded-lg">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Have an account?</h3>
                      <p className="text-muted-foreground text-sm">
                        Sign in to join the game and track your stats
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Link to="/auth">
                        <Button size="lg">Sign In</Button>
                      </Link>
                      <Link to="/auth">
                        <Button variant="outline" size="lg">Create Account</Button>
                      </Link>
                    </div>
                  </div>}

                {/* Guest Signup Section */}
                <div className="border-t pt-6">
                  <div className="space-y-4">
                    <div className="text-center space-y-2">
                      <h4 className="font-medium text-base text-muted-foreground">Don't have an account?</h4>
                      <p className="text-sm text-muted-foreground">
                        You can still join as a guest
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="guestName" className="sr-only">Guest Name</Label>
                        <Input id="guestName" placeholder="Enter your name" value={playerName} onChange={e => setPlayerName(e.target.value)} onKeyPress={e => e.key === 'Enter' && signUpAsGuest()} className="text-sm" />
                      </div>
                      <Button onClick={signUpAsGuest} disabled={!playerName.trim() || isSigningUp} size="sm" variant="outline">
                        Join as Guest
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>}

          {/* Players List */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Players ({signups.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signups.length === 0 ? <p className="text-center text-muted-foreground py-6 text-sm">
                  No players yet. Be the first!
                </p> : <div className="space-y-2">
                  {signups.map((signup, index) => {
                const pitchCapacity = game.pitch_size === 'small' ? 12 : game.pitch_size === 'big' ? 14 : 14;
                const isWaitlisted = index >= pitchCapacity;
                const isLastMinuteDropout = signup.last_minute_dropout === true;
                return <div key={signup.id} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                  isLastMinuteDropout ? 'bg-red-50 border border-red-300' :
                  isWaitlisted ? 'bg-orange-50 border border-orange-200' : 
                  'bg-muted/50'
                }`}>
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {isWaitlisted ? `W${index - pitchCapacity + 1}` : `#${index + 1}`}
                          </Badge>
                          <span className={`font-medium truncate text-sm sm:text-base ${isLastMinuteDropout ? 'line-through text-red-600' : ''}`}>
                            {signup.is_guest ? signup.guest_name : signup.player?.name || 'Unknown'}
                          </span>
                          <div className="flex gap-1 shrink-0">
                             {isLastMinuteDropout && <Badge className="text-xs h-5 px-1.5 bg-red-100 text-red-700 border-0">
                                 <AlertTriangle className="h-3 w-3 mr-1" />
                                 <span className="hidden sm:inline">Dropout</span>
                               </Badge>}
                             {isWaitlisted && !isLastMinuteDropout && <Badge className="text-xs h-5 px-1.5 bg-orange-100 text-orange-700 border-0">
                                 <Clock className="h-3 w-3 mr-1" />
                                 <span className="hidden sm:inline">Waitlist</span>
                               </Badge>}
                            {signup.player?.user_id && !isLastMinuteDropout && <Badge className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0 hover:bg-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Verified</span>
                              </Badge>}
                            {signup.is_guest && !isLastMinuteDropout && <Badge className="text-xs h-5 px-1.5 bg-blue-100 text-blue-700 border-0 hover:bg-blue-200">
                                <User className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Guest</span>
                              </Badge>}
                          </div>
                         </div>
                         <div className="flex items-center gap-2 shrink-0">
                           <span className="text-xs text-muted-foreground">
                             {format(new Date(signup.signed_up_at), "MMM d")}
                           </span>
                            {/* Show remove button for own signups or guest signups created by current user */}
                            {user && !isLastMinuteDropout && (signup.player?.user_id === user.id || signup.is_guest && signup.created_by_user_id === user.id) && <Button variant="ghost" size="sm" onClick={() => signup.is_guest ? removeGuestSignup(signup.id) : removeSignup()} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                                <UserMinus className="h-3 w-3" />
                              </Button>}
                         </div>
                      </div>;
              })}
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
};
export default GameSignup;