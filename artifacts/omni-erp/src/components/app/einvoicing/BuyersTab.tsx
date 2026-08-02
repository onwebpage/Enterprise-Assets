import { useState } from 'react';
import { Plus, Search, Edit, Trash2, RefreshCw, Building2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useEInvBuyers, useDeleteEInvBuyer, useUpdateEInvBuyer,
  useEInvPermissions, type EInvBuyer,
} from '@/hooks/useEInvoicing';
import BuyerFormModal from './BuyerFormModal';
import EInvDeleteDialog from './EInvDeleteDialog';

const PAGE_LIMIT = 25;

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 bg-white/[0.04] rounded animate-pulse" style={{ width: j === 0 ? '70%' : '60%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function BuyersTab() {
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editBuyer, setEditBuyer] = useState<EInvBuyer | null>(null);
  const [deleteBuyer, setDeleteBuyer] = useState<EInvBuyer | null>(null);

  const { data: permsRes } = useEInvPermissions();
  const perms = permsRes?.data;

  const { data: list, isLoading, isFetching, refetch } = useEInvBuyers({
    search: search || undefined, page, limit: PAGE_LIMIT,
  });
  const deleteMut = useDeleteEInvBuyer();
  const updateMut = useUpdateEInvBuyer();

  const buyers = list?.data ?? [];
  const total  = list?.total ?? 0;
  const pages  = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  function handleSearch(v: string) { setSearch(v); setPage(1); }

  async function toggleActive(b: EInvBuyer) {
    await updateMut.mutateAsync({ id: b.id, data: { isActive: !b.isActive } });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search buyers…"
            className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 text-sm h-8"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}
          className="h-8 px-2 text-white/40 hover:text-white hover:bg-white/[0.06]">
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
        </Button>
        <div className="ml-auto">
          {perms?.canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}
              className="h-8 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Buyer
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-white/[0.07] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">GSTIN</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">City / State</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-white/40">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-white/40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <TableSkeleton /> : buyers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Building2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-sm text-white/30">No buyers found</p>
                  {perms?.canCreate && (
                    <button onClick={() => setCreateOpen(true)}
                      className="mt-2 text-xs text-[#2563EB] hover:text-blue-400 transition-colors">
                      Add your first buyer →
                    </button>
                  )}
                </td>
              </tr>
            ) : buyers.map(b => (
              <tr key={b.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{b.name}</div>
                  {b.pan && <div className="text-[11px] text-white/30 mt-0.5">PAN: {b.pan}</div>}
                </td>
                <td className="px-4 py-3 text-white/60 font-mono text-xs">{b.gstin ?? '—'}</td>
                <td className="px-4 py-3 text-white/60 text-xs">{b.email ?? '—'}</td>
                <td className="px-4 py-3 text-white/60 text-xs">
                  {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => perms?.canEdit && toggleActive(b)}
                    disabled={!perms?.canEdit}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
                      b.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:bg-white/[0.08]',
                    )}
                  >
                    {b.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {b.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {perms?.canEdit && (
                      <button onClick={() => setEditBuyer(b)}
                        className="p-1.5 rounded hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {perms?.canDelete && (
                      <button onClick={() => setDeleteBuyer(b)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{total} buyers</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1} className="h-7 px-2 text-white/40 hover:text-white hover:bg-white/[0.06]">
              Prev
            </Button>
            <span className="px-2 py-1">Page {page} / {pages}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages} className="h-7 px-2 text-white/40 hover:text-white hover:bg-white/[0.06]">
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {(createOpen || editBuyer) && (
        <BuyerFormModal
          buyer={editBuyer}
          onClose={() => { setCreateOpen(false); setEditBuyer(null); }}
        />
      )}

      {deleteBuyer && (
        <EInvDeleteDialog
          title={`Delete "${deleteBuyer.name}"?`}
          description="This buyer will be permanently removed. This action cannot be undone."
          onConfirm={() => deleteMut.mutateAsync(deleteBuyer.id).then(() => {})}
          onClose={() => setDeleteBuyer(null)}
        />
      )}
    </div>
  );
}
