import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { api } from '@/lib/api';

export default function ProtectedRoute({ children, featureKey }: { children: ReactNode; featureKey?: string }) {
  const { user, isLoading } = useAuth();
  const featureAccess = useQuery({
    queryKey: ['saas-feature-access'],
    queryFn: () => api.get<{ success: boolean; data: Record<string, boolean> }>('/saas/features/access').then(response => response.data),
    enabled: Boolean(user && featureKey),
    staleTime: 30_000,
  });

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

  if (featureKey && featureAccess.isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-white/40">Checking module access...</div>;
  }

  if (featureKey && featureAccess.data && featureAccess.data[featureKey] === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-3"><h1 className="text-xl font-semibold text-white">Module unavailable</h1><p className="text-sm leading-6 text-white/50">Your company subscription does not include this module. Contact your administrator to request access.</p><Redirect to="/app/dashboard" /></div>
      </div>
    );
  }

  return <>{children}</>;
}
