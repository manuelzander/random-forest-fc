import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Copy, Trash2, UserPlus, UserMinus, CheckCircle, User, Clock, AlertTriangle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendTelegramNotification, sendNewGameNotification, sendGameCancelledNotification } from '@/utils/telegramNotify';
import type { ScheduledGame, GameScheduleSignup, Player } from '@/types';
import GuestNameAutocomplete from './GuestNameAutocomplete';

const AdminScheduleManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([]);
  const [signups, setSignups] = useState<{ [gameId: string]: GameScheduleSignup[] }>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Calculate next Tuesday
  const getNextTuesday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7; // 2 = Tuesday, ensure at least 1 day ahead
    const nextTuesday = new Date(today);
    nextTuesday.setDate(today.getDate() + daysUntilTuesday);
    return nextTuesday;
  };
  
  const [newGameDate, setNewGameDate] = useState<Date>(getNextTuesday());
  const [newGameTime, setNewGameTime] = useState('18:15');
  const [newPitchSize, setNewPitchSize] = useState<string>('small');
  const [newTotalCost, setNewTotalCost] = useState<string>('98');
  const [newPlayerNames, setNewPlayerNames] = useState<{ [gameId: string]: string }>({});
  
  // Edit game state
  const [editingGame, setEditingGame] = useState<ScheduledGame | null>(null);
  const [editGameDate, setEditGameDate] = useState<Date>();
  const [editGameTime, setEditGameTime] = useState('');
  const [editPitchSize, setEditPitchSize] = useState<string>('');
  const [editTotalCost, setEditTotalCost] = useState<string>('98');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editDatePopoverOpen, setEditDatePopoverOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch scheduled games
      const { data: games, error: gamesError } = await supabase
        .from('games_schedule')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (gamesError) throw gamesError;
      setScheduledGames(games || []);

      // Fetch signups for all games with player and guest details
      const { data: signupsData, error: signupsError } = await supabase
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
          player: signup.players,
          guest: signup.guests
        });
      });
      setSignups(groupedSignups);

      // Fetch all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name, avatar_url, user_id')
        .order('name');

      if (playersError) throw playersError;
      setPlayers(playersData?.map(p => ({
        ...p,
        games_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        mvp_awards: 0,
        points: 0,
        goal_difference: 0,
        created_by: null,
        badges: null
      })) || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduled games",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createScheduledGame = async () => {
    if (!newGameDate || !newGameTime || !user) return;

    setIsCreating(true);
    try {
      const scheduledAt = new Date(newGameDate);
      const [hours, minutes] = newGameTime.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes));

      const gameData: any = {
        scheduled_at: scheduledAt.toISOString(),
        created_by: user.id
      };

      // Add pitch size if selected and not "none"
      if (newPitchSize && newPitchSize !== 'none') {
        gameData.pitch_size = newPitchSize;
      }

      // Add total cost
      const costValue = parseFloat(newTotalCost);
      if (!isNaN(costValue) && costValue >= 0) {
        gameData.total_cost = costValue;
      }

      const { data: newGame, error } = await supabase
        .from('games_schedule')
        .insert(gameData)
        .select('id')
        .single();

      if (error) throw error;

      // Send Telegram notification for new game with signup URL
      const signupUrl = `https://random-forest-fc.lovable.app/signup/${newGame.id}`;
      sendNewGameNotification(
        scheduledAt,
        newPitchSize === 'none' ? null : newPitchSize,
        signupUrl
      );

      toast({
        title: "Success",
        description: "Game scheduled successfully",
      });

      setNewGameDate(undefined);
      setNewGameTime('');
      setNewPitchSize('none');
      fetchData();
    } catch (error) {
      console.error('Error creating scheduled game:', error);
      toast({
        title: "Error",
        description: "Failed to schedule game",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (game: ScheduledGame) => {
    const gameDate = new Date(game.scheduled_at);
    setEditingGame(game);
    setEditGameDate(gameDate);
    setEditGameTime(format(gameDate, 'HH:mm'));
    setEditPitchSize(game.pitch_size || 'none');
    setEditTotalCost(String(game.total_cost ?? 93.6));
  };

  const updateScheduledGame = async () => {
    if (!editingGame || !editGameDate || !editGameTime) return;

    setIsUpdating(true);
    try {
      const scheduledAt = new Date(editGameDate);
      const [hours, minutes] = editGameTime.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase
        .from('games_schedule')
        .update({
          scheduled_at: scheduledAt.toISOString(),
          pitch_size: editPitchSize === 'none' ? null : editPitchSize,
          total_cost: parseFloat(editTotalCost) || 93.6
        })
        .eq('id', editingGame.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Game updated successfully",
      });

      setEditingGame(null);
      fetchData();
    } catch (error) {
      console.error('Error updating scheduled game:', error);
      toast({
        title: "Error",
        description: "Failed to update game",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteScheduledGame = async (gameId: string) => {
    try {
      // Get game details before deleting for notification
      const game = scheduledGames.find(g => g.id === gameId);
      
      const { error } = await supabase
        .from('games_schedule')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

      // Send Telegram notification for cancelled game
      if (game) {
        sendGameCancelledNotification(game.scheduled_at, game.pitch_size);
      }

      toast({
        title: "Success",
        description: "Scheduled game deleted",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting scheduled game:', error);
      toast({
        title: "Error",
        description: "Failed to delete scheduled game",
        variant: "destructive",
      });
    }
  };

  const addPlayerToGame = async (gameId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from('games_schedule_signups')
        .insert({
          game_schedule_id: gameId,
          player_id: playerId,
          is_guest: false
        });

      if (error) throw error;

      // Send Telegram notification (admin action)
      const player = players.find(p => p.id === playerId);
      const game = scheduledGames.find(g => g.id === gameId);
      if (player && game) {
        sendTelegramNotification({
          playerName: player.name,
          gameDate: game.scheduled_at,
          signupCount: (signups[gameId]?.length || 0) + 1,
          pitchSize: game.pitch_size,
          isAdmin: true,
        });
      }

      toast({
        title: "Success",
        description: "Player added to game",
      });

      fetchData();
    } catch (error) {
      console.error('Error adding player:', error);
      toast({
        title: "Error",
        description: "Failed to add player to game",
        variant: "destructive",
      });
    }
  };

  const addGuestToGame = async (gameId: string, guestName: string) => {
    if (!guestName.trim()) return;

    try {
      const trimmedName = guestName.trim();
      
      // Check if guest already exists
      let { data: existingGuest, error: guestError } = await supabase
        .from('guests')
        .select('id')
        .eq('name', trimmedName)
        .maybeSingle();

      let guestId = existingGuest?.id;

      // If guest doesn't exist, create new guest record
      if (!guestId) {
        const { data: newGuest, error: createError } = await supabase
          .from('guests')
          .insert({ name: trimmedName })
          .select('id')
          .single();
        
        if (createError) throw createError;
        guestId = newGuest.id;
      }

      // Add guest to game
      const { error } = await supabase
        .from('games_schedule_signups')
        .insert({
          game_schedule_id: gameId,
          guest_name: trimmedName,
          guest_id: guestId,
          is_guest: true,
          player_id: null
        });

      if (error) throw error;

      // Send Telegram notification (admin action)
      const game = scheduledGames.find(g => g.id === gameId);
      if (game) {
        sendTelegramNotification({
          playerName: `Guest: ${trimmedName}`,
          gameDate: game.scheduled_at,
          signupCount: (signups[gameId]?.length || 0) + 1,
          pitchSize: game.pitch_size,
          isAdmin: true,
        });
      }

      toast({
        title: "Success",
        description: `${trimmedName} added to game as guest`,
      });

      // Clear the input and refresh data
      setNewPlayerNames(prev => ({ ...prev, [gameId]: '' }));
      fetchData();
    } catch (error) {
      console.error('Error adding guest:', error);
      toast({
        title: "Error",
        description: "Failed to add guest to game",
        variant: "destructive",
      });
    }
  };

  const removePlayerFromGame = async (signupId: string, gameId: string) => {
    try {
      // Find the signup details before deleting
      const gameSignups = signups[gameId] || [];
      const signup = gameSignups.find(s => s.id === signupId);
      const game = scheduledGames.find(g => g.id === gameId);
      
      const { error } = await supabase
        .from('games_schedule_signups')
        .delete()
        .eq('id', signupId);

      if (error) throw error;

      // Send Telegram notification (admin action)
      if (signup && game) {
        const playerName = signup.is_guest 
          ? `Guest: ${signup.guest?.name || signup.guest_name}` 
          : signup.player?.name || 'Unknown';
        sendTelegramNotification({
          playerName,
          gameDate: game.scheduled_at,
          signupCount: gameSignups.length - 1,
          pitchSize: game.pitch_size,
          isRemoval: true,
          isAdmin: true,
        });
      }

      toast({
        title: "Success",
        description: "Player removed from game",
      });

      fetchData();
    } catch (error) {
      console.error('Error removing player:', error);
      toast({
        title: "Error",
        description: "Failed to remove player from game",
        variant: "destructive",
      });
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

  const getAvailablePlayers = (gameId: string) => {
    const gameSignups = signups[gameId] || [];
    const signedUpPlayerIds = gameSignups.map(signup => signup.player_id);
    return players.filter(player => !signedUpPlayerIds.includes(player.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Scheduled Game */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="h-5 w-5" />
            Schedule New Game
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newGameDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newGameDate ? format(newGameDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newGameDate}
                    onSelect={setNewGameDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    modifiers={{
                      tuesday: (date) => date.getDay() === 2,
                    }}
                    modifiersClassNames={{
                      tuesday: "bg-orange-100 text-orange-700 hover:bg-orange-200 hover:text-orange-800",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={newGameTime}
                onChange={(e) => setNewGameTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pitch Size (Optional)</Label>
              <Select value={newPitchSize} onValueChange={setNewPitchSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pitch size" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="small">Small pitch</SelectItem>
                  <SelectItem value="big">Big pitch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Total Cost (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newTotalCost}
                onChange={(e) => setNewTotalCost(e.target.value)}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={createScheduledGame}
                disabled={!newGameDate || !newGameTime || isCreating}
                className="w-full"
              >
                {isCreating ? "Creating..." : "Schedule Game"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Games List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarIcon className="h-5 w-5" />
            Schedule Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Scheduled Games ({scheduledGames.length})</h3>
          </div>
          {scheduledGames.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No scheduled games yet. Create your first one above!
            </p>
          ) : (
            <div className="space-y-6">
              {scheduledGames.map((game) => (
                <div key={game.id} className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base sm:text-lg">
                          <span className="sm:hidden">{format(new Date(game.scheduled_at), "MMM d, h:mm a")}</span>
                          <span className="hidden sm:inline">{format(new Date(game.scheduled_at), "PPP 'at' p")}</span>
                        </h3>
                        {game.pitch_size && (
                          <Badge variant="outline" className="text-xs sm:hidden">
                            {game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground hidden sm:block">
                          Created {format(new Date(game.created_at), "PPP")}
                        </p>
                        {game.pitch_size && (
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                            {game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copySignupUrl(game.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Copy Signup URL</span>
                        <span className="sm:hidden">Copy URL</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(game)}
                        className="flex-none"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteScheduledGame(game.id)}
                        className="flex-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Signups Management */}
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium hidden sm:block">
                        Signed Up Players ({(signups[game.id] || []).length})
                      </h4>
                    </div>

                    {/* Add Players - Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-4 sm:pb-6 border-b border-border">
                      {/* Add Existing Player */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Add Existing Player</Label>
                        <Select onValueChange={(playerId) => addPlayerToGame(game.id, playerId)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            {getAvailablePlayers(game.id).length > 0 ? (
                              getAvailablePlayers(game.id).map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  {player.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">
                                All players signed up
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Add Guest */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Add Guest</Label>
                        <div className="flex gap-2">
                          <GuestNameAutocomplete
                            value={newPlayerNames[game.id] || ''}
                            onChange={(value) => setNewPlayerNames(prev => ({ ...prev, [game.id]: value }))}
                            onKeyPress={(e) => e.key === 'Enter' && addGuestToGame(game.id, newPlayerNames[game.id] || '')}
                            gameId={game.id}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addGuestToGame(game.id, newPlayerNames[game.id] || '')}
                            disabled={!newPlayerNames[game.id]?.trim()}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>


                    {(signups[game.id] || []).length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="w-20">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(signups[game.id] || []).map((signup, index) => {
                            const pitchCapacity = game.pitch_size === 'small' ? 12 : game.pitch_size === 'big' ? 14 : 14;
                            const isWaitlisted = index >= pitchCapacity;
                            const isLastMinuteDropout = signup.last_minute_dropout === true;
                            
                            return (
                              <TableRow key={signup.id} className={
                                isLastMinuteDropout ? 'bg-red-50' :
                                isWaitlisted ? 'bg-orange-50' : ''
                              }>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {isWaitlisted ? `W${index - pitchCapacity + 1}` : `#${index + 1}`}
                                    </Badge>
                                    <span className={isLastMinuteDropout ? 'line-through text-red-600' : ''}>
                                      {signup.is_guest ? signup.guest_name : (signup.player?.name || 'Unknown Player')}
                                    </span>
                                    <div className="flex gap-1">
                                       {isLastMinuteDropout && (
                                         <Badge className="text-xs h-5 px-1.5 bg-red-100 text-red-700 border-0">
                                           <AlertTriangle className="h-3 w-3 mr-1" />
                                           <span className="hidden sm:inline">Dropout</span>
                                         </Badge>
                                       )}
                                       {isWaitlisted && !isLastMinuteDropout && (
                                         <Badge className="text-xs h-5 px-1.5 bg-orange-100 text-orange-700 border-0">
                                           <Clock className="h-3 w-3 mr-1" />
                                           <span className="hidden sm:inline">Waitlist</span>
                                         </Badge>
                                       )}
                                       {signup.player?.user_id && (
                                         <Badge className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0">
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
                                       {!signup.is_guest && !signup.player?.user_id && (
                                         <Badge className="text-xs h-5 px-1.5 bg-orange-100 text-orange-700 border-0">
                                           <User className="h-3 w-3 mr-1" />
                                           <span className="hidden sm:inline">Unverified</span>
                                         </Badge>
                                       )}
                                    </div>
                                  </div>
                                </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                <span className="sm:hidden">{format(new Date(signup.signed_up_at), "M/d h:mm a")}</span>
                                <span className="hidden sm:inline">{format(new Date(signup.signed_up_at), "MMM d, h:mm a")}</span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePlayerFromGame(signup.id, game.id)}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                             </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        No players signed up yet
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Game Dialog */}
      <Dialog open={!!editingGame} onOpenChange={(open) => !open && setEditingGame(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={editDatePopoverOpen} onOpenChange={setEditDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editGameDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editGameDate ? format(editGameDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editGameDate}
                    onSelect={(date) => {
                      setEditGameDate(date);
                      setEditDatePopoverOpen(false);
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={editGameTime}
                onChange={(e) => setEditGameTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pitch Size</Label>
              <Select value={editPitchSize} onValueChange={setEditPitchSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pitch size" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="small">Small pitch</SelectItem>
                  <SelectItem value="big">Big pitch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Total Cost (£)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editTotalCost}
                onChange={(e) => setEditTotalCost(e.target.value)}
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGame(null)}>
              Cancel
            </Button>
            <Button onClick={updateScheduledGame} disabled={!editGameDate || !editGameTime || isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminScheduleManagement;