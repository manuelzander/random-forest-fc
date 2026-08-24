import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePlayerAchievements, clearPlayerAchievementsCache } from '@/hooks/usePlayerAchievements';
import { Player, GameInput as GameInputType, NewsItem } from '@/types';
import PlayerTable from '@/components/PlayerTable';
import GameInput from '@/components/GameInput';
import GamesList from '@/components/GamesList';
import AchievementsTable from '@/components/AchievementsTable';
import ScheduleDisplay from '@/components/ScheduleDisplay';
import { PlayerClaim } from '@/components/PlayerClaim';
import SeasonBanner from '@/components/SeasonBanner';
import { useSeasons } from '@/hooks/useSeasons';
import { useArchivedAchievements } from '@/hooks/useArchivedAchievements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, BarChart, Shield, LogIn, LogOut, Settings, User, Calendar, Newspaper, Award, Users } from 'lucide-react';
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
  const { players, isLoading, error, refetch } = usePlayerAchievements();
  const [activeTab, setActiveTab] = useState('ranking');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [totalGames, setTotalGames] = useState(0);
  const { archiveSeasonId } = useSeasons();
  const { players: archivedPlayers, isLoading: archivedLoading } = useArchivedAchievements(archiveSeasonId);
  const displayedPlayers = archiveSeasonId ? archivedPlayers : players;

  useEffect(() => {
    fetchGamesCount();
  }, [archiveSeasonId]);

  const fetchGamesCount = async () => {
    try {
      const query = archiveSeasonId
        ? supabase.from('archived_games').select('*', { count: 'exact', head: true }).eq('season_id', archiveSeasonId)
        : supabase.from('games').select('*', { count: 'exact', head: true });
      const { count, error } = await query;
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
  
  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: "Failed to fetch players", variant: "destructive" });
    }
  }, [error, toast]);

  const handleGameSubmit = async (gameData: GameInputType) => {
    try {
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

      clearPlayerAchievementsCache();
      refetch();
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

  return (
    <div className="page-container">
      {/* Aurora Background Effects */}
      <div className="aurora-blob aurora-blob-emerald top-[-10%] left-[-10%] w-[40%] h-[40%]" />
      <div className="aurora-blob aurora-blob-blue bottom-[-10%] right-[-10%] w-[50%] h-[50%]" />

      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-inner">
            <div className="flex items-center gap-3">
              <div className="header-brand-primary">
                <Trophy className="h-6 w-6" />
              </div>
              <h1 className="font-display text-xl sm:text-3xl text-foreground tracking-wide">
                {isMobile ? 'RFFC' : 'Random Forest FC'}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? <div className="flex items-center gap-1 sm:gap-2">
                  <Link to="/profile">
                    <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground">
                      <User className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Profile</span>
                    </Button>
                  </Link>
                  {userRole === 'admin' && <Link to="/admin">
                      <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground">
                        <Shield className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Admin</span>
                      </Button>
                    </Link>}
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground">
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div> : <Link to="/auth">
                  <Button variant="outline" size="sm" className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground">
                    <LogIn className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Button>
                </Link>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-main-content space-y-8 relative z-10">
        {/* Season Banner */}
        <SeasonBanner />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card p-6 flex flex-col">
            <span className="text-muted-foreground text-xs uppercase tracking-widest">Total Players</span>
            <span className="font-display text-4xl text-foreground mt-1">{displayedPlayers.length}</span>
            <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: '75%' }} />
            </div>
          </div>
          <div className="glass-card p-6 flex flex-col">
            <span className="text-muted-foreground text-xs uppercase tracking-widest">Games Played</span>
            <span className="font-display text-4xl text-foreground mt-1">{totalGames}</span>
            <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[hsl(var(--aurora-blue))]" style={{ width: '60%' }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ranking" className="text-xs sm:text-base">Ranking</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs sm:text-base">Trophies</TabsTrigger>
            <TabsTrigger value="games" className="text-xs sm:text-base">Games</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs sm:text-base">Schedule</TabsTrigger>
            <TabsTrigger value="news" className="text-xs sm:text-base">News</TabsTrigger>
          </TabsList>
          <TabsContent value="ranking">
            {archivedLoading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : <PlayerTable players={displayedPlayers} />}
          </TabsContent>
          <TabsContent value="achievements">
            {archivedLoading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : <AchievementsTable players={displayedPlayers} />}
          </TabsContent>
          <TabsContent value="games">
            <GamesList archiveSeasonId={archiveSeasonId} />
          </TabsContent>
          <TabsContent value="schedule">
            <ScheduleDisplay archiveSeasonId={archiveSeasonId} />
          </TabsContent>
          <TabsContent value="news">
            <Card className="glass-card border-0">
              <CardHeader className="card-header-gradient-primary py-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-display tracking-wide">
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
                   {news.map(article => <div key={article.id} className="p-4 rounded-xl border border-white/10 bg-white/5">
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
    </div>
  );
};

export default Index;
