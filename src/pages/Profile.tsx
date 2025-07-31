import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Home, Loader2 } from 'lucide-react';
import { PlayerClaim } from '@/components/PlayerClaim';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Player } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const Profile = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserPlayer, setCurrentUserPlayer] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPlayers();
    }
  }, [user]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('points', { ascending: false });

      if (error) throw error;
      
      // Convert database format to component format with avatar support
      const formattedPlayers: Player[] = (data || []).map(player => ({
        id: player.id,
        name: player.name,
        points: Number(player.points),
        gamesPlayed: player.games_played,
        wins: player.wins,
        draws: player.draws,
        losses: player.losses,
        mvpAwards: player.mvp_awards,
        goalDifference: player.goal_difference,
        user_id: player.user_id,
        avatar_url: player.avatar_url,
      }));
      
      setPlayers(formattedPlayers);

      // Find current user's claimed player
      if (user) {
        const userPlayer = formattedPlayers.find(player => player.user_id === user.id);
        setCurrentUserPlayer(userPlayer || null);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to fetch players",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Redirect if not authenticated
  if (!user && !isLoading) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Welcome, {user?.email}
              </div>
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Main Page
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PlayerClaim 
          players={players}
          currentUserPlayer={currentUserPlayer}
          onPlayerClaimed={fetchPlayers}
        />
      </div>
    </div>
  );
};

export default Profile;