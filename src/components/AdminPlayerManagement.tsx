import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit2, Trash2, Users, UserCheck, UserX, Wand2, Loader2 } from 'lucide-react';
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
  user_id?: string | null;
  avatar_url?: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
}

const AdminPlayerManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [generatingAvatarFor, setGeneratingAvatarFor] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
    fetchProfiles();
  }, []);

  const fetchPlayers = async () => {
    try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .order('points', { ascending: false });

    if (error) throw error;
    
    const formattedPlayers = (data || []).map(player => ({
      id: player.id,
      name: player.name,
      points: Number(player.points),
      games_played: Number(player.games_played),
      wins: Number(player.wins),
      draws: Number(player.draws),
      losses: Number(player.losses),
      mvp_awards: Number(player.mvp_awards),
      goal_difference: Number(player.goal_difference),
      user_id: player.user_id,
      avatar_url: player.avatar_url,
    }));
    
    setPlayers(formattedPlayers);
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

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const playerData = {
      name: formData.get('name') as string,
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
        const { data: newPlayer, error } = await supabase
          .from('players')
          .insert([playerData])
          .select()
          .single();

        if (error) throw error;

        // Generate default avatar for new player
        try {
          await supabase.functions.invoke('generate-avatar', {
            body: { 
              playerName: playerData.name,
              playerId: newPlayer.id 
            }
          });
        } catch (avatarError) {
          console.error('Failed to generate default avatar:', avatarError);
          // Don't fail the player creation if avatar generation fails
        }

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

  const openClaimDialog = (player: Player) => {
    setSelectedPlayer(player);
    setIsClaimDialogOpen(true);
  };

  const handleClaimPlayer = async (userId: string) => {
    if (!selectedPlayer) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ user_id: userId })
        .eq('id', selectedPlayer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player connected to user successfully",
      });

      setIsClaimDialogOpen(false);
      setSelectedPlayer(null);
      fetchPlayers();
    } catch (error) {
      console.error('Error connecting player:', error);
      toast({
        title: "Error",
        description: "Failed to connect player to user",
        variant: "destructive",
      });
    }
  };

  const handleUnclaimPlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({ user_id: null, avatar_url: null })
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player disconnected from user successfully",
      });

      fetchPlayers();
    } catch (error) {
      console.error('Error disconnecting player:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect player from user",
        variant: "destructive",
      });
    }
  };

  const getProfileByUserId = (userId: string | null | undefined) => {
    if (!userId) return null;
    return profiles.find(profile => profile.user_id === userId);
  };

  const generateAvatar = async (player: Player) => {
    try {
      setGeneratingAvatarFor(player.id);
      
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          playerName: player.name,
          playerId: player.id 
        }
      });

      if (error) throw error;

      if (data?.success && data?.avatarUrl) {
        // Add cache-busting parameter to force image refresh
        const cacheBustUrl = `${data.avatarUrl}?t=${Date.now()}`;
        
        // Update player avatar in database
        await supabase
          .from('players')
          .update({ avatar_url: cacheBustUrl })
          .eq('id', player.id);

        toast({
          title: "Avatar generated!",
          description: `Generated hilarious avatar for ${player.name}`,
        });
        
        // Force immediate UI refresh
        fetchPlayers();
      } else {
        throw new Error('Failed to generate avatar');
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast({
        title: "Error",
        description: `Failed to generate avatar for ${player.name}`,
        variant: "destructive",
      });
    } finally {
      setGeneratingAvatarFor(null);
    }
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
                <Alert className="mb-4">
                  <AlertDescription>
                    ℹ️ Statistics (points, games, wins, etc.) are automatically calculated from game results. Only the player name can be edited.
                  </AlertDescription>
                </Alert>
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
          {players.map((player) => {
            const profile = getProfileByUserId(player.user_id);
            return (
              <div key={player.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback>
                        {player.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{player.name}</h4>
                      <p className="text-sm text-gray-600">
                        {player.points} pts • {player.games_played} games • {player.wins}W-{player.draws}D-{player.losses}L
                      </p>
                      {profile && (
                        <p className="text-xs text-blue-600 mt-1">
                          Connected to: {profile.display_name || profile.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDialog(player)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateAvatar(player)}
                    disabled={generatingAvatarFor === player.id}
                    title="Generate Avatar"
                  >
                    {generatingAvatarFor === player.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                  </Button>
                  {player.user_id ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleUnclaimPlayer(player.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openClaimDialog(player)}>
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleDelete(player.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {players.length === 0 && (
            <Alert>
              <AlertDescription>
                No players found. Add your first player to get started.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Player-User Connection Dialog */}
        <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Connect Player to User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connect "{selectedPlayer?.name}" to a user account:
              </p>
              <Select onValueChange={handleClaimPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {profiles
                    .filter(profile => !players.some(p => p.user_id === profile.user_id))
                    .map((profile) => (
                      <SelectItem key={profile.user_id} value={profile.user_id}>
                        {profile.display_name || profile.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsClaimDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminPlayerManagement;