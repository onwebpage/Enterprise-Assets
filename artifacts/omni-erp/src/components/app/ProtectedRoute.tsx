import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { api } from '@/lib/api';
import BrandLogo from '@/components/BrandLogo';

export default function ProtectedRoute({ children, featureKey }: { children: ReactNode; featureKey?: string }) {
  const { user, isLoading, sessionError, retrySession } = useAuth();
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
          <BrandLogo className="w-10 h-10 rounded-xl shadow-lg shadow-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground/50">Loading…</p>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold text-white">Can’t verify your session</h1>
          <p role="alert" className="text-sm leading-6 text-white/55">{sessionError}</p>
          <button type="button" onClick={retrySession} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Try again</button>
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
