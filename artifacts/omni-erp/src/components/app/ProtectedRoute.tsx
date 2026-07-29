import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/contexts/auth';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground/50">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  return <>{children}</>;
}
