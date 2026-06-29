import React from 'react';
import { ListEntry } from '@/types/list';

interface ActivityHeatmapProps {
  list: ListEntry[];
}

export default function ActivityHeatmap({ list }: ActivityHeatmapProps) {
  // 1. Group completions by date (YYYY-MM-DD)
  const completionsMap = new Map<string, number>();
  
  list.forEach((item) => {
    if (item.completedAt) {
      try {
        const dateStr = item.completedAt.split('T')[0];
        completionsMap.set(dateStr, (completionsMap.get(dateStr) || 0) + 1);
      } catch (err) {
        // Safe check for invalid dates
      }
    }
  });

  // 2. Generate the last 180 days (approx. 26 weeks)
  const daysToShow = 180;
  const dates: { dateStr: string; count: number; label: string }[] = [];
  const today = new Date();

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = completionsMap.get(dateStr) || 0;
    const label = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: ${count} completed`;
    dates.push({ dateStr, count, label });
  }

  // 3. Define color tiers
  const getTierColor = (count: number) => {
    if (count === 0) return 'bg-white/5 border border-white/5';
    if (count === 1) return 'bg-primary/30 border border-primary/40';
    if (count === 2) return 'bg-primary/60 border border-primary/70';
    return 'bg-primary border border-primary-light/40 shadow-sm shadow-primary/20'; // 3+ completions
  };

  return (
    <div className="bg-secondary/50 border border-border/40 p-5 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Watch Activity Heatmap</h3>
        <div className="flex items-center gap-1.5 text-[9px] text-muted">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-white/5" />
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/30" />
          <div className="w-2.5 h-2.5 rounded-sm bg-primary/60" />
          <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid Wrapper */}
      <div className="overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex flex-wrap gap-1.5 min-w-[500px]">
          {dates.map((day) => (
            <div
              key={day.dateStr}
              title={day.label}
              className={`w-4 h-4 rounded-sm transition-all duration-200 hover:scale-110 cursor-help ${getTierColor(day.count)}`}
            />
          ))}
        </div>
      </div>
      <span className="text-[10px] text-muted mt-3 block">
        Completions logged over the last 6 months. Hover boxes to see dates.
      </span>
    </div>
  );
}
