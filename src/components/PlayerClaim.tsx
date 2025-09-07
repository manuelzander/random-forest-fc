import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, UserPlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDefaultAvatar } from '@/hooks/useDefaultAvatar';

import { Player } from '@/types';

interface PlayerClaimProps {
  players: Player[];
  currentUserPlayer: Player | null;
  onPlayerClaimed: () => void;
}

export const PlayerClaim = ({ players, currentUserPlayer, onPlayerClaimed }: PlayerClaimProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unclaimDialogOpen, setUnclaimDialogOpen] = useState(false);
  const [createPlayerDialogOpen, setCreatePlayerDialogOpen] = useState(false);
  const [deletePlayerDialogOpen, setDeletePlayerDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use default avatar for current user's player
  const { avatarUrl } = useDefaultAvatar({
    playerId: currentUserPlayer?.id || '',
    playerName: currentUserPlayer?.name || '',
    currentAvatarUrl: currentUserPlayer?.avatar_url
  });

  const handleClaimPlayer = async (playerId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ user_id: user.id })
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: "Player claimed successfully!",
        description: "You can now manage this player's avatar.",
      });
      
      onPlayerClaimed();
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
      const { error } = await supabase
        .from('players')
        .update({ user_id: null, avatar_url: null })
        .eq('id', currentUserPlayer.id);

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
      onPlayerClaimed();
    } catch (error) {
      console.error('Error unclaiming player:', error);
      toast({
        title: "Error",
        description: "Failed to unclaim player. Please try again.",
        variant: "destructive",
      });
    }
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
      onPlayerClaimed();
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
      // Refresh the data which should set currentUserPlayer to null
      await onPlayerClaimed();
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

  const availablePlayers = players.filter(player => !player.user_id);

  return (
    <div className="space-y-6">
      {currentUserPlayer ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Your Player
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>
                  {currentUserPlayer.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{currentUserPlayer.name}</h3>
                <p className="text-sm text-muted-foreground">Your claimed player</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={openUnclaimDialog}
              >
                <span className="hidden sm:inline">Unclaim Player</span>
                <span className="sm:hidden">Unclaim</span>
              </Button>
              {currentUserPlayer.created_by === user?.id && (
                <Button
                  variant="outline"
                  onClick={() => setDeletePlayerDialogOpen(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete Player</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Get Your Player</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Dialog open={createPlayerDialogOpen} onOpenChange={setCreatePlayerDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="default"
                    onClick={() => {
                      setNewPlayerName(user?.user_metadata?.display_name || user?.email?.split('@')[0] || '');
                      setCreatePlayerDialogOpen(true);
                    }}
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
                <div className="grid gap-2">
                  {availablePlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {player.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClaimPlayer(player.id)}
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
            <AlertDialogTitle>Unclaim Player</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unclaim "{currentUserPlayer?.name}"? This will remove your connection to this player and delete your custom avatar. This action cannot be undone.
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
            <AlertDialogTitle>Delete Player</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{currentUserPlayer?.name}"? This will remove all stats, data, and custom avatars. This action cannot be undone.
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