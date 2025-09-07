import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit2, Trash2, History, Plus, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import GameInput from '@/components/GameInput';

interface Game {
  id: string;
  team1_goals: number;
  team2_goals: number;
  team1_players: string[];
  team2_players: string[];
  team1_captain: string | null;
  team2_captain: string | null;
  mvp_player: string | null;
  created_at: string;
  youtube_url?: string | null;
}

interface Player {
  id: string;
  name: string;
}

const AdminGameManagement = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesResponse, playersResponse] = await Promise.all([
        supabase
          .from('games')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('players')
          .select('id, name')
          .order('name')
      ]);

      if (gamesResponse.error) throw gamesResponse.error;
      if (playersResponse.error) throw playersResponse.error;

      setGames(gamesResponse.data || []);
      setPlayers(playersResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch games and players",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Unknown Player';
  };

  const openDeleteDialog = (game: Game) => {
    setGameToDelete(game);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!gameToDelete) return;

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameToDelete.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Game deleted successfully",
      });
      fetchData();
      setDeleteDialogOpen(false);
      setGameToDelete(null);
    } catch (error) {
      console.error('Error deleting game:', error);
      toast({
        title: "Error",
        description: "Failed to delete game",
        variant: "destructive",
      });
    }
  };

  const handleGameSubmit = async (gameData: any) => {
    try {
      if (editingGame) {
        const { error } = await supabase
          .from('games')
          .update({
            team1_goals: gameData.team1Goals,
            team2_goals: gameData.team2Goals,
            team1_players: gameData.team1Players,
            team2_players: gameData.team2Players,
            team1_captain: gameData.team1Captain,
            team2_captain: gameData.team2Captain,
            mvp_player: gameData.mvpPlayer,
            youtube_url: gameData.youtubeUrl || null,
          })
          .eq('id', editingGame.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Game updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('games')
          .insert([{
            team1_goals: gameData.team1Goals,
            team2_goals: gameData.team2Goals,
            team1_players: gameData.team1Players,
            team2_players: gameData.team2Players,
            team1_captain: gameData.team1Captain,
            team2_captain: gameData.team2Captain,
            mvp_player: gameData.mvpPlayer,
            youtube_url: gameData.youtubeUrl || null,
          }]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Game added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingGame(null);
      fetchData();
    } catch (error) {
      console.error('Error saving game:', error);
      toast({
        title: "Error",
        description: "Failed to save game",
        variant: "destructive",
      });
    }
  };

  const openDialog = (game?: Game) => {
    setEditingGame(game || null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading games...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <History className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Game Management</span>
          <span className="sm:hidden">Games</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Games ({games.length})</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openDialog()}>
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Game</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  {editingGame ? 'Edit Game' : 'Add New Game'}
                </DialogTitle>
              </DialogHeader>
              <GameInput 
                players={players.map(p => ({ id: p.id, name: p.name, points: 0, games_played: 0, wins: 0, draws: 0, losses: 0, mvp_awards: 0, goal_difference: 0 }))}
                onGameSubmit={handleGameSubmit}
                initialData={editingGame ? {
                  team1Goals: editingGame.team1_goals,
                  team2Goals: editingGame.team2_goals,
                  team1Players: editingGame.team1_players,
                  team2Players: editingGame.team2_players,
                  team1Captain: editingGame.team1_captain || '',
                  team2Captain: editingGame.team2_captain || '',
                  mvpPlayer: editingGame.mvp_player || '',
                  youtubeUrl: editingGame.youtube_url || '',
                } : undefined}
                isEditing={!!editingGame}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {games.map((game) => (
            <div key={game.id} className="p-3 sm:p-4 border rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-xs sm:text-sm font-medium text-muted-foreground">Team 1</div>
                      <div className="text-xl sm:text-2xl font-bold">{game.team1_goals}</div>
                    </div>
                    <div className="text-sm sm:text-lg font-medium text-muted-foreground">vs</div>
                    <div className="text-center">
                      <div className="text-xs sm:text-sm font-medium text-muted-foreground">Team 2</div>
                      <div className="text-xl sm:text-2xl font-bold">{game.team2_goals}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">Team 1 Players:</div>
                      <div className="space-y-1">
                        {game.team1_players.map(playerId => (
                          <div key={playerId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm truncate">{getPlayerName(playerId)}</span>
                              {game.team1_captain === playerId && (
                                <Badge variant="secondary" className="text-xs px-1 py-0.5 h-auto">
                                  <Crown className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                  <span className="hidden sm:inline">Captain</span>
                                  <span className="sm:hidden">C</span>
                                </Badge>
                              )}
                            </div>
                            {game.mvp_player === playerId && (
                              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 px-1 py-0.5 text-xs h-auto border-0 w-fit">
                                <span>👑</span>
                                MVP
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground mb-1">Team 2 Players:</div>
                      <div className="space-y-1">
                        {game.team2_players.map(playerId => (
                          <div key={playerId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm truncate">{getPlayerName(playerId)}</span>
                              {game.team2_captain === playerId && (
                                <Badge variant="secondary" className="text-xs px-1 py-0.5 h-auto">
                                  <Crown className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                  <span className="hidden sm:inline">Captain</span>
                                  <span className="sm:hidden">C</span>
                                </Badge>
                              )}
                            </div>
                            {game.mvp_player === playerId && (
                              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 px-1 py-0.5 text-xs h-auto border-0 w-fit">
                                <span>👑</span>
                                MVP
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(game.created_at).toLocaleDateString()} at {new Date(game.created_at).toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="flex sm:flex-col gap-2 justify-center sm:ml-4">
                  <Button size="sm" variant="outline" onClick={() => openDialog(game)}>
                    <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openDeleteDialog(game)}>
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {games.length === 0 && (
            <Alert>
              <AlertDescription>
                No games found. Add your first game to get started.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Game</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this game? This action cannot be undone and will also update player statistics.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete Game
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AdminGameManagement;