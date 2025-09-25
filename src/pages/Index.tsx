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
  const fetchPlayers = async () => {
    try {
      console.log('Starting player fetch...');

      // Clear any invalid session first
      await supabase.auth.getSession();

      // Use a direct query to calculate stats directly in the database for better performance
      const {
        data,
        error
      } = await supabase.from('players').select(`
          *,
          player_stats:games(*)
        `);
      if (error) {
        console.error('Players fetch error:', error);
        throw error;
      }

      // Calculate stats client-side but more efficiently
      const formattedPlayers = await calculatePlayerStatsOptimized(data || []);

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
  const calculatePlayerStatsOptimized = async (players: any[]): Promise<Player[]> => {
    // Get all games data once
    const {
      data: gamesData,
      error: gamesError
    } = await supabase.from('games').select('team1_players, team2_players, team1_goals, team2_goals, mvp_player, created_at').order('created_at', {
      ascending: false
    });
    if (gamesError) throw gamesError;

    // Pre-compute game results for efficiency
    const gameResults = new Map<string, {
      wins: number;
      draws: number;
      losses: number;
      mvpAwards: number;
      goalDiff: number;
    }>();
    players.forEach(player => {
      gameResults.set(player.id, {
        wins: 0,
        draws: 0,
        losses: 0,
        mvpAwards: 0,
        goalDiff: 0
      });
    });

    // Single pass through games data
    if (gamesData) {
      gamesData.forEach(game => {
        // Process team1 players
        game.team1_players.forEach((playerId: string) => {
          const stats = gameResults.get(playerId);
          if (stats) {
            const goalDiff = game.team1_goals - game.team2_goals;
            stats.goalDiff += goalDiff;
            if (game.team1_goals > game.team2_goals) stats.wins++;else if (game.team1_goals === game.team2_goals) stats.draws++;else stats.losses++;
            if (game.mvp_player === playerId) stats.mvpAwards++;
          }
        });

        // Process team2 players
        game.team2_players.forEach((playerId: string) => {
          const stats = gameResults.get(playerId);
          if (stats) {
            const goalDiff = game.team2_goals - game.team1_goals;
            stats.goalDiff += goalDiff;
            if (game.team2_goals > game.team1_goals) stats.wins++;else if (game.team2_goals === game.team1_goals) stats.draws++;else stats.losses++;
            if (game.mvp_player === playerId) stats.mvpAwards++;
          }
        });
      });
    }

    // Convert to final format
    return players.map(player => {
      const stats = gameResults.get(player.id) || {
        wins: 0,
        draws: 0,
        losses: 0,
        mvpAwards: 0,
        goalDiff: 0
      };
      const points = stats.wins * 3 + stats.draws + stats.mvpAwards;
      return {
        id: player.id,
        name: player.name,
        points,
        games_played: stats.wins + stats.draws + stats.losses,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        mvp_awards: stats.mvpAwards,
        goal_difference: stats.goalDiff,
        user_id: player.user_id,
        avatar_url: player.avatar_url
      };
    });
  };
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

      // Refresh player stats from the database after saving the game
      fetchPlayers();
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