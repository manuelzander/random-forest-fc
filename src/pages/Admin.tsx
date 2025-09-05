import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, Users, History, Settings, LogOut, Loader2, Home, Newspaper, Wand2 } from 'lucide-react';
import AdminPlayerManagement from '@/components/AdminPlayerManagement';
import AdminGameManagement from '@/components/AdminGameManagement';
import AdminNewsManagement from '@/components/AdminNewsManagement';
import { AvatarGenerator } from '@/components/AvatarGenerator';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Admin = () => {
  const { user, userRole, isLoading, signOut } = useAuth();
  const { toast } = useToast();

  // Fetch players for avatar generation
  const { data: players = [], refetch: refetchPlayers } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, avatar_url')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

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
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            </div>
             <div className="flex items-center gap-4">
               <div className="text-sm text-muted-foreground">
                 Welcome, {user?.email}
               </div>
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-main-content">
        <Tabs defaultValue="avatars" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="avatars" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Avatars
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Players
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Games
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              News
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avatars">
            <AvatarGenerator 
              players={players} 
              onAvatarsGenerated={() => refetchPlayers()} 
            />
          </TabsContent>

          <TabsContent value="players">
            <AdminPlayerManagement />
          </TabsContent>

          <TabsContent value="games">
            <AdminGameManagement />
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