import { cn } from '@/lib/utils';

type Status =
  | 'paid' | 'unpaid' | 'overdue'
  | 'pending' | 'approved' | 'rejected'
  | 'active' | 'inactive' | 'archived'
  | 'processing' | 'completed' | 'cancelled' | 'failed'
  | 'draft' | 'published' | 'review'
  | 'open' | 'closed' | 'on-hold'
  | 'high' | 'medium' | 'low'
  | 'critical' | 'warning' | 'info' | 'success'
  | string;

const statusMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  paid:       { bg: 'bg-emerald-500/12', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  active:     { bg: 'bg-emerald-500/12', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  approved:   { bg: 'bg-emerald-500/12', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  completed:  { bg: 'bg-emerald-500/12', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  success:    { bg: 'bg-emerald-500/12', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  published:  { bg: 'bg-emerald-500/12', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },

  pending:    { bg: 'bg-amber-500/12',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400' },
  review:     { bg: 'bg-amber-500/12',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400' },
  'on-hold':  { bg: 'bg-amber-500/12',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400' },
  warning:    { bg: 'bg-amber-500/12',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400' },
  medium:     { bg: 'bg-amber-500/12',   text: 'text-amber-400',   border: 'border-amber-500/25',   dot: 'bg-amber-400' },

  processing: { bg: 'bg-blue-500/12',    text: 'text-blue-400',    border: 'border-blue-500/25',    dot: 'bg-blue-400' },
  open:       { bg: 'bg-blue-500/12',    text: 'text-blue-400',    border: 'border-blue-500/25',    dot: 'bg-blue-400' },
  info:       { bg: 'bg-blue-500/12',    text: 'text-blue-400',    border: 'border-blue-500/25',    dot: 'bg-blue-400' },

  overdue:    { bg: 'bg-red-500/12',     text: 'text-red-400',     border: 'border-red-500/25',     dot: 'bg-red-400' },
  rejected:   { bg: 'bg-red-500/12',     text: 'text-red-400',     border: 'border-red-500/25',     dot: 'bg-red-400' },
  cancelled:  { bg: 'bg-red-500/12',     text: 'text-red-400',     border: 'border-red-500/25',     dot: 'bg-red-400' },
  failed:     { bg: 'bg-red-500/12',     text: 'text-red-400',     border: 'border-red-500/25',     dot: 'bg-red-400' },
  critical:   { bg: 'bg-red-500/12',     text: 'text-red-400',     border: 'border-red-500/25',     dot: 'bg-red-400' },
  high:       { bg: 'bg-red-500/12',     text: 'text-red-400',     border: 'border-red-500/25',     dot: 'bg-red-400' },

  draft:      { bg: 'bg-white/5',        text: 'text-white/50',    border: 'border-white/10',       dot: 'bg-white/40' },
  inactive:   { bg: 'bg-white/5',        text: 'text-white/50',    border: 'border-white/10',       dot: 'bg-white/40' },
  archived:   { bg: 'bg-white/5',        text: 'text-white/50',    border: 'border-white/10',       dot: 'bg-white/40' },
  closed:     { bg: 'bg-white/5',        text: 'text-white/50',    border: 'border-white/10',       dot: 'bg-white/40' },
  low:        { bg: 'bg-white/5',        text: 'text-white/50',    border: 'border-white/10',       dot: 'bg-white/40' },
  unpaid:     { bg: 'bg-white/5',        text: 'text-white/50',    border: 'border-white/10',       dot: 'bg-white/40' },

  purple:     { bg: 'bg-purple-500/12',  text: 'text-purple-400',  border: 'border-purple-500/25',  dot: 'bg-purple-400' },
};

const fallback = { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10', dot: 'bg-white/40' };

interface StatusBadgeProps {
  status: Status;
  showDot?: boolean;
  className?: string;
  capitalize?: boolean;
}

export default function StatusBadge({ status, showDot = true, className, capitalize = true }: StatusBadgeProps) {
  const s = statusMap[status.toLowerCase()] ?? fallback;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border',
      s.bg, s.text, s.border, className
    )}>
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />}
      {capitalize ? status.charAt(0).toUpperCase() + status.slice(1) : status}
    </span>
  );
}
