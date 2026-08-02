import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TDS_SECTIONS, TCS_SECTIONS } from '@/hooks/useTDS';

type View = 'tds' | 'tcs';

export default function TDSSectionsGuide() {
  const [view, setView]     = useState<View>('tds');
  const [search, setSearch] = useState('');

  const sections = view === 'tds' ? TDS_SECTIONS : TCS_SECTIONS;

  const filtered = search.trim()
    ? sections.filter((s) =>
        s.code.toLowerCase().includes(search.toLowerCase()) ||
        s.label.toLowerCase().includes(search.toLowerCase()),
      )
    : sections;

  return (
    <div className="space-y-4">
      {/* Header + toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/80">
            {view === 'tds' ? 'TDS Sections Reference' : 'TCS Sections Reference'}
          </h2>
          <p className="text-xs text-white/35 mt-0.5">
            {view === 'tds'
              ? 'Income Tax Act sections under which tax is deducted at source'
              : 'Income Tax Act sections under which tax is collected at source'}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-lg p-0.5">
          {(['tds', 'tcs'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wide transition-all',
                view === v ? 'bg-[#2563EB] text-white shadow' : 'text-white/40 hover:text-white/60')}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search section or description…"
          className="pl-8 bg-white/[0.04] border-white/[0.07] text-white placeholder:text-white/25 h-8 text-sm" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((s) => (
          <div key={s.code}
            className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 hover:border-white/[0.12] transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <span className={cn('px-2 py-0.5 rounded text-xs font-mono font-bold border shrink-0',
                view === 'tds'
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-violet-500/30 bg-violet-500/10 text-violet-400')}>
                {s.code}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold border border-white/[0.08] bg-white/[0.04] text-white/50 whitespace-nowrap">
                {s.rate}
              </span>
            </div>
            <p className="mt-2.5 text-sm text-white/70 leading-snug">{s.label}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-white/25 text-sm">No sections matching "{search}"</p>
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-white/25 border-t border-white/[0.05] pt-4">
        Rates shown are standard rates and may vary based on the nature of payment, category of deductee, and applicable surcharge/cess.
        Always verify with the current Finance Act.
      </p>
    </div>
  );
}
