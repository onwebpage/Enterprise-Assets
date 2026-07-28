import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  change?: string;
  changeLabel?: string;
  up?: boolean;
  icon: LucideIcon;
  iconColor: string;
  gradient: string;
  index?: number;
  onClick?: () => void;
  sparkline?: number[]; // optional mini sparkline values
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 72;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function KPICard({
  label, value, change, changeLabel, up = true, icon: Icon,
  iconColor, gradient, index = 0, onClick, sparkline,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'bg-[#0a0f1e] border border-white/[0.07] rounded-xl p-4 transition-all group',
        'hover:border-white/[0.14] hover:bg-[#0d1225]',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', gradient)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
        {change && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
            up
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-red-400 bg-red-500/10'
          )}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-white/40 mt-0.5 font-medium">{label}</p>
      {(sparkline || changeLabel) && (
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-white/[0.05]">
          {sparkline && (
            <MiniSparkline
              data={sparkline}
              color={up ? '#22C55E' : '#EF4444'}
            />
          )}
          {changeLabel && (
            <p className="text-[11px] text-white/30 ml-auto">{changeLabel}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
