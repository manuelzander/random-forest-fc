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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Copy, Trash2, UserPlus, UserMinus, CheckCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduledGame, GameScheduleSignup, Player } from '@/types';

const AdminScheduleManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduledGames, setScheduledGames] = useState<ScheduledGame[]>([]);
  const [signups, setSignups] = useState<{ [gameId: string]: GameScheduleSignup[] }>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newGameDate, setNewGameDate] = useState<Date>();
  const [newGameTime, setNewGameTime] = useState('');
  const [newPlayerNames, setNewPlayerNames] = useState<{ [gameId: string]: string }>({});

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

      const { error } = await supabase
        .from('games_schedule')
        .insert({
          scheduled_at: scheduledAt.toISOString(),
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Game scheduled successfully",
      });

      setNewGameDate(undefined);
      setNewGameTime('');
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

  const deleteScheduledGame = async (gameId: string) => {
    try {
      const { error } = await supabase
        .from('games_schedule')
        .delete()
        .eq('id', gameId);

      if (error) throw error;

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
      // Add guest directly without creating player record
      const { error } = await supabase
        .from('games_schedule_signups')
        .insert({
          game_schedule_id: gameId,
          guest_name: guestName.trim(),
          is_guest: true,
          player_id: null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${guestName} added to game as guest`,
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

  const removePlayerFromGame = async (signupId: string) => {
    try {
      const { error } = await supabase
        .from('games_schedule_signups')
        .delete()
        .eq('id', signupId);

      if (error) throw error;

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div key={game.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">
                        <span className="sm:hidden">{format(new Date(game.scheduled_at), "MMM do, yyyy 'at' h:mm a")}</span>
                        <span className="hidden sm:inline">{format(new Date(game.scheduled_at), "PPP 'at' p")}</span>
                      </h3>
                      <p className="text-sm text-muted-foreground hidden sm:block">
                        Created {format(new Date(game.created_at), "PPP")}
                      </p>
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
                      <h4 className="font-medium">
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
                          <Input
                            placeholder="Guest name"
                            value={newPlayerNames[game.id] || ''}
                            onChange={(e) => setNewPlayerNames(prev => ({ ...prev, [game.id]: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && addGuestToGame(game.id, newPlayerNames[game.id] || '')}
                            className="flex-1"
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
                          {(signups[game.id] || []).map((signup) => (
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
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePlayerFromGame(signup.id)}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
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
    </div>
  );
};

export default AdminScheduleManagement;