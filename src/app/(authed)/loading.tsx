import React from 'react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-8">
      {/* Header Loading */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 animate-pulse rounded" />
        <div className="h-4 w-72 bg-white/5 animate-pulse rounded" />
      </div>
      
      {/* Grid of stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="h-20 bg-white/5 animate-pulse rounded-lg border border-border/20" />
        <div className="h-20 bg-white/5 animate-pulse rounded-lg border border-border/20" />
        <div className="h-20 bg-white/5 animate-pulse rounded-lg border border-border/20" />
        <div className="h-20 bg-white/5 animate-pulse rounded-lg border border-border/20" />
      </div>

      {/* Media cards horizontal row */}
      <div className="space-y-4 pt-4">
        <div className="h-6 w-36 bg-white/5 animate-pulse rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    </div>
  );
}
