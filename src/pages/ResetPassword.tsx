import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const t = setTimeout(() => setReady((r) => {
      if (!r) setError('This reset link is invalid or has expired. Request a new one from the sign-in page.');
      return r;
    }), 4000);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = fd.get('password') as string;
    const confirm = fd.get('confirm') as string;
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast({ title: 'Password updated', description: "You're signed in." });
    navigate('/', { replace: true });
  };

  return (
    <div className="page-container auth-shell flex items-center justify-center p-4">
      <div className="aurora-blob aurora-blob-emerald animate-aurora -left-24 top-12 h-72 w-72" />
      <Card className="auth-panel">
        <CardHeader className="hero-panel items-center border-b border-white/10 bg-white/[0.02] px-6 py-8 text-center">
          <div className="hero-glow" />
          <div className="relative flex items-center justify-center gap-3">
            <div className="header-brand-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <div className="section-kicker mb-1">Player access</div>
              <CardTitle className="header-wordmark">Set a new password</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="password" type="password" placeholder="New password (min. 6 characters)" minLength={6} required disabled={!ready} />
            <Input name="confirm" type="password" placeholder="Confirm new password" minLength={6} required disabled={!ready} />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={!ready || submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
