import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Player, GameInput as GameInputType, NewsItem } from '@/types';
import PlayerTable from '@/components/PlayerTable';
import GameInput from '@/components/GameInput';
import GamesList from '@/components/GamesList';
import AchievementsTable from '@/components/AchievementsTable';
import ScheduleDisplay from '@/components/ScheduleDisplay';
import { PlayerClaim } from '@/components/PlayerClaim';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, BarChart, Shield, LogIn, LogOut, Settings, User, Calendar, Newspaper, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
const Index = () => {
  const {
    user,
    userRole,
    signOut
  } = useAuth();
  const isMobile = useIsMobile();
  const {
    toast
  } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserPlayer, setCurrentUserPlayer] = useState<any>(null);
  
  // Add caching to prevent unnecessary reloads
  const [playersCache, setPlayersCache] = useState<{ data: Player[], timestamp: number } | null>(null);
  const CACHE_DURATION = 30000; // 30 seconds
  
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
      const {
        count,
        error
      } = await supabase.from('games').select('*', {
        count: 'exact',
        head: true
      });
      if (error) throw error;
      setTotalGames(count || 0);
    } catch (error) {
      console.error('Error fetching games count:', error);
    }
  };
  const fetchNews = async () => {
    try {
      setNewsLoading(true);
      const {
        data,
        error
      } = await (supabase as any).from('news').select('*').eq('published', true).order('created_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Error",
        description: "Failed to fetch news",
        variant: "destructive"
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
  const fetchPlayers = async (useCache = true) => {
    // Check cache first to avoid unnecessary database calls
    if (useCache && playersCache && Date.now() - playersCache.timestamp < CACHE_DURATION) {
      setPlayers(playersCache.data);
      if (user) {
        const userPlayer = playersCache.data.find(player => player.user_id === user.id);
        setCurrentUserPlayer(userPlayer || null);
      }
      setIsLoading(false);
      return;
    }

    try {
      console.log('Starting player fetch...');

      // Clear any invalid session first
      await supabase.auth.getSession();

      // Use the database function for much better performance
      const { data, error } = await supabase.rpc('get_player_stats');
      
      if (error) {
        console.error('Players fetch error:', error);
        throw error;
      }

      const formattedPlayers: Player[] = (data || []).map((player: any) => ({
        id: player.id,
        name: player.name,
        user_id: player.user_id,
        avatar_url: player.avatar_url,
        points: player.points || 0,
        games_played: player.games_played || 0,
        wins: player.wins || 0,
        draws: player.draws || 0,
        losses: player.losses || 0,
        mvp_awards: player.mvp_awards || 0,
        goal_difference: player.goal_difference || 0,
        created_by: null,
        badges: null
      }));

      // Sort by points first, then PPG, then goal difference
      formattedPlayers.sort((a, b) => {
        // First sort by points (descending)
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        // If points are equal, sort by points per game (descending)
        const aPPG = a.games_played > 0 ? a.points / a.games_played : 0;
        const bPPG = b.games_played > 0 ? b.points / b.games_played : 0;
        if (bPPG !== aPPG) {
          return bPPG - aPPG;
        }

        // If PPG is equal, sort by goal difference (descending)
        return b.goal_difference - a.goal_difference;
      });
      
      // Update cache
      setPlayersCache({ data: formattedPlayers, timestamp: Date.now() });
      
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
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  // Removed calculatePlayerStatsOptimized function - now using database function
  const handleGameSubmit = async (gameData: GameInputType) => {
    try {
      // Save game to database
      const {
        error: gameError
      } = await supabase.from('games').insert([{
        team1_goals: gameData.team1Goals,
        team2_goals: gameData.team2Goals,
        team1_players: gameData.team1Players,
        team2_players: gameData.team2Players,
        team1_captain: gameData.team1Captain,
        team2_captain: gameData.team2Captain,
        mvp_player: gameData.mvpPlayer,
        youtube_url: gameData.youtubeUrl || null
      }]);
      if (gameError) throw gameError;

      // Clear cache and refresh player stats from the database after saving the game
      setPlayersCache(null); // Clear cache
      fetchPlayers(false); // Force refresh, bypass cache
      toast({
        title: "Game Recorded!",
        description: "The match result has been successfully recorded."
      });
    } catch (error) {
      console.error('Error saving game:', error);
      toast({
        title: "Error",
        description: "Failed to save game",
        variant: "destructive"
      });
    }
  };
  const handleSignOut = async () => {
    const {
      error
    } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };
  if (isLoading) {
    return <div className="loading-container">
        <div>Loading...</div>
      </div>;
  }
  return <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-inner">
            <div className="flex items-center gap-3">
              <div className="header-brand-primary">
                <Trophy className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {isMobile ? 'RFFC' : 'Random Forest FC'}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               {user ? <div className="flex items-center gap-1 sm:gap-2">
                    <Link to="/profile">
                     <Button variant="outline" size="sm">
                       <User className="h-4 w-4 sm:mr-2" />
                       <span className="hidden sm:inline">Profile</span>
                     </Button>
                   </Link>
                   {userRole === 'admin' && <Link to="/admin">
                       <Button variant="outline" size="sm">
                         <Shield className="h-4 w-4 sm:mr-2" />
                         <span className="hidden sm:inline">Admin</span>
                       </Button>
                     </Link>}
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sign Out</span>
                    </Button>
                  </div> : <Link to="/auth">
                    <Button variant="outline" size="sm">
                      <LogIn className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Button>
                  </Link>}
            </div>
          </div>
        </div>
      </div>

       {/* Main Content */}
        <div className="page-main-content space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="px-4 py-2 text-center">
                <div className="text-2xl font-bold text-primary">{players.length}</div>
                <div className="text-sm text-muted-foreground">Total Players</div>
              </CardContent>
            </Card>
             <Card>
               <CardContent className="px-4 py-2 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {totalGames}
                  </div>
                 <div className="text-sm text-muted-foreground">Games Played</div>
               </CardContent>
             </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="ranking" className="text-xs sm:text-sm">Ranking</TabsTrigger>
              <TabsTrigger value="achievements" className="text-xs sm:text-sm">Trophies</TabsTrigger>
              <TabsTrigger value="games" className="text-xs sm:text-sm">Games</TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs sm:text-sm">Schedule</TabsTrigger>
              <TabsTrigger value="news" className="text-xs sm:text-sm">News</TabsTrigger>
            </TabsList>
            <TabsContent value="ranking">
              <PlayerTable players={players} />
            </TabsContent>
            <TabsContent value="achievements">
              <AchievementsTable players={players} />
            </TabsContent>
            <TabsContent value="games">
              <GamesList />
            </TabsContent>
            <TabsContent value="schedule">
              <ScheduleDisplay />
            </TabsContent>
            <TabsContent value="news">
              <Card>
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg py-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                    <Newspaper className="h-6 w-6" />
                    Latest News
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {newsLoading ? <div className="text-center py-8">
                      <div>Loading news...</div>
                    </div> : news.length === 0 ? <div className="text-center py-8">
                       <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                       <p className="text-muted-foreground">No news articles yet.</p>
                     </div> : <div className="space-y-4">
                       {news.map(article => <div key={article.id} className="p-4 border rounded-lg bg-card">
                           <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                             <h3 className="text-lg font-semibold text-foreground flex-1">{article.title}</h3>
                             <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                               <Calendar className="h-3 w-3" />
                               {format(new Date(article.created_at), 'MMM d, yyyy')}
                             </div>
                           </div>
                           {article.content && <p className="text-muted-foreground leading-relaxed text-sm sm:text-base whitespace-pre-wrap">{article.content}</p>}
                         </div>)}
                     </div>}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
       </div>
    </div>;
};
export default Index;