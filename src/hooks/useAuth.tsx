import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userRole: 'admin' | 'user' | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    userRole: null,
  });

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        // Fetch user role when session changes
        if (session?.user) {
          setTimeout(async () => {
            try {
              const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

              if (!error && data) {
                setAuthState(prev => ({
                  ...prev,
                  userRole: data.role,
                  isLoading: false,
                }));
              } else {
                setAuthState(prev => ({
                  ...prev,
                  userRole: 'user',
                  isLoading: false,
                }));
              }
            } catch (err) {
              console.error('Error fetching user role:', err);
              setAuthState(prev => ({
                ...prev,
                userRole: 'user',
                isLoading: false,
              }));
            }
          }, 0);
        } else {
          setAuthState(prev => ({
            ...prev,
            userRole: null,
            isLoading: false,
          }));
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        setTimeout(async () => {
          try {
            const { data, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();

            if (!error && data) {
              setAuthState(prev => ({
                ...prev,
                userRole: data.role,
                isLoading: false,
              }));
            } else {
              setAuthState(prev => ({
                ...prev,
                userRole: 'user',
                isLoading: false,
              }));
            }
          } catch (err) {
            console.error('Error fetching user role:', err);
            setAuthState(prev => ({
              ...prev,
              userRole: 'user',
              isLoading: false,
            }));
          }
        }, 0);
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    // Supabase returns a fake success (no email sent) when the address is already registered
    const alreadyRegistered = !error && !!data.user && (data.user.identities?.length ?? 0) === 0;
    return { error, alreadyRegistered };
  };

  const signOut = async () => {
    try {
      console.log('Attempting to sign out...');
      const { error } = await supabase.auth.signOut({
        scope: 'local'
      });
      console.log('Sign out result:', { error });
      return { error };
    } catch (err) {
      console.error('Sign out exception:', err);
      return { error: err };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
};