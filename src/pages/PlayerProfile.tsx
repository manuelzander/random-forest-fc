import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Target, Calendar, User, MapPin, Clock, Home, LogOut, Shield, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface PlayerData {
  id: string;
  name: string;
  points: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
  mvp_awards: number;
  goal_difference: number;
  avatar_url?: string;
  badges?: any[];
  user_id?: string;
}

interface ProfileData {
  bio?: string;
  football_skills?: string[];
  favorite_position?: string;
  years_playing?: number;
}

const PlayerProfile = () => {
  const { playerId } = useParams();
  const { toast } = useToast();
  const { user, userRole, signOut } = useAuth();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
    }
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch player data
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerError) throw playerError;
      setPlayer({
        ...playerData,
        badges: Array.isArray(playerData.badges) ? playerData.badges : []
      });

      // Fetch profile data if player has a user_id
      if (playerData.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('bio, football_skills, favorite_position, years_playing')
          .eq('user_id', playerData.user_id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else {
          setProfile({
            ...profileData,
            football_skills: Array.isArray(profileData.football_skills) ? profileData.football_skills as string[] : []
          });
        }
      }
    } catch (error) {
      console.error('Error fetching player:', error);
      toast({
        title: "Error",
        description: "Failed to fetch player data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWinRate = () => {
    if (!player || player.games_played === 0) return 0;
    return Math.round((player.wins / player.games_played) * 100);
  };

  const getBadges = () => {
    const badges = [];
    
    if (player?.mvp_awards >= 5) {
      badges.push({ icon: '👑', name: 'MVP Champion', description: '5+ MVP Awards' });
    }
    if (player?.goal_difference >= 10) {
      badges.push({ icon: '⚽', name: 'Goal Machine', description: '10+ Goal Difference' });
    }
    if (player && getWinRate() >= 70) {
      badges.push({ icon: '🏆', name: 'Winner', description: '70%+ Win Rate' });
    }
    if (player?.games_played >= 20) {
      badges.push({ icon: '🎯', name: 'Veteran', description: '20+ Games Played' });
    }

    return badges;
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div>Loading player...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Player Not Found</h2>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ranking
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const badges = getBadges();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Random Forest FC</h1>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link to="/profile">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  {userRole === 'admin' && (
                    <Link to="/admin">
                      <Button variant="outline" size="sm">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Link to="/">
                    <Button variant="outline" size="sm">
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/">
                    <Button variant="outline" size="sm">
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="outline" size="sm">
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Player Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={player.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {player.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{player.name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    {player.points} Points
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {getWinRate()}% Win Rate
                  </div>
                  {profile?.favorite_position && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.favorite_position}
                    </div>
                  )}
                  {profile?.years_playing && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {profile.years_playing} years playing
                    </div>
                  )}
                </div>
                {profile?.bio && (
                  <p className="text-gray-700 mb-3">{profile.bio}</p>
                )}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge, index) => (
                      <Badge key={index} className="bg-yellow-100 text-yellow-800 flex items-center gap-1 px-1.5 py-0.5 text-xs">
                        <span>{badge.icon}</span>
                        {badge.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{player.games_played}</div>
                  <div className="text-sm text-gray-600">Games Played</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{player.mvp_awards}</div>
                  <div className="text-sm text-gray-600">MVP Awards</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {player.games_played > 0 ? (Number(player.points) / player.games_played).toFixed(1) : '0.0'}
                  </div>
                  <div className="text-sm text-gray-600">PPG</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {player.games_played > 0 ? ((player.wins / player.games_played) * 100).toFixed(1) : '0.0'}%
                  </div>
                  <div className="text-sm text-gray-600">Win Rate</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-700">{player.wins}</div>
                  <div className="text-xs text-gray-600">Wins</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-700">{player.draws}</div>
                  <div className="text-xs text-gray-600">Draws</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-700">{player.losses}</div>
                  <div className="text-xs text-gray-600">Losses</div>
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {player.goal_difference > 0 ? '+' : ''}{player.goal_difference}
                </div>
                <div className="text-sm text-gray-600">Goal Difference</div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Football Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.football_skills && profile.football_skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.football_skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No skills listed yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;