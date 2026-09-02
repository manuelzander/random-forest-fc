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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Copy, Trash2, UserPlus, UserMinus, CheckCircle, User, Clock, AlertTriangle, Pencil, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendTelegramNotification, sendNewGameNotification, sendGameCancelledNotification } from '@/utils/telegramNotify';
import type { ScheduledGame, GameScheduleSignup, Player } from '@/types';
import { fetchAllPages } from '@/lib/fetchAllPages';

import GuestNameAutocomplete from './GuestNameAutocomplete';

interface ScheduleFormFieldsProps {
  idPrefix: string;
  date?: Date;
  onDateChange: (date?: Date) => void;
  time: string;
  onTimeChange: (time: string) => void;
  pitchSize: string;
  onPitchSizeChange: (value: string) => void;
  totalCost: string;
  onTotalCostChange: (value: string) => void;
  disablePastDates?: boolean;
}

const ScheduleFormFields = ({
  idPrefix,
  date,
  onDateChange,
  time,
  onTimeChange,
  pitchSize,
  onPitchSizeChange,
  totalCost,
  onTotalCostChange,
  disablePastDates,
}: ScheduleFormFieldsProps) => {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Date</Label>
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(value) => {
                onDateChange(value);
                setDatePopoverOpen(false);
              }}
              disabled={disablePastDates ? (d) => d < new Date(new Date().setHours(0, 0, 0, 0)) : undefined}
              initialFocus
              className="p-3 pointer-events-auto"
              modifiers={{ tuesday: (d) => d.getDay() === 2 }}
              modifiersClassNames={{
                tuesday: "bg-[hsl(var(--aurora-blue))]/15 text-[hsl(var(--aurora-blue))] hover:bg-[hsl(var(--aurora-blue))]/25 hover:text-[hsl(var(--aurora-blue))]",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-time`} className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Kick-off time</Label>
        <Input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Pitch size</Label>
        <Select value={pitchSize} onValueChange={onPitchSizeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Pitch size (optional)" />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            <SelectItem value="none">No preference</SelectItem>
            <SelectItem value="small">Small pitch</SelectItem>
            <SelectItem value="big">Big pitch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cost`} className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Total cost (£)</Label>
        <Input
          id={`${idPrefix}-cost`}
          type="number"
          step="0.01"
          min="0"
          value={totalCost}
          onChange={(e) => onTotalCostChange(e.target.value)}
          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
};

interface MvpVoteTally {
  total: number;
  byPlayer: { [playerId: string]: { name: string; votes: number } };
}

const MVP_WINDOW_HOURS = 72;

// Read-only MVP ballot summary for one scheduled game
const getMvpStatus = (
  game: ScheduledGame,
  gameSignups: GameScheduleSignup[],
  tally?: MvpVoteTally,
  allPlayers: Player[] = []
) => {
  const kickoff = new Date(game.scheduled_at).getTime();
  const closesAt = kickoff + MVP_WINDOW_HOURS * 60 * 60 * 1000;
  const now = Date.now();

  if (now < kickoff) return { phase: 'pending' as const };

  // Playing roster only: first 12/14 signups by signup order, no dropouts, account required
  const pitchCapacity = game.pitch_size === 'small' ? 12 : 14;
  const eligibleVoters = gameSignups
    .slice(0, pitchCapacity)
    .filter(s => !s.last_minute_dropout && s.player?.user_id).length;

  if (now < closesAt) {
    return {
      phase: 'open' as const,
      votesCast: tally?.total ?? 0,
      eligibleVoters,
    };
  }

  const entries = Object.entries(tally?.byPlayer || {});
  // Votes arrive ordered by created_at, so a strict comparison keeps the earliest-vote tie-break
  const top = entries.reduce<{ playerId: string; name: string; votes: number } | null>(
    (best, [playerId, entry]) =>
      !best || entry.votes > best.votes ? { playerId, ...entry } : best,
    null
  );
  const winnerId = game.mvp_vote_winner || top?.playerId || null;
  const winner = winnerId ? tally?.byPlayer[winnerId] : undefined;
  // An admin can override the winner to someone who received no votes — fall back to the roster name
  const winnerName =
    winner?.name ?? (winnerId ? allPlayers.find(p => p.id === winnerId)?.name ?? null : null);

  return {
    phase: 'closed' as const,
    winnerName,
    winnerVotes: winner?.votes ?? 0,
    votesCast: tally?.total ?? 0,
    eligibleVoters,
  };
};


const AdminScheduleManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([]);
  const [signups, setSignups] = useState<{ [gameId: string]: GameScheduleSignup[] }>({});
  const [mvpVotes, setMvpVotes] = useState<{ [gameId: string]: MvpVoteTally }>({});
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
  
  const [newGameDate, setNewGameDate] = useState<Date | undefined>(getNextTuesday());
  const [newGameTime, setNewGameTime] = useState('18:15');
  const [newPitchSize, setNewPitchSize] = useState<string>('small');
  const [newTotalCost, setNewTotalCost] = useState<string>('98');
  const [newPlayerNames, setNewPlayerNames] = useState<{ [gameId: string]: string }>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const resetCreateForm = () => {
    setNewGameDate(getNextTuesday());
    setNewGameTime('18:15');
    setNewPitchSize('small');
    setNewTotalCost('98');
  };

  const openCreateDialog = () => {
    resetCreateForm();
    setIsCreateDialogOpen(true);
  };
  
  // Edit game state
  const [editingGame, setEditingGame] = useState<ScheduledGame | null>(null);
  const [editGameDate, setEditGameDate] = useState<Date>();
  const [editGameTime, setEditGameTime] = useState('');
  const [editPitchSize, setEditPitchSize] = useState<string>('');
  const [editTotalCost, setEditTotalCost] = useState<string>('98');
  const [isUpdating, setIsUpdating] = useState(false);

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
      // (paginated: an unpaged fetch stops at Supabase's 1000-row default cap)
      const signupsData = await fetchAllPages((from, to) =>
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
          .order('signed_up_at', { ascending: true })
          .range(from, to)
      );


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

      // MVP votes (aggregate only — no per-voter detail is shown)
      const votesData = await fetchAllPages((from, to) =>
        supabase
          .from('mvp_votes')
          .select('game_schedule_id, voted_player_id, created_at, players:voted_player_id (name)')
          .order('created_at', { ascending: true })
          .range(from, to)
      );

      const groupedVotes: { [gameId: string]: MvpVoteTally } = {};
      (votesData || []).forEach((vote: any) => {
        const tally =
          groupedVotes[vote.game_schedule_id] ||
          (groupedVotes[vote.game_schedule_id] = { total: 0, byPlayer: {} });
        tally.total += 1;
        const entry =
          tally.byPlayer[vote.voted_player_id] ||
          (tally.byPlayer[vote.voted_player_id] = {
            name: vote.players?.name || 'Unknown player',
            votes: 0,
          });
        entry.votes += 1;
      });
      setMvpVotes(groupedVotes);

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

      resetCreateForm();
      setIsCreateDialogOpen(false);
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
      {/* Scheduled Games List */}
      <Card className="overflow-hidden">
        <CardHeader className="card-header-glass py-4">
          <CardTitle className="card-header-glass-title">
            <CalendarIcon className="card-header-glass-icon h-5 w-5" />
            Schedule Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="management-toolbar">
            <h3 className="management-count">Scheduled Games ({scheduledGames.length})</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Schedule Game</span>
                  <span className="sm:hidden">Schedule</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Schedule New Game</DialogTitle>
                </DialogHeader>
                <ScheduleFormFields
                  idPrefix="new-game"
                  date={newGameDate}
                  onDateChange={setNewGameDate}
                  time={newGameTime}
                  onTimeChange={setNewGameTime}
                  pitchSize={newPitchSize}
                  onPitchSizeChange={setNewPitchSize}
                  totalCost={newTotalCost}
                  onTotalCostChange={setNewTotalCost}
                  disablePastDates
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createScheduledGame} disabled={!newGameDate || !newGameTime || isCreating}>
                    {isCreating ? "Creating..." : "Schedule Game"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {scheduledGames.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No scheduled games yet. Schedule your first game to get started.
            </p>
          ) : (
            <div className="space-y-6 p-4 sm:p-6">
              {scheduledGames.map((game) => {
                const mvpStatus = getMvpStatus(game, signups[game.id] || [], mvpVotes[game.id], players);
                return (
                <div key={game.id} className="glass-row space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-base sm:text-lg">
                          <span className="sm:hidden">{format(new Date(game.scheduled_at), "MMM d, h:mm a")}</span>
                          <span className="hidden sm:inline">{format(new Date(game.scheduled_at), "PPP 'at' p")}</span>
                        </h3>
                        {game.pitch_size && (
                          <Badge variant="outline" className="text-xs">
                            {game.pitch_size === 'small' ? 'Small pitch' : 'Big pitch'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {format(new Date(game.created_at), "PPP")}
                      </p>
                      {/* MVP ballot summary (read-only) */}
                      {mvpStatus.phase === 'open' && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="status-badge status-badge-verified">
                            <Trophy className="h-3 w-3 mr-1" />
                            MVP voting open
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {`${mvpStatus.votesCast} of ${mvpStatus.eligibleVoters} voted`}
                          </span>
                        </div>
                      )}
                      {mvpStatus.phase === 'closed' && (mvpStatus.winnerName || mvpStatus.votesCast > 0) && (
                        <div className="flex items-center gap-2 mt-2">
                          {mvpStatus.winnerName ? (
                            <>
                              <Badge className="badge-trophy">
                                <span>👑</span>
                                {mvpStatus.winnerName}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {`${mvpStatus.winnerVotes} of ${mvpStatus.votesCast} votes`}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">MVP: no winner set</span>
                          )}
                        </div>
                      )}
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
                                isLastMinuteDropout ? 'bg-destructive/10' :
                                isWaitlisted ? 'bg-[hsl(var(--aurora-blue))]/10' : ''
                              }>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {isWaitlisted ? `W${index - pitchCapacity + 1}` : `#${index + 1}`}
                                    </Badge>
                                    <span className={isLastMinuteDropout ? 'line-through text-destructive' : ''}>
                                      {signup.is_guest ? signup.guest_name : (signup.player?.name || 'Unknown Player')}
                                    </span>
                                    <div className="flex gap-1">
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
                                       {signup.player?.user_id && (
                                         <Badge className="status-badge status-badge-verified">
                                           <CheckCircle className="h-3 w-3 mr-1" />
                                           <span className="hidden sm:inline">Verified</span>
                                         </Badge>
                                       )}
                                       {signup.is_guest && (
                                         <Badge className="status-badge status-badge-guest">
                                           <User className="h-3 w-3 mr-1" />
                                           <span className="hidden sm:inline">Guest</span>
                                         </Badge>
                                       )}
                                       {!signup.is_guest && !signup.player?.user_id && (
                                         <Badge className="status-badge status-badge-unverified">
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Game Dialog */}
      <Dialog open={!!editingGame} onOpenChange={(open) => !open && setEditingGame(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Edit Scheduled Game</DialogTitle>
          </DialogHeader>
          <ScheduleFormFields
            idPrefix="edit-game"
            date={editGameDate}
            onDateChange={setEditGameDate}
            time={editGameTime}
            onTimeChange={setEditGameTime}
            pitchSize={editPitchSize}
            onPitchSizeChange={setEditPitchSize}
            totalCost={editTotalCost}
            onTotalCostChange={setEditTotalCost}
          />
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