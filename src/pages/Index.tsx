
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Player, GameInput as GameInputType, NewsItem } from '@/types';
import PlayerTable from '@/components/PlayerTable';
import GameInput from '@/components/GameInput';
import { PlayerClaim } from '@/components/PlayerClaim';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, BarChart, Shield, LogIn, LogOut, Settings, User, Calendar, Newspaper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const Index = () => {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserPlayer, setCurrentUserPlayer] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('ranking');
  const [isLoading, setIsLoading] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchNews = async () => {
    try {
      setNewsLoading(true);
      const { data, error } = await (supabase as any)
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Error",
        description: "Failed to fetch news",
        variant: "destructive",
      });
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
    }
  }, [activeTab]);

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
      setIsLoading(false);
    }
  };

  const handleGameSubmit = async (gameData: GameInputType) => {
    try {
      // Save game to database
      const { error: gameError } = await supabase
        .from('games')
        .insert([{
          team1_goals: gameData.team1Goals,
          team2_goals: gameData.team2Goals,
          team1_players: gameData.team1Players,
          team2_players: gameData.team2Players,
          mvp_player: gameData.mvpPlayer,
        }]);

      if (gameError) throw gameError;

      // Update player statistics
      const updatedPlayers = players.map(player => {
        const isInTeam1 = gameData.team1Players.includes(player.id);
        const isInTeam2 = gameData.team2Players.includes(player.id);
        
        if (!isInTeam1 && !isInTeam2) return player;

        // Calculate points for this game
        let gamePoints = 0;
        const isWinner = (isInTeam1 && gameData.team1Goals > gameData.team2Goals) || 
                        (isInTeam2 && gameData.team2Goals > gameData.team1Goals);
        const isDraw = gameData.team1Goals === gameData.team2Goals;
        
        if (isWinner) gamePoints += 3;
        else if (isDraw) gamePoints += 1;

        // Add MVP bonus
        if (gameData.mvpPlayer === player.id) gamePoints += 2;

        // Calculate new stats
        const newGamesPlayed = player.gamesPlayed + 1;
        const newWins = isWinner ? player.wins + 1 : player.wins;
        const newDraws = isDraw ? player.draws + 1 : player.draws;
        const newLosses = (!isWinner && !isDraw) ? player.losses + 1 : player.losses;
        const newMvpAwards = gameData.mvpPlayer === player.id ? player.mvpAwards + 1 : player.mvpAwards;
        const newPoints = Math.round((player.points + gamePoints) * 10) / 10;
        const newGoalDifference = isInTeam1 ? 
          player.goalDifference + (gameData.team1Goals - gameData.team2Goals) :
          player.goalDifference + (gameData.team2Goals - gameData.team1Goals);

        return {
          ...player,
          gamesPlayed: newGamesPlayed,
          wins: newWins,
          draws: newDraws,
          losses: newLosses,
          mvpAwards: newMvpAwards,
          points: newPoints,
          goalDifference: newGoalDifference,
        };
      });

      // Update all players in the database
      for (const player of updatedPlayers) {
        if (gameData.team1Players.includes(player.id) || gameData.team2Players.includes(player.id)) {
          const { error: updateError } = await supabase
            .from('players')
            .update({
              points: player.points,
              games_played: player.gamesPlayed,
              wins: player.wins,
              draws: player.draws,
              losses: player.losses,
              mvp_awards: player.mvpAwards,
              goal_difference: player.goalDifference,
            })
            .eq('id', player.id);

          if (updateError) {
            console.error('Error updating player:', updateError);
          }
        }
      }

      setPlayers(updatedPlayers.sort((a, b) => b.points - a.points));
      
      toast({
        title: "Game Recorded!",
        description: "The match result has been successfully recorded.",
      });
    } catch (error) {
      console.error('Error saving game:', error);
      toast({
        title: "Error",
        description: "Failed to save game",
        variant: "destructive",
      });
    }
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
        <div>Loading...</div>
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
                   <Button variant="outline" size="sm" onClick={handleSignOut}>
                     <LogOut className="h-4 w-4 mr-2" />
                     Sign Out
                   </Button>
                 </div>
               ) : (
                 <Link to="/auth">
                   <Button variant="outline" size="sm">
                     <LogIn className="h-4 w-4 mr-2" />
                     Sign In
                   </Button>
                 </Link>
               )}
            </div>
          </div>
        </div>
      </div>

       {/* Main Content */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Card>
             <CardContent className="p-4 text-center">
               <div className="text-2xl font-bold text-green-600">{players.length}</div>
               <div className="text-sm text-gray-600">Total Players</div>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-4 text-center">
               <div className="text-2xl font-bold text-blue-600">
                 {players.reduce((sum, p) => sum + p.gamesPlayed, 0)}
               </div>
               <div className="text-sm text-gray-600">Games Played</div>
             </CardContent>
           </Card>
         </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
            </TabsList>
            <TabsContent value="ranking">
              <PlayerTable players={players} />
            </TabsContent>
            <TabsContent value="news">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5" />
                    Latest News
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {newsLoading ? (
                    <div className="text-center py-8">
                      <div>Loading news...</div>
                    </div>
                  ) : news.length === 0 ? (
                    <div className="text-center py-8">
                      <Newspaper className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">No news articles yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {news.map((article) => (
                        <div key={article.id} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{article.title}</h3>
                            <Badge variant="secondary" className="ml-2">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(article.created_at), 'MMM d, yyyy')}
                            </Badge>
                          </div>
                          {article.content && (
                            <p className="text-gray-700 leading-relaxed">{article.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
       </div>
    </div>
  );
};

export default Index;
