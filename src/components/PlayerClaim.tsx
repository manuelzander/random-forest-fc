import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck } from 'lucide-react';
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
                onClick={handleUnclaimPlayer}
              >
                Unclaim Player
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Claim a Player</CardTitle>
          </CardHeader>
          <CardContent>
            {availablePlayers.length > 0 ? (
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
                      onClick={() => handleClaimPlayer(player.id)}
                    >
                      Claim
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No available players to claim.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};