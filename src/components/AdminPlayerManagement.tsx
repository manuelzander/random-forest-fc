import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Users, UserCheck, UserX, Wand2, Loader2, ImageOff, UserCog, GitMerge, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculatePlayerDebt, calculateGuestDebt, type GameScheduleForDebt, type SignupForDebt } from '@/utils/debtCalculation';

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
  debt: number;
  credit: number;
}

interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  favorite_club?: string;
  credit?: number;
}

interface Guest {
  id: string;
  name: string;
  credit: number;
  phone?: string;
  notes?: string;
  created_at: string;
  signupsCount?: number;
  debt: number;
}

interface OrphanedGuestSignup {
  guest_name: string;
  signupsCount: number;
  gameScheduleIds: string[];
  debt: number;
}

const AdminPlayerManagement = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [orphanedSignups, setOrphanedSignups] = useState<OrphanedGuestSignup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [generatingAvatarFor, setGeneratingAvatarFor] = useState<string | null>(null);
  const [removingAvatarFor, setRemovingAvatarFor] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteGuestDialogOpen, setDeleteGuestDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [removeAvatarDialogOpen, setRemoveAvatarDialogOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const [playerToDisconnect, setPlayerToDisconnect] = useState<Player | null>(null);
  const [playerToRemoveAvatar, setPlayerToRemoveAvatar] = useState<Player | null>(null);
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);
  const [isSavingGuest, setIsSavingGuest] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [guestToMerge, setGuestToMerge] = useState<Guest | null>(null);
  const [selectedMergePlayer, setSelectedMergePlayer] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
    fetchProfiles();
    fetchGuests();
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
    
    // Fetch scheduled games for debt calculation
    const { data: scheduledGames, error: scheduledError } = await supabase
      .from('games_schedule')
      .select('*')
      .order('scheduled_at', { ascending: false });

    if (scheduledError) throw scheduledError;

    // Fetch all signups for debt calculation
    const { data: signupsData, error: signupsError } = await supabase
      .from('games_schedule_signups')
      .select(`
        *,
        players:player_id (id, user_id)
      `)
      .order('signed_up_at', { ascending: true });

    if (signupsError) throw signupsError;
    
    // Fetch all profiles to get credit info
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, credit');
    
    const formattedPlayers = (playersData || []).map(player => {
      // Calculate stats for this player from completed games
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

      // Calculate debt using shared logic
      const gamesForDebt: GameScheduleForDebt[] = (scheduledGames || []).map(g => ({
        id: g.id,
        pitch_size: g.pitch_size
      }));
      const signupsForDebt: SignupForDebt[] = (signupsData || []).map((s: any) => ({
        id: s.id,
        game_schedule_id: s.game_schedule_id,
        player_id: s.player_id,
        guest_id: s.guest_id,
        signed_up_at: s.signed_up_at
      }));
      const debt = calculatePlayerDebt(player.id, gamesForDebt, signupsForDebt);
      
      // Get credit from profile
      const playerProfile = profilesData?.find(p => p.user_id === player.user_id);
      const credit = playerProfile?.credit || 0;
      
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
        debt,
        credit,
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
        .select('id, user_id, email, display_name, favorite_club, credit')
        .order('display_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchGuests = async () => {
    try {
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .order('name');

      if (guestsError) throw guestsError;

      // Fetch scheduled games for debt calculation
      const { data: scheduledGames, error: scheduledError } = await supabase
        .from('games_schedule')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (scheduledError) throw scheduledError;

      // Fetch all signups for debt calculation
      const { data: signupsData, error: signupsError } = await supabase
        .from('games_schedule_signups')
        .select('*')
        .order('signed_up_at', { ascending: true });

      if (signupsError) throw signupsError;

      // Prepare data for shared debt calculation
      const gamesForDebt: GameScheduleForDebt[] = (scheduledGames || []).map(g => ({
        id: g.id,
        pitch_size: g.pitch_size
      }));
      const signupsForDebt: SignupForDebt[] = (signupsData || []).map((s: any) => ({
        id: s.id,
        game_schedule_id: s.game_schedule_id,
        player_id: s.player_id,
        guest_id: s.guest_id,
        guest_name: s.guest_name,
        signed_up_at: s.signed_up_at
      }));

      // Build a set of normalized guest names from the guests table
      const guestNamesSet = new Set(
        (guestsData || []).map(g => g.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );

      const formattedGuests = (guestsData || []).map(guest => {
        // Calculate debt using shared logic - pass guest name for fallback matching
        const debt = calculateGuestDebt(guest.id, gamesForDebt, signupsForDebt, guest.name);
        
        // Count signups for this guest (by guest_id or by name)
        const normalizedName = guest.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const signupsCount = signupsForDebt.filter(s => 
          s.guest_id === guest.id || 
          (!s.guest_id && s.guest_name && s.guest_name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName)
        ).length;

        return {
          ...guest,
          credit: Number(guest.credit || 0),
          signupsCount,
          debt
        };
      });

      // Find orphaned guest signups (is_guest=true, guest_id=null, guest_name not matching any guest)
      const orphanedMap = new Map<string, { count: number; gameScheduleIds: string[]; originalName: string; signupIds: string[] }>();
      (signupsData || []).forEach((s: any) => {
        if (s.is_guest && !s.guest_id && s.guest_name) {
          const normalizedName = s.guest_name.toLowerCase().replace(/[^a-z0-9]/g, '');
          // Check if this name matches any existing guest
          if (!guestNamesSet.has(normalizedName)) {
            const existing = orphanedMap.get(normalizedName);
            if (existing) {
              existing.count++;
              existing.signupIds.push(s.id);
              if (!existing.gameScheduleIds.includes(s.game_schedule_id)) {
                existing.gameScheduleIds.push(s.game_schedule_id);
              }
            } else {
              orphanedMap.set(normalizedName, {
                count: 1,
                gameScheduleIds: [s.game_schedule_id],
                originalName: s.guest_name,
                signupIds: [s.id]
              });
            }
          }
        }
      });

      const orphanedList: OrphanedGuestSignup[] = Array.from(orphanedMap.entries()).map(([normalizedName, data]) => {
        // Calculate debt for this orphaned guest using the shared logic with guest_name fallback
        const debt = calculateGuestDebt('orphaned-placeholder', gamesForDebt, signupsForDebt, data.originalName);
        return {
          guest_name: data.originalName,
          signupsCount: data.count,
          gameScheduleIds: data.gameScheduleIds,
          debt
        };
      });

      setGuests(formattedGuests);
      setOrphanedSignups(orphanedList);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch guests",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSavingPlayer) return; // Prevent double submission
    
    const formData = new FormData(e.currentTarget);
    
    const playerData = {
      name: formData.get('name') as string,
    };

    try {
      setIsSavingPlayer(true);
      
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
    } finally {
      setIsSavingPlayer(false);
    }
  };

  const openDeleteDialog = (player: Player) => {
    setPlayerToDelete(player);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!playerToDelete) return;

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerToDelete.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Player deleted successfully",
      });
      fetchPlayers();
      setDeleteDialogOpen(false);
      setPlayerToDelete(null);
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

  const openDisconnectDialog = (player: Player) => {
    setPlayerToDisconnect(player);
    setDisconnectDialogOpen(true);
  };

  const openRemoveAvatarDialog = (player: Player) => {
    setPlayerToRemoveAvatar(player);
    setRemoveAvatarDialogOpen(true);
  };

  const handleUnclaimPlayer = async () => {
    if (!playerToDisconnect) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ user_id: null, avatar_url: null })
        .eq('id', playerToDisconnect.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player disconnected from user successfully",
      });

      fetchPlayers();
      setDisconnectDialogOpen(false);
      setPlayerToDisconnect(null);
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

  const handleGuestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSavingGuest) return;
    
    const formData = new FormData(e.currentTarget);
    
    const guestData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      notes: formData.get('notes') as string || null,
      credit: parseFloat(formData.get('credit') as string) || 0,
    };

    try {
      setIsSavingGuest(true);
      
      if (editingGuest) {
        const { error } = await supabase
          .from('guests')
          .update(guestData)
          .eq('id', editingGuest.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Guest updated successfully",
        });
      }

      setIsGuestDialogOpen(false);
      setEditingGuest(null);
      fetchGuests();
    } catch (error) {
      console.error('Error saving guest:', error);
      toast({
        title: "Error",
        description: "Failed to save guest",
        variant: "destructive",
      });
    } finally {
      setIsSavingGuest(false);
    }
  };

  const openDeleteGuestDialog = (guest: Guest) => {
    setGuestToDelete(guest);
    setDeleteGuestDialogOpen(true);
  };

  const handleDeleteGuest = async () => {
    if (!guestToDelete) return;

    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestToDelete.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Guest deleted successfully",
      });
      fetchGuests();
      setDeleteGuestDialogOpen(false);
      setGuestToDelete(null);
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast({
        title: "Error",
        description: "Failed to delete guest",
        variant: "destructive",
      });
    }
  };

  const openMergeDialog = (guest: Guest) => {
    setGuestToMerge(guest);
    setSelectedMergePlayer('');
    setMergeDialogOpen(true);
  };

  const handleMergeGuest = async () => {
    if (!guestToMerge || !selectedMergePlayer) return;

    try {
      // Use atomic RPC function for transaction safety
      const { data, error } = await supabase.rpc('merge_guest_to_player', {
        p_guest_id: guestToMerge.id,
        p_player_id: selectedMergePlayer
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; signups_transferred?: number };
      
      if (!result?.success) {
        throw new Error(result?.error || 'Merge failed');
      }

      toast({
        title: "Success",
        description: `Guest "${guestToMerge.name}" merged into player successfully. ${result.signups_transferred || 0} signups transferred.`,
      });

      setMergeDialogOpen(false);
      setGuestToMerge(null);
      setSelectedMergePlayer('');
      fetchGuests();
      fetchPlayers();
    } catch (error) {
      console.error('Error merging guest:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to merge guest into player",
        variant: "destructive",
      });
    }
  };

  const removeAvatar = async () => {
    if (!playerToRemoveAvatar) return;

    try {
      setRemovingAvatarFor(playerToRemoveAvatar.id);
      
      // Delete the avatar from storage if it exists
      if (playerToRemoveAvatar.avatar_url) {
        try {
          // Extract filename from the URL
          const urlParts = playerToRemoveAvatar.avatar_url.split('/');
          const filename = urlParts[urlParts.length - 1];
          
          await supabase.storage
            .from('avatars')
            .remove([`${playerToRemoveAvatar.id}/${filename}`]);
        } catch (storageError) {
          console.error('Error deleting avatar from storage:', storageError);
          // Continue with database update even if storage deletion fails
        }
      }
      
      // Remove avatar_url from database
      const { error } = await supabase
        .from('players')
        .update({ avatar_url: null })
        .eq('id', playerToRemoveAvatar.id);

      if (error) throw error;

      toast({
        title: "Avatar removed",
        description: `Removed avatar for ${playerToRemoveAvatar.name}`,
      });
      
      // Refresh player data
      await fetchPlayers();
      
      // Update state immediately
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.id === playerToRemoveAvatar.id 
            ? { ...p, avatar_url: null }
            : p
        )
      );
      
      setRemoveAvatarDialogOpen(false);
      setPlayerToRemoveAvatar(null);
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Error",
        description: `Failed to remove avatar for ${playerToRemoveAvatar.name}`,
        variant: "destructive",
      });
    } finally {
      setRemovingAvatarFor(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSavingPlayer}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingPlayer}>
                    {isSavingPlayer ? 'Saving...' : `${editingPlayer ? 'Update' : 'Add'} Player`}
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
                  <Avatar key={`${player.id}-${player.avatar_url}`} className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback>
                      {player.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/player/${player.id}`} 
                        className="hover:text-primary transition-colors"
                      >
                        <h4 className="font-semibold text-sm sm:text-base truncate">{player.name}</h4>
                      </Link>
                      {player.user_id ? (
                        <Badge className="text-xs h-5 px-1.5 bg-green-100 text-green-700 border-0">
                          <UserCheck className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Verified</span>
                        </Badge>
                      ) : (
                        <Badge className="text-xs h-5 px-1.5 bg-orange-100 text-orange-700 border-0">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Unverified</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {player.games_played} games played
                    </p>
                    {profile && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        <span className="hidden sm:inline">Connected to: </span>
                        {profile.email}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                      <p>
                        Debt: <span className="font-medium text-destructive">£{player.debt.toFixed(2)}</span>
                      </p>
                      <p>
                        Credit: <span className="font-medium text-green-600">£{player.credit.toFixed(2)}</span>
                      </p>
                      <p>
                        Net: <span className={`font-bold ${
                          (player.credit - player.debt) >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          £{Math.abs(player.credit - player.debt).toFixed(2)}
                        </span>
                      </p>
                    </div>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRemoveAvatarDialog(player)}
                    disabled={removingAvatarFor === player.id || !player.avatar_url}
                    title="Remove Avatar"
                  >
                    {removingAvatarFor === player.id ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <ImageOff className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                  {player.user_id ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openDisconnectDialog(player)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openClaimDialog(player)}>
                      <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openDeleteDialog(player)}>
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

        {/* Guest Management Section */}
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-semibold">
              Guests ({guests.length})
              {orphanedSignups.length > 0 && (
                <span className="text-orange-600 ml-2">+ {orphanedSignups.length} orphaned</span>
              )}
            </h3>
          </div>

          <div className="space-y-2">
            {guests.map((guest) => (
              <div key={guest.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 bg-muted">
                    <AvatarFallback>
                      {guest.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm sm:text-base truncate">{guest.name}</h4>
                      <Badge className="text-xs h-5 px-1.5 bg-blue-100 text-blue-700 border-0">
                        <Users className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Guest</span>
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {guest.signupsCount || 0} signups
                    </p>
                    {guest.phone && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        Phone: {guest.phone}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                      <p>
                        Debt: <span className="font-medium text-destructive">£{guest.debt.toFixed(2)}</span>
                      </p>
                      <p>
                        Credit: <span className="font-medium text-green-600">£{guest.credit.toFixed(2)}</span>
                      </p>
                      <p>
                        Net: <span className={`font-bold ${
                          (guest.credit - guest.debt) >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          £{Math.abs(guest.credit - guest.debt).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-1 sm:gap-2 flex-shrink-0">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setEditingGuest(guest);
                      setIsGuestDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => openMergeDialog(guest)}
                    title="Merge into Player"
                  >
                    <GitMerge className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => openDeleteGuestDialog(guest)}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {guests.length === 0 && orphanedSignups.length === 0 && (
              <Alert>
                <AlertDescription>
                  No guests found.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Orphaned Guest Signups */}
          {orphanedSignups.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base sm:text-lg font-semibold text-orange-600 mb-2">
                Orphaned Guest Signups ({orphanedSignups.length})
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                These signups have no linked guest record. Create a guest or merge them with an existing player.
              </p>
              <div className="space-y-2">
                {orphanedSignups.map((orphan) => (
                  <div key={orphan.guest_name} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-orange-200 bg-orange-50/50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 bg-orange-100">
                        <AvatarFallback className="text-orange-700 text-lg">
                          {orphan.guest_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm sm:text-base truncate">{orphan.guest_name}</h4>
                          <Badge className="text-xs h-5 px-1.5 bg-orange-100 text-orange-700 border-0">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Orphaned</span>
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {orphan.signupsCount} signup{orphan.signupsCount !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                          <p>
                            Debt: <span className="font-medium text-destructive">£{orphan.debt.toFixed(2)}</span>
                          </p>
                          <p>
                            Credit: <span className="font-medium text-green-600">£0.00</span>
                          </p>
                          <p>
                            Net: <span className="font-bold text-red-600">£{orphan.debt.toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Guest Edit Dialog */}
        <Dialog open={isGuestDialogOpen} onOpenChange={setIsGuestDialogOpen}>
          <DialogContent className="max-w-md mx-2 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                Edit Guest
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-name">Name</Label>
                <Input
                  id="guest-name"
                  name="name"
                  defaultValue={editingGuest?.name || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-phone">Phone</Label>
                <Input
                  id="guest-phone"
                  name="phone"
                  defaultValue={editingGuest?.phone || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-credit">Credit</Label>
                <Input
                  id="guest-credit"
                  name="credit"
                  type="number"
                  step="0.01"
                  defaultValue={editingGuest?.credit || 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-notes">Notes</Label>
                <Input
                  id="guest-notes"
                  name="notes"
                  defaultValue={editingGuest?.notes || ''}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsGuestDialogOpen(false)} disabled={isSavingGuest}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingGuest}>
                  {isSavingGuest ? 'Saving...' : 'Update Guest'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Guest Confirmation Dialog */}
        <AlertDialog open={deleteGuestDialogOpen} onOpenChange={setDeleteGuestDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Guest</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{guestToDelete?.name}"? This will also remove all their game signups. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteGuest} className="bg-red-600 hover:bg-red-700">
                Delete Guest
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Merge Guest Dialog */}
        <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
          <DialogContent className="max-w-md mx-2 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                Merge Guest into Player
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="space-y-1">
                  <div><strong>Guest to merge:</strong> {guestToMerge?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {guestToMerge?.signupsCount || 0} signups • £{guestToMerge?.debt.toFixed(2)} debt • £{guestToMerge?.credit.toFixed(2)} credit
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Select Player to merge into:</Label>
                <Select value={selectedMergePlayer} onValueChange={setSelectedMergePlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select a player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((player) => {
                        const profile = getProfileByUserId(player.user_id);
                        return (
                          <SelectItem key={player.id} value={player.id}>
                            <div className="flex items-center justify-between gap-2">
                              <span>{player.name}</span>
                              {!player.user_id && (
                                <Badge variant="outline" className="text-xs ml-2">No Profile</Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedMergePlayer && guestToMerge && (() => {
                const targetPlayer = players.find(p => p.id === selectedMergePlayer);
                const newCredit = (targetPlayer?.credit || 0) + guestToMerge.credit;
                const newDebt = (targetPlayer?.debt || 0) + guestToMerge.debt;
                const newNetBalance = newCredit - newDebt;
                
                return (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <p className="text-sm font-semibold">Merge Preview:</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Game signups:</span>
                        <span className="font-medium">+{guestToMerge.signupsCount || 0}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Debt transfer:</span>
                        <span className="font-medium text-red-600">+£{guestToMerge.debt.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credit transfer:</span>
                        <span className="font-medium text-green-600">+£{guestToMerge.credit.toFixed(2)}</span>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex justify-between font-semibold">
                          <span>Player's new balance:</span>
                          <span className={newNetBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            £{Math.abs(newNetBalance).toFixed(2)} {newNetBalance >= 0 ? 'credit' : 'owed'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          (Debt: £{newDebt.toFixed(2)} - Credit: £{newCredit.toFixed(2)})
                        </div>
                      </div>
                    </div>

                    {!targetPlayer?.user_id && guestToMerge.credit > 0 && (
                      <Alert className="py-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Player has no profile. Credit (£{guestToMerge.credit.toFixed(2)}) cannot be transferred. Connect player to a user first or credit will be lost.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      After merge, guest "{guestToMerge.name}" will be permanently deleted.
                    </p>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setMergeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleMergeGuest}
                  disabled={!selectedMergePlayer}
                  className="bg-primary hover:bg-primary/90"
                >
                  <GitMerge className="h-4 w-4 mr-2" />
                  Confirm Merge
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Player</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{playerToDelete?.name}"? This action cannot be undone and will also affect all game statistics.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete Player
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Disconnect Confirmation Dialog */}
        <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Player</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to disconnect "{playerToDisconnect?.name}" from their user account? This will remove their custom avatar and profile connection.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUnclaimPlayer} className="bg-orange-600 hover:bg-orange-700">
                Disconnect Player
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Avatar Confirmation Dialog */}
        <AlertDialog open={removeAvatarDialogOpen} onOpenChange={setRemoveAvatarDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Avatar</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the avatar for "{playerToRemoveAvatar?.name}"? This will delete their current avatar image and they will display with initials only.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={removeAvatar} className="bg-red-600 hover:bg-red-700">
                Remove Avatar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AdminPlayerManagement;