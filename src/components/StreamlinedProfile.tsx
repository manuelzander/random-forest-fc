import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCheck, User } from 'lucide-react';
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

  const handleUnclaimPlayer = async () => {
    if (!currentUserPlayer) return;

    // Show security warning
    const confirmed = window.confirm(
      `⚠️ Warning\n\nAre you sure you want to unclaim "${currentUserPlayer.name}"?\n\nThis will remove your connection to this player and delete your custom avatar. This action cannot be undone!`
    );

    if (!confirmed) return;

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
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnclaimPlayer}
                  className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                >
                  Unclaim Player
                </Button>
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
              Claim Your Player
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Connect your account to a player to manage your profile and avatar.
            </p>
            {availablePlayers.length > 0 ? (
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
                      onClick={() => handleClaimPlayer(player.id)}
                      className="bg-green-600 text-white hover:bg-green-700"
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

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountDetailsEditor userEmail={user.email || ''} />
        </CardContent>
      </Card>
    </div>
  );
};