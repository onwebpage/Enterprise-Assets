import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10 px-6' : 'py-20 px-8'}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white/25" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-white/40 max-w-xs leading-relaxed mb-5">{description}</p>
      <div className="flex items-center gap-2">
        {secondaryAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={secondaryAction.onClick}
            className="border-white/[0.1] bg-transparent text-white/60 hover:text-white hover:bg-white/[0.05]"
          >
            {secondaryAction.label}
          </Button>
        )}
        {action && (
          <Button
            size="sm"
            onClick={action.onClick}
            className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
          >
            {action.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
