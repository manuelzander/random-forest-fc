import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { User, Home, Loader2, LogOut } from 'lucide-react';
import { StreamlinedProfile } from '@/components/StreamlinedProfile';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const Profile = () => {
  const { user, isLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleDataRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Redirect if not authenticated
  if (!user && !isLoading) {
    return <Navigate to="/auth" replace />;
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
              <div className="header-brand-profile">
                <User className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Profile</h1>
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
      <div className="page-main-content">
        <StreamlinedProfile 
          user={user} 
          onDataRefresh={handleDataRefresh}
          key={refreshKey}
        />
      </div>
    </div>
  );
};

export default Profile;