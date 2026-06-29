import React from 'react';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
      <div className="mb-6">
        <div className="h-6 w-20 bg-white/5 animate-pulse rounded" />
      </div>
      <LoadingSkeleton variant="detail" />
    </div>
  );
}
