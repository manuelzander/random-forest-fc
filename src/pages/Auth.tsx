import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const { user, isLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (user && !isLoading) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
    }

    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;

    const { error } = await signUp(email, password, displayName);

    if (error) {
      setError(error.message);
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container auth-shell flex items-center justify-center p-4">
      <div className="aurora-blob aurora-blob-emerald animate-aurora -left-24 top-12 h-72 w-72" />
      <div className="aurora-blob aurora-blob-purple animate-aurora -right-24 bottom-8 h-80 w-80" />
      <Card className="auth-panel">
        <CardHeader className="hero-panel items-center border-b border-white/10 bg-white/[0.02] px-6 py-8 text-center">
          <div className="hero-glow" />
          <div className="relative flex items-center justify-center gap-3 mb-3">
            <div className="header-brand-primary">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="section-kicker mb-1">Player access</div>
              <CardTitle className="header-wordmark">Random Forest FC</CardTitle>
            </div>
          </div>
          <p className="relative text-muted-foreground text-sm sm:text-base">Sign in to manage your league</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="sr-only">Email</Label>
                  <Input 
                    id="signin-email"
                    name="email" 
                    type="email" 
                    placeholder="Email"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="sr-only">Password</Label>
                  <Input 
                    id="signin-password"
                    name="password" 
                    type="password" 
                    placeholder="Password"
                    required 
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="sr-only">Display Name</Label>
                  <Input 
                    id="signup-name"
                    name="displayName" 
                    type="text" 
                    placeholder="Display name"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="sr-only">Email</Label>
                  <Input 
                    id="signup-email"
                    name="email" 
                    type="email" 
                    placeholder="Email"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="sr-only">Password</Label>
                  <Input 
                    id="signup-password"
                    name="password" 
                    type="password" 
                    placeholder="Password (min. 6 characters)"
                    required 
                    minLength={6}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;