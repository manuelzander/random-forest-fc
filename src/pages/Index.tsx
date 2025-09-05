
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Player, GameInput as GameInputType, NewsItem } from '@/types';
import PlayerTable from '@/components/PlayerTable';
import GameInput from '@/components/GameInput';
import GamesList from '@/components/GamesList';
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
  const [totalGames, setTotalGames] = useState(0);

  useEffect(() => {
    fetchPlayers();
    fetchGamesCount();
  }, []);

  const fetchGamesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalGames(count || 0);
    } catch (error) {
      console.error('Error fetching games count:', error);
    }
  };

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
      console.log('Starting player fetch...');
      
      // Clear any invalid session first
      await supabase.auth.getSession();
      
      const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .order('points', { ascending: false });

      console.log('Players fetch result:', { data, error, count: data?.length });
      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      // Convert database format to component format with avatar support
      const formattedPlayers: Player[] = (data || []).map(player => ({
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
          team1_captain: gameData.team1Captain,
          team2_captain: gameData.team2Captain,
          mvp_player: gameData.mvpPlayer,
          youtube_url: gameData.youtubeUrl || null,
        }]);

      if (gameError) throw gameError;

      // Refresh player stats from the database after saving the game
      fetchPlayers();
      
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
      <div className="loading-container">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-inner">
            <div className="flex items-center gap-3">
              <div className="header-brand-primary">
                <Trophy className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Random Forest FC</h1>
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
       <div className="page-main-content space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{players.length}</div>
                <div className="text-sm text-muted-foreground">Total Players</div>
              </CardContent>
            </Card>
             <Card>
               <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {totalGames}
                  </div>
                 <div className="text-sm text-muted-foreground">Games Played</div>
               </CardContent>
             </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ranking">Home</TabsTrigger>
              <TabsTrigger value="games">Games</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
            </TabsList>
            <TabsContent value="ranking">
              <PlayerTable players={players} />
            </TabsContent>
            <TabsContent value="games">
              <GamesList />
            </TabsContent>
            <TabsContent value="news">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Newspaper className="h-6 w-6" />
                    Latest News
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {newsLoading ? (
                    <div className="text-center py-8">
                      <div>Loading news...</div>
                    </div>
                   ) : news.length === 0 ? (
                     <div className="text-center py-8">
                       <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                       <p className="text-muted-foreground">No news articles yet.</p>
                     </div>
                  ) : (
                    <div className="space-y-4">
                      {news.map((article) => (
                        <div key={article.id} className="p-4 border rounded-lg bg-card">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-semibold text-foreground flex-1 pr-4">{article.title}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(article.created_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                          {article.content && (
                            <p className="text-muted-foreground leading-relaxed">{article.content}</p>
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
