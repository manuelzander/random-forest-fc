import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, Users, History, LogOut, Loader2, Home, Newspaper, Calendar, PoundSterling } from 'lucide-react';
import AdminPlayerManagement from '@/components/AdminPlayerManagement';
import AdminGameManagement from '@/components/AdminGameManagement';
import AdminNewsManagement from '@/components/AdminNewsManagement';
import AdminScheduleManagement from '@/components/AdminScheduleManagement';
import AdminDebtManagement from '@/components/AdminDebtManagement';
import GamesList from '@/components/GamesList';
import ScheduleDisplay from '@/components/ScheduleDisplay';
import SeasonBanner from '@/components/SeasonBanner';
import { useSeasons } from '@/hooks/useSeasons';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { user, userRole, isLoading, signOut } = useAuth();
  const { archiveSeasonId } = useSeasons();
  const { toast } = useToast();

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

  // Redirect if not authenticated
  if (!user && !isLoading) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect if not admin
  if (user && userRole !== 'admin' && !isLoading) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <Loader2 className="h-8 w-8 animate-spin" />
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
              <div className="header-brand-admin">
                <Shield className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Panel</h1>
            </div>
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Welcome, {user?.email}
                </div>
               <div className="flex items-center gap-1 sm:gap-2">
                 <Link to="/">
                   <Button variant="outline" size="sm">
                     <Home className="h-4 w-4 sm:mr-2" />
                     <span className="hidden sm:inline">Home</span>
                   </Button>
                 </Link>
                 <Button variant="outline" size="sm" onClick={handleSignOut}>
                   <LogOut className="h-4 w-4 sm:mr-2" />
                   <span className="hidden sm:inline">Sign Out</span>
                 </Button>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-main-content space-y-6">
        <SeasonBanner className="max-w-3xl mx-auto" />

        <Tabs defaultValue="players" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl mx-auto">
            <TabsTrigger value="players" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Players</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Games</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="debt" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <PoundSterling className="h-4 w-4" />
              <span className="hidden sm:inline">Debt</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline">News</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <AdminPlayerManagement />
          </TabsContent>

          <TabsContent value="games">
            {archiveSeasonId ? <GamesList archiveSeasonId={archiveSeasonId} /> : <AdminGameManagement />}
          </TabsContent>

          <TabsContent value="schedule">
            {archiveSeasonId ? <ScheduleDisplay archiveSeasonId={archiveSeasonId} /> : <AdminScheduleManagement />}
          </TabsContent>

          <TabsContent value="debt">
            <AdminDebtManagement archiveSeasonId={archiveSeasonId} />
          </TabsContent>

          <TabsContent value="news">
            <AdminNewsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;