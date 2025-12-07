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
import { sendTelegramNotification, sendGameFullNotification, sendWaitlistPromotedNotification } from '@/utils/telegramNotify';
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
  const [isDropout, setIsDropout] = useState(false);
  const [dropoutSignupId, setDropoutSignupId] = useState<string | null>(null);
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
        if (userSignup) {
          if (userSignup.last_minute_dropout) {
            setIsSignedUp(false);
            setIsDropout(true);
            setDropoutSignupId(userSignup.id);
          } else {
            setIsSignedUp(true);
            setIsDropout(false);
            setDropoutSignupId(null);
          }
        } else {
          setIsSignedUp(false);
          setIsDropout(false);
          setDropoutSignupId(null);
        }
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
      } = await supabase.from('players').select('id, name').eq('user_id', user.id).maybeSingle();
      let playerId = existingPlayer?.id;
      let playerName = existingPlayer?.name;

      // If no claimed player exists, create one
      if (!playerId) {
        const newPlayerName = user.email?.split('@')[0] || 'Anonymous Player';
        const {
          data: newPlayer,
          error: createError
        } = await supabase.from('players').insert({
          name: newPlayerName,
          user_id: user.id,
          created_by: user.id
        }).select('id, name').single();
        if (createError) throw createError;
        playerId = newPlayer.id;
        playerName = newPlayer.name;
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
      
      const newSignupCount = signups.length + 1;
      const pitchCapacity = game!.pitch_size === 'small' ? 12 : 14;
      
      // Send regular signup notification
      sendTelegramNotification({
        playerName: playerName || 'Unknown',
        gameDate: game!.scheduled_at,
        signupCount: newSignupCount,
        pitchSize: game!.pitch_size,
      });
      
      // Check if game just became full
      if (newSignupCount === pitchCapacity) {
        sendGameFullNotification(game!.scheduled_at, game!.pitch_size);
      }
      
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
  
  const rejoinAfterDropout = async () => {
    if (!user || !gameId || !dropoutSignupId) return;
    setIsSigningUp(true);
    try {
      // Just clear the dropout flag - keep the original slot
      const { error } = await supabase
        .from('games_schedule_signups')
        .update({ last_minute_dropout: false })
        .eq('id', dropoutSignupId);
      
      if (error) throw error;

      // Get player name for notification
      const userSignup = signups.find(s => s.id === dropoutSignupId);
      const playerName = userSignup?.player?.name || user.email?.split('@')[0] || 'Unknown';
      
      // Send Telegram notification for rejoin
      sendTelegramNotification({
        playerName,
        gameDate: game!.scheduled_at,
        signupCount: signups.filter(s => !s.last_minute_dropout).length + 1,
        pitchSize: game!.pitch_size,
        isRejoin: true,
      });
      
      toast({
        title: "Welcome back!",
        description: "You've rejoined the game in your original slot."
      });
      fetchGameData();
    } catch (error) {
      console.error('Error rejoining:', error);
      toast({
        title: "Error",
        description: "Failed to rejoin the game",
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
      
      // Validate guest name
      if (!guestName || guestName.length < 2) {
        toast({
          title: "Invalid Name",
          description: "Please enter a valid name (at least 2 characters)",
          variant: "destructive"
        });
        setIsSigningUp(false);
        return;
      }

      if (guestName.length > 50) {
        toast({
          title: "Name Too Long",
          description: "Guest name must be less than 50 characters",
          variant: "destructive"
        });
        setIsSigningUp(false);
        return;
      }

      // Check if guest already exists in guests table first
      let { data: existingGuest, error: guestError } = await supabase
        .from('guests')
        .select('id')
        .ilike('name', guestName)
        .maybeSingle();

      if (guestError) {
        console.error('Error checking existing guest:', guestError);
      }

      // Check if this guest is already signed up for this game (check both guest_name and guest_id)
      const signupQuery = supabase
        .from('games_schedule_signups')
        .select('id, guest_name, guest_id')
        .eq('game_schedule_id', gameId)
        .eq('is_guest', true);
      
      // Check by guest_id if guest exists, otherwise by guest_name
      if (existingGuest?.id) {
        signupQuery.eq('guest_id', existingGuest.id);
      } else {
        signupQuery.ilike('guest_name', guestName);
      }

      const { data: existingSignup } = await signupQuery.maybeSingle();

      if (existingSignup) {
        toast({
          title: "Already Signed Up",
          description: `${guestName} is already signed up for this game`,
          variant: "destructive"
        });
        setIsSigningUp(false);
        return;
      }

      let guestId = existingGuest?.id;

      // If guest doesn't exist, create new guest record
      if (!guestId) {
        const { data: newGuest, error: createError } = await supabase
          .from('guests')
          .insert({ name: guestName })
          .select('id')
          .single();
        
        if (createError) {
          console.error('Error creating guest:', createError);
          throw new Error(`Failed to create guest: ${createError.message}`);
        }
        guestId = newGuest.id;
      }

      // Validate we have the required data
      if (!guestId) {
        throw new Error('Guest ID is missing after creation');
      }

      // Sign up guest for the game with all required fields
      const signupData = {
        game_schedule_id: gameId,
        guest_name: guestName,
        guest_id: guestId,
        is_guest: true,
        player_id: null,
        created_by_user_id: user?.id || null
      };

      console.log('Attempting guest signup with data:', signupData);
      
      const { error, data: signupResult } = await supabase
        .from('games_schedule_signups')
        .insert(signupData)
        .select();
      
      if (error) {
        console.error('Guest signup error:', error);
        throw new Error(`Signup failed: ${error.message}`);
      }

      console.log('Guest signup successful:', signupResult);
      
      const newSignupCount = signups.length + 1;
      const pitchCapacity = game!.pitch_size === 'small' ? 12 : 14;
      
      // Get current user's player name for context
      const currentUserSignup = signups.find(s => s.player?.user_id === user?.id);
      const addedByName = currentUserSignup?.player?.name;
      
      // Send Telegram notification
      sendTelegramNotification({
        playerName: `Guest: ${guestName}`,
        gameDate: game!.scheduled_at,
        signupCount: newSignupCount,
        pitchSize: game!.pitch_size,
        addedBy: addedByName,
      });
      
      // Check if game just became full
      if (newSignupCount === pitchCapacity) {
        sendGameFullNotification(game!.scheduled_at, game!.pitch_size);
      }
      
      toast({
        title: "Success",
        description: `${guestName} has been signed up for the game!`
      });
      setPlayerName('');
      fetchGameData();
    } catch (error: any) {
      console.error('Error signing up guest:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign up for the game. Please try again.",
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

      // Get the active signups (non-dropouts) for waitlist promotion check
      const activeSignups = signups.filter(s => !s.last_minute_dropout);
      const droppingPlayerName = userSignup.player?.name || user.email?.split('@')[0] || 'Unknown';

      // Only mark as dropout if within 24 hours AND in top 12/14 positions
      if (isWithin24Hours && isInTopPositions) {
        // Mark as dropout instead of deleting
        const { error } = await supabase
          .from('games_schedule_signups')
          .update({ last_minute_dropout: true })
          .eq('id', userSignup.id);
        
        if (error) throw error;
        
        // Send Telegram notification for dropout
        sendTelegramNotification({
          playerName: droppingPlayerName,
          gameDate: game!.scheduled_at,
          signupCount: signups.length,
          pitchSize: game!.pitch_size,
          isRemoval: true,
          isDropout: true,
        });
        
        // Check if there's a waitlist player who gets promoted
        // Find the first waitlist player (position > capacity in active signups)
        const waitlistPlayer = activeSignups[pitchCapacity];
        if (waitlistPlayer && !waitlistPlayer.last_minute_dropout) {
          const promotedName = waitlistPlayer.player?.name || 
                               waitlistPlayer.guest?.name || 
                               waitlistPlayer.guest_name || 
                               'Unknown';
          sendWaitlistPromotedNotification(
            game!.scheduled_at,
            activeSignups.length - 1, // After dropout
            game!.pitch_size,
            promotedName,
            droppingPlayerName
          );
        }
        
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
        
        // Check if this removal promotes a waitlist player (only if removing from top positions)
        if (isInTopPositions) {
          const waitlistPlayer = activeSignups[pitchCapacity];
          if (waitlistPlayer && !waitlistPlayer.last_minute_dropout) {
            const promotedName = waitlistPlayer.player?.name || 
                                 waitlistPlayer.guest?.name || 
                                 waitlistPlayer.guest_name || 
                                 'Unknown';
            sendWaitlistPromotedNotification(
              game!.scheduled_at,
              activeSignups.length - 1, // After removal
              game!.pitch_size,
              promotedName,
              droppingPlayerName
            );
          }
        }
        
        // Send Telegram notification for removal
        sendTelegramNotification({
          playerName: droppingPlayerName,
          gameDate: game!.scheduled_at,
          signupCount: signups.length - 1,
          pitchSize: game!.pitch_size,
          isRemoval: true,
        });
        
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
      const pitchCapacity = game?.pitch_size === 'small' ? 12 : 14;
      const isInTopPositions = signupPosition <= pitchCapacity;

      // For guests in top positions within 24h, show a browser confirm dialog
      if (isWithin24Hours && isInTopPositions) {
        const confirmed = window.confirm(
          "This guest is in the playing lineup and it's within 24 hours of the game. " +
          "They will be marked as a dropout and still owe payment. Continue?"
        );
        if (!confirmed) return;
      }

      // Get the active signups (non-dropouts) for waitlist promotion check
      const activeSignups = signups.filter(s => !s.last_minute_dropout);
      const guestName = guestSignup.guest?.name || guestSignup.guest_name || 'Guest';
      const currentUserSignup = signups.find(s => s.player?.user_id === user?.id);
      const removedByName = currentUserSignup?.player?.name;

      // Only mark as dropout if within 24 hours AND in top 12/14 positions
      if (isWithin24Hours && isInTopPositions) {
        // Mark as dropout instead of deleting
        const { error } = await supabase
          .from('games_schedule_signups')
          .update({ last_minute_dropout: true })
          .eq('id', signupId);
        
        if (error) throw error;
        
        // Send Telegram notification for guest dropout
        sendTelegramNotification({
          playerName: `Guest: ${guestName}`,
          gameDate: game!.scheduled_at,
          signupCount: signups.length,
          pitchSize: game!.pitch_size,
          isRemoval: true,
          isDropout: true,
          removedBy: removedByName,
        });
        
        // Check if there's a waitlist player who gets promoted
        const waitlistPlayer = activeSignups[pitchCapacity];
        if (waitlistPlayer && !waitlistPlayer.last_minute_dropout) {
          const promotedName = waitlistPlayer.player?.name || 
                               waitlistPlayer.guest?.name || 
                               waitlistPlayer.guest_name || 
                               'Unknown';
          sendWaitlistPromotedNotification(
            game!.scheduled_at,
            activeSignups.length - 1,
            game!.pitch_size,
            promotedName,
            `Guest: ${guestName}`
          );
        }
        
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
        
        // Check if this removal promotes a waitlist player (only if removing from top positions)
        if (isInTopPositions) {
          const waitlistPlayer = activeSignups[pitchCapacity];
          if (waitlistPlayer && !waitlistPlayer.last_minute_dropout) {
            const promotedName = waitlistPlayer.player?.name || 
                                 waitlistPlayer.guest?.name || 
                                 waitlistPlayer.guest_name || 
                                 'Unknown';
            sendWaitlistPromotedNotification(
              game!.scheduled_at,
              activeSignups.length - 1,
              game!.pitch_size,
              promotedName,
              `Guest: ${guestName}`
            );
          }
        }
        
        // Send Telegram notification for guest removal
        sendTelegramNotification({
          playerName: `Guest: ${guestName}`,
          gameDate: game!.scheduled_at,
          signupCount: signups.length - 1,
          pitchSize: game!.pitch_size,
          isRemoval: true,
          removedBy: removedByName,
        });
        
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
                {user ? (() => {
                    // Calculate user's position
                    const userSignup = signups.find(signup => signup.player?.user_id === user.id);
                    const userPosition = userSignup ? signups.findIndex(s => s.id === userSignup.id) + 1 : 0;
                    const pitchCapacity = game?.pitch_size === 'small' ? 12 : 14;
                    const isUserInTopPositions = userPosition > 0 && userPosition <= pitchCapacity;
                    const isUserWaitlisted = userPosition > pitchCapacity;

                    return <div className="space-y-3">
                      {isDropout ? (
                        // Dropout state - show rejoin option
                        <div className="flex flex-col gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <span className="text-amber-800 font-medium text-sm sm:text-base">
                              You dropped out of this game
                            </span>
                          </div>
                          <p className="text-sm text-amber-700">
                            You still owe payment for the spot. Click rejoin to reclaim your original position.
                          </p>
                          <Button onClick={rejoinAfterDropout} disabled={isSigningUp} className="w-full">
                            {isSigningUp ? "Rejoining..." : "Rejoin Game"}
                          </Button>
                        </div>
                      ) : isSignedUp ? <div className="space-y-3">
                          {/* Alert based on position */}
                          {isWithin24Hours && isUserInTopPositions && <Alert>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                You're in the playing lineup. If you cancel within 24 hours, you'll be marked as a dropout and still owe payment.
                              </AlertDescription>
                            </Alert>}
                          
                          {isWithin24Hours && isUserWaitlisted && <Alert className="border-green-200 bg-green-50">
                              <AlertDescription className="text-green-800">
                                You're on the waitlist. You can cancel anytime without penalty.
                              </AlertDescription>
                            </Alert>}
                          
                          <div className="flex flex-col gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="text-green-800 font-medium text-sm sm:text-base">
                                You're signed up for this game!
                                {isUserWaitlisted && <Badge variant="outline" className="ml-2 text-xs">
                                    Waitlist Position {userPosition - pitchCapacity}
                                  </Badge>}
                              </span>
                            </div>
                            
                            {/* Confirmation checkbox only for top positions within 24h */}
                            {isWithin24Hours && isUserInTopPositions && <div className="flex items-start gap-2 pt-2">
                                <Checkbox id="confirm-replacement" checked={confirmReplacement} onCheckedChange={checked => setConfirmReplacement(checked as boolean)} />
                                <label htmlFor="confirm-replacement" className="text-sm text-muted-foreground cursor-pointer leading-tight">
                                  I confirm I will ask the group for a replacement player
                                </label>
                              </div>}
                            
                            <Button variant="outline" size="sm" onClick={removeSignup} disabled={isWithin24Hours && isUserInTopPositions && !confirmReplacement}>
                              {isWithin24Hours && isUserInTopPositions ? "Cancel (Will Mark as Dropout)" : isUserWaitlisted ? "Remove from Waitlist" : "Cancel Signup"}
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
                  </div>;
                })() : <div className="text-center space-y-4 p-6 bg-muted/30 rounded-lg">
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
                           <span className="text-xs text-muted-foreground hidden sm:inline">
                             {format(new Date(signup.signed_up_at), "MMM d")}
                           </span>
                           {/* Show remove button for guest signups created by current user */}
                           {user && !isLastMinuteDropout && signup.is_guest && signup.created_by_user_id === user.id && (
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => removeGuestSignup(signup.id)} 
                               className="h-7 px-2 text-xs text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                             >
                               <UserMinus className="h-3 w-3 mr-1" />
                               Remove
                             </Button>
                           )}
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