import React from 'react';
import { ListStatus } from '@/types/list';

interface StatusBadgeProps {
  status: ListStatus;
  className?: string;
}

const statusMap: Record<ListStatus, { label: string; classes: string }> = {
  watching: {
    label: 'Watching',
    classes: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  completed: {
    label: 'Completed',
    classes: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  plan_to_watch: {
    label: 'Plan to Watch',
    classes: 'text-muted bg-white/5 border-border',
  },
  on_hold: {
    label: 'On Hold',
    classes: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  dropped: {
    label: 'Dropped',
    classes: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusMap[status] || { label: status, classes: 'text-muted bg-white/5 border-border' };
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
