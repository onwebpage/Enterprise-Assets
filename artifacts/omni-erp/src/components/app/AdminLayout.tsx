/**
 * Standalone layout for the Super Admin panel.
 * Makes zero ERP API calls — completely independent of ERP auth.
 */
import { type ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
