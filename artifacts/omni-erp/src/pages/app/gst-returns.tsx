import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, Plus } from 'lucide-react';
import AppLayout from '@/components/app/AppLayout';
import { cn } from '@/lib/utils';
import { useGSTPermissions } from '@/hooks/useGSTReturns';
import OverviewTab from '@/components/app/gst-returns/OverviewTab';
import ReturnsTable from '@/components/app/gst-returns/ReturnsTable';

type Tab = 'overview' | 'returns';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'returns',  label: 'Returns' },
];

export default function GSTReturnsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { data: permsRes, isLoading: permsLoading } = useGSTPermissions();
  const perms = permsRes?.data;

  if (!permsLoading && perms && !perms.canView) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'GST Returns' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40">You don't have permission to view GST Returns.</p>
            <p className="text-xs text-white/25 mt-1">Contact your system administrator.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Finance' }, { label: 'GST Returns' }]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">GST Returns</h1>
            <p className="text-sm text-white/40 mt-1">
              Prepare, manage, and file GSTR-1, GSTR-3B, GSTR-9 and other GST returns
            </p>
          </div>
          {perms?.canCreate && (
            <button
              onClick={() => setActiveTab('returns')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-xs text-white font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Return
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeTab === t.id
                  ? 'border-[#2563EB] text-white'
                  : 'border-transparent text-white/40 hover:text-white/70',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab onNavigate={() => setActiveTab('returns')} />
          )}
          {activeTab === 'returns' && <ReturnsTable />}
        </motion.div>
      </div>
    </AppLayout>
  );
}
