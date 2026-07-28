import { cn } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-white/[0.05]', className)} />
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <Skeleton className="w-14 h-5 rounded-md" />
      </div>
      <Skeleton className="w-24 h-7 mb-1.5" />
      <Skeleton className="w-16 h-3" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24'}`} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <Skeleton className="w-36 h-4" />
          <Skeleton className="w-24 h-3" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <Skeleton style={{ height }} className="rounded-lg w-full" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-16 h-4" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-3/4 h-3" />
            <Skeleton className="w-1/2 h-2.5" />
          </div>
          <Skeleton className="w-16 h-3 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
