import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit2, Trash2, History, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GameInput from '@/components/GameInput';

interface Game {
  id: string;
  team1_goals: number;
  team2_goals: number;
  team1_players: string[];
  team2_players: string[];
  mvp_player: string | null;
  created_at: string;
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game? This will also update player statistics.')) return;

    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Game deleted successfully",
      });
      fetchData();
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
            mvp_player: gameData.mvpPlayer,
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
            mvp_player: gameData.mvpPlayer,
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
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Game Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Games ({games.length})</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Game
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingGame ? 'Edit Game' : 'Add New Game'}
                </DialogTitle>
              </DialogHeader>
              <GameInput 
                players={players.map(p => ({ id: p.id, name: p.name, points: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0, mvpAwards: 0, goalDifference: 0 }))}
                onGameSubmit={handleGameSubmit}
                initialData={editingGame ? {
                  team1Goals: editingGame.team1_goals,
                  team2Goals: editingGame.team2_goals,
                  team1Players: editingGame.team1_players,
                  team2Players: editingGame.team2_players,
                  mvpPlayer: editingGame.mvp_player || '',
                } : undefined}
                isEditing={!!editingGame}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {games.map((game) => (
            <div key={game.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600">Team 1</div>
                      <div className="text-2xl font-bold">{game.team1_goals}</div>
                    </div>
                    <div className="text-lg font-medium text-gray-500">vs</div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600">Team 2</div>
                      <div className="text-2xl font-bold">{game.team2_goals}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-600 mb-1">Team 1 Players:</div>
                      <div className="space-y-1">
                        {game.team1_players.map(playerId => (
                          <div key={playerId} className="text-gray-700">
                            {getPlayerName(playerId)}
                            {game.mvp_player === playerId && (
                              <span className="ml-2 text-yellow-600 font-medium">👑 MVP</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-600 mb-1">Team 2 Players:</div>
                      <div className="space-y-1">
                        {game.team2_players.map(playerId => (
                          <div key={playerId} className="text-gray-700">
                            {getPlayerName(playerId)}
                            {game.mvp_player === playerId && (
                              <span className="ml-2 text-yellow-600 font-medium">👑 MVP</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(game.created_at).toLocaleDateString()} at {new Date(game.created_at).toLocaleTimeString()}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => openDialog(game)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(game.id)}>
                    <Trash2 className="h-4 w-4" />
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
      </CardContent>
    </Card>
  );
};

export default AdminGameManagement;