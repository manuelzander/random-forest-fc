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
  favorite_club?: string;
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
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .order('name');

    if (playersError) throw playersError;
    
    // Fetch all games to calculate stats
    const { data: gamesData, error: gamesError } = await supabase
      .from('games')
      .select('*');

    if (gamesError) throw gamesError;
    
    const formattedPlayers = (playersData || []).map(player => {
      // Calculate stats for this player
      let points = 0;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let mvp_awards = 0;
      let goal_difference = 0;
      
      if (gamesData) {
        gamesData.forEach(game => {
          const isTeam1 = game.team1_players.includes(player.id);
          const isTeam2 = game.team2_players.includes(player.id);
          
          if (isTeam1 || isTeam2) {
            const playerGoals = isTeam1 ? game.team1_goals : game.team2_goals;
            const opponentGoals = isTeam1 ? game.team2_goals : game.team1_goals;
            
            goal_difference += playerGoals - opponentGoals;
            
            if (playerGoals > opponentGoals) {
              wins++;
              points += 3;
            } else if (playerGoals === opponentGoals) {
              draws++;
              points += 1;
            } else {
              losses++;
            }
            
            if (game.mvp_player === player.id) {
              mvp_awards++;
            }
          }
        });
      }
      
      return {
        id: player.id,
        name: player.name,
        points,
        games_played: wins + draws + losses,
        wins,
        draws,
        losses,
        mvp_awards,
        goal_difference,
        user_id: player.user_id,
        avatar_url: player.avatar_url,
      };
    });
    
    // Sort by points (highest first)
    formattedPlayers.sort((a, b) => b.points - a.points);
    
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
        .select('id, user_id, email, display_name, favorite_club')
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
      
      // Get the player's profile to include favorite club
      let favoriteClub = '';
      if (player.user_id) {
        const profile = getProfileByUserId(player.user_id);
        favoriteClub = profile?.favorite_club || '';
      }
      
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { 
          playerName: player.name,
          playerId: player.id,
          favoriteClub
        }
      });

      if (error) throw error;

      if (data?.success && data?.avatarUrl) {
        // Update player avatar in database
        await supabase
          .from('players')
          .update({ avatar_url: data.avatarUrl })
          .eq('id', player.id);

        toast({
          title: "Avatar generated!",
          description: `Generated hilarious avatar for ${player.name}`,
        });
        
        // Force complete refresh of player data
        await fetchPlayers();
        
        // Force image cache refresh by updating the state immediately
        setPlayers(prevPlayers => 
          prevPlayers.map(p => 
            p.id === player.id 
              ? { ...p, avatar_url: data.avatarUrl }
              : p
          )
        );
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
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Player Management</span>
          <span className="sm:hidden">Players</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Players ({players.length})</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openDialog()}>
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Player</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-2 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
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
              <div key={player.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Avatar key={`${player.id}-${player.avatar_url}`} className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback>
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm sm:text-base truncate">{player.name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {player.points} pts • {player.games_played} games
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {player.wins}W-{player.draws}D-{player.losses}L
                    </p>
                    {profile && (
                      <p className="text-xs text-blue-600 mt-1 truncate">
                        <span className="hidden sm:inline">Connected to: </span>
                        {profile.display_name || profile.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-center gap-1 sm:gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => openDialog(player)}>
                    <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateAvatar(player)}
                    disabled={generatingAvatarFor === player.id}
                    title="Generate Avatar"
                  >
                    {generatingAvatarFor === player.id ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                  {player.user_id ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleUnclaimPlayer(player.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openClaimDialog(player)}>
                      <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleDelete(player.id)}>
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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