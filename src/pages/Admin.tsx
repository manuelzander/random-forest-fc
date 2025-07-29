import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, Users, History, Settings, LogOut, Loader2 } from 'lucide-react';
import AdminPlayerManagement from '@/components/AdminPlayerManagement';
import AdminGameManagement from '@/components/AdminGameManagement';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const { user, userRole, isLoading, signOut } = useAuth();
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
              <div className="p-2 bg-red-600 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Welcome, {user?.email}
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="players" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Players
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Games
            </TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <AdminPlayerManagement />
          </TabsContent>

          <TabsContent value="games">
            <AdminGameManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;