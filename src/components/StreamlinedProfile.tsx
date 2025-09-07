import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, User, UserPlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDefaultAvatar } from '@/hooks/useDefaultAvatar';
import ProfileSkillsEditor from '@/components/ProfileSkillsEditor';
import AccountDetailsEditor from '@/components/AccountDetailsEditor';
import { Player } from '@/types';

interface StreamlinedProfileProps {
  user: any;
  onDataRefresh: () => void;
}

export const StreamlinedProfile = ({ user, onDataRefresh }: StreamlinedProfileProps) => {
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserPlayer, setCurrentUserPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [unclaimDialogOpen, setUnclaimDialogOpen] = useState(false);
  const [createPlayerDialogOpen, setCreatePlayerDialogOpen] = useState(false);
  const [deletePlayerDialogOpen, setDeletePlayerDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const profileEditorRef = useRef<{ handleSave: () => void }>(null);

  // Use default avatar for current user's player
  const { avatarUrl } = useDefaultAvatar({
    playerId: currentUserPlayer?.id || '',
    playerName: currentUserPlayer?.name || '',
    currentAvatarUrl: currentUserPlayer?.avatar_url
  });

  useEffect(() => {
    if (user) {
      fetchPlayers();
    }
  }, [user]);

  const fetchPlayers = async () => {
    try {
      console.log('StreamlinedProfile: Fetching players for user:', user?.id);
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
      
      const formattedPlayers: Player[] = (playersData || []).map(player => {
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

      // Find current user's claimed player
      const userPlayer = formattedPlayers.find(player => player.user_id === user.id);
      setCurrentUserPlayer(userPlayer || null);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to fetch player data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimPlayer = async (playerId: string) => {
    if (!user) return;

    try {
      console.log('Attempting to claim player:', playerId, 'for user:', user.id);
      
      const { error } = await supabase
        .from('players')
        .update({ user_id: user.id })
        .eq('id', playerId);

      console.log('Claim result:', { error });

      if (error) throw error;

      toast({
        title: "Player claimed successfully!",
        description: "You can now manage this player's profile.",
      });
      
      fetchPlayers();
    } catch (error) {
      console.error('Error claiming player:', error);
      toast({
        title: "Error",
        description: "Failed to claim player. Please try again.",
        variant: "destructive",
      });
    }
  };

  const openUnclaimDialog = () => {
    setUnclaimDialogOpen(true);
  };

  const handleUnclaimPlayer = async () => {
    if (!currentUserPlayer) return;

    try {
      console.log('Attempting to unclaim player:', currentUserPlayer.id, 'for user:', user?.id);
      
      const { error } = await supabase
        .from('players')
        .update({ user_id: null, avatar_url: null })
        .eq('id', currentUserPlayer.id);

      console.log('Unclaim result:', { error });

      if (error) throw error;

      // Delete avatar from storage if exists
      if (currentUserPlayer.avatar_url) {
        const filename = currentUserPlayer.avatar_url.split('/').pop();
        if (filename) {
          await supabase.storage
            .from('avatars')
            .remove([`${user?.id}/${filename}`]);
        }
      }

      toast({
        title: "Player unclaimed",
        description: "You are no longer connected to this player.",
      });
      
      setUnclaimDialogOpen(false);
      fetchPlayers();
    } catch (error) {
      console.error('Error unclaiming player:', error);
      toast({
        title: "Error",
        description: "Failed to unclaim player. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    profileEditorRef.current?.handleSave();
  };

  const handleSaveComplete = () => {
    setIsSaving(false);
  };

  const handleCreatePlayer = async () => {
    if (!user || !newPlayerName.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('players')
        .insert([{
          name: newPlayerName.trim(),
          user_id: user.id,
          created_by: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Player created successfully!",
        description: "You can now manage your player's profile.",
      });
      
      setCreatePlayerDialogOpen(false);
      setNewPlayerName('');
      fetchPlayers();
    } catch (error) {
      console.error('Error creating player:', error);
      toast({
        title: "Error",
        description: "Failed to create player. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!currentUserPlayer) return;

    setIsDeleting(true);
    try {
      // Delete avatar from storage if exists
      if (currentUserPlayer.avatar_url) {
        const filename = currentUserPlayer.avatar_url.split('/').pop();
        if (filename) {
          await supabase.storage
            .from('avatars')
            .remove([`${user?.id}/${filename}`]);
        }
      }

      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', currentUserPlayer.id)
        .eq('user_id', user?.id); // Extra safety check

      if (error) throw error;

      toast({
        title: "Player deleted",
        description: "Your player has been permanently deleted.",
      });
      
      setDeletePlayerDialogOpen(false);
      fetchPlayers();
    } catch (error) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error", 
        description: "Failed to delete player. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="loading-container">Loading your profile...</div>;
  }

  const availablePlayers = players.filter(player => !player.user_id);

  return (
    <div className="space-y-6">
      {/* Player Section - Claim or Manage */}
      {currentUserPlayer ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Your Player Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Player Overview */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{currentUserPlayer.name}</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-green-600 text-white hover:bg-green-700"
                  size="sm"
                >
                  {isSaving ? 'Saving...' : <><span className="hidden sm:inline">Save Profile</span><span className="sm:hidden">Save</span></>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openUnclaimDialog}
                  className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                >
                  <span className="hidden sm:inline">Unclaim Player</span>
                  <span className="sm:hidden">Unclaim</span>
                </Button>
                {currentUserPlayer.created_by === user?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletePlayerDialogOpen(true)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Delete Player</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Profile Skills Editor - includes avatar upload */}
            <ProfileSkillsEditor 
              ref={profileEditorRef}
              userId={user.id}
              playerData={currentUserPlayer}
              onProfileUpdate={fetchPlayers}
              onSave={handleSaveComplete}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Get Your Player
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Create a new player or connect to an existing one to manage your profile and avatar.
            </p>
            
            <div className="flex gap-2">
              <Dialog open={createPlayerDialogOpen} onOpenChange={setCreatePlayerDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default"
                    onClick={() => {
                      setNewPlayerName(user?.user_metadata?.display_name || user?.email?.split('@')[0] || '');
                      setCreatePlayerDialogOpen(true);
                    }}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create New Player
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            
            {availablePlayers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-sm text-muted-foreground px-2">or claim existing</span>
                  <div className="h-px bg-border flex-1" />
                </div>
                <div className="grid gap-3">
                  {availablePlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {player.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{player.name}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClaimPlayer(player.id)}
                        className="border-green-500 text-green-600 hover:bg-green-50"
                      >
                        Claim
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountDetailsEditor userEmail={user.email || ''} />
        </CardContent>
      </Card>
      {/* Create Player Dialog */}
      <Dialog open={createPlayerDialogOpen} onOpenChange={setCreatePlayerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Your Player</DialogTitle>
            <DialogDescription>
              Create a new player profile for yourself. You can always change the name later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="playerName">Player Name</Label>
              <Input
                id="playerName"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreatePlayerDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlayer}
              disabled={!newPlayerName.trim() || isCreating}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isCreating ? 'Creating...' : 'Create Player'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unclaim Confirmation Dialog */}
      <AlertDialog open={unclaimDialogOpen} onOpenChange={setUnclaimDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Unclaim Player</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unclaim "{currentUserPlayer?.name}"? This will remove your connection to this player and delete your custom avatar. This action cannot be undone!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnclaimPlayer} className="bg-red-600 hover:bg-red-700">
              Unclaim Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Player Confirmation Dialog */}
      <AlertDialog open={deletePlayerDialogOpen} onOpenChange={setDeletePlayerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Delete Player</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{currentUserPlayer?.name}"? This will remove all stats, data, and custom avatars. This action cannot be undone!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePlayer} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Player'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};