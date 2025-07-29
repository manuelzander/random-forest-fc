import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Edit2, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  points: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  mvp_awards: number;
  goal_difference: number;
}

const AdminPlayerManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('points', { ascending: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to fetch players",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const playerData = {
      name: formData.get('name') as string,
      points: parseFloat(formData.get('points') as string) || 0,
      games_played: parseInt(formData.get('games_played') as string) || 0,
      wins: parseInt(formData.get('wins') as string) || 0,
      draws: parseInt(formData.get('draws') as string) || 0,
      losses: parseInt(formData.get('losses') as string) || 0,
      mvp_awards: parseInt(formData.get('mvp_awards') as string) || 0,
      goal_difference: parseInt(formData.get('goal_difference') as string) || 0,
    };

    try {
      if (editingPlayer) {
        const { error } = await supabase
          .from('players')
          .update(playerData)
          .eq('id', editingPlayer.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Player updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('players')
          .insert([playerData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Player added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingPlayer(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error saving player:', error);
      toast({
        title: "Error",
        description: "Failed to save player",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Player deleted successfully",
      });
      fetchPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive",
      });
    }
  };

  const openDialog = (player?: Player) => {
    setEditingPlayer(player || null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading players...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Player Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Players ({players.length})</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPlayer ? 'Edit Player' : 'Add New Player'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingPlayer?.name || ''}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      name="points"
                      type="number"
                      step="0.1"
                      defaultValue={editingPlayer?.points || 0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="games_played">Games Played</Label>
                    <Input
                      id="games_played"
                      name="games_played"
                      type="number"
                      defaultValue={editingPlayer?.games_played || 0}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wins">Wins</Label>
                    <Input
                      id="wins"
                      name="wins"
                      type="number"
                      defaultValue={editingPlayer?.wins || 0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="draws">Draws</Label>
                    <Input
                      id="draws"
                      name="draws"
                      type="number"
                      defaultValue={editingPlayer?.draws || 0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="losses">Losses</Label>
                    <Input
                      id="losses"
                      name="losses"
                      type="number"
                      defaultValue={editingPlayer?.losses || 0}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mvp_awards">MVP Awards</Label>
                    <Input
                      id="mvp_awards"
                      name="mvp_awards"
                      type="number"
                      defaultValue={editingPlayer?.mvp_awards || 0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal_difference">Goal Difference</Label>
                    <Input
                      id="goal_difference"
                      name="goal_difference"
                      type="number"
                      defaultValue={editingPlayer?.goal_difference || 0}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingPlayer ? 'Update' : 'Add'} Player
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-semibold">{player.name}</h4>
                <p className="text-sm text-gray-600">
                  {player.points} pts • {player.games_played} games • {player.wins}W-{player.draws}D-{player.losses}L
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openDialog(player)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(player.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <Alert>
              <AlertDescription>
                No players found. Add your first player to get started.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPlayerManagement;