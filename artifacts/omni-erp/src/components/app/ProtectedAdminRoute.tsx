import { type ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAdminAuth } from '@/contexts/adminAuth';
import { Shield, Loader2 } from 'lucide-react';

export default function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { admin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center animate-pulse">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-white/40">Verifying admin session…</p>
        </div>
      </div>
    );
  }

  if (!admin) return <Redirect to="/admin-login" />;

  return <>{children}</>;
}
