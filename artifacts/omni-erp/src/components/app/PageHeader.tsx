import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

interface Breadcrumb {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  badge?: ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs = [], actions, badge }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6"
    >
      <div>
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 text-xs mb-1.5">
            <Link href="/app/dashboard">
              <span className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">Home</span>
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-white/20" />
                {crumb.path && i < breadcrumbs.length - 1 ? (
                  <Link href={crumb.path}>
                    <span className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">{crumb.label}</span>
                  </Link>
                ) : (
                  <span className="text-white/50">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-white/40 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
