import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'row' | 'detail' | 'text' | 'image';
  className?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'text', className = '' }) => {
  const baseClass = 'animate-pulse bg-white/5 rounded';

  if (variant === 'card') {
    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        <div className="aspect-[2/3] w-full bg-white/5 animate-pulse rounded-lg" />
        <div className="h-4 w-3/4 bg-white/5 animate-pulse rounded" />
        <div className="h-3 w-1/2 bg-white/5 animate-pulse rounded" />
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={`flex items-center gap-4 py-3 border-b border-border/40 ${className}`}>
        <div className="w-12 h-16 bg-white/5 animate-pulse rounded" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 w-1/3 bg-white/5 animate-pulse rounded" />
          <div className="h-3 w-1/4 bg-white/5 animate-pulse rounded" />
        </div>
        <div className="w-16 h-8 bg-white/5 animate-pulse rounded" />
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 py-8 ${className}`}>
        <div className="aspect-[2/3] w-full bg-white/5 animate-pulse rounded-lg max-w-[300px] mx-auto md:mx-0" />
        <div className="flex flex-col gap-4">
          <div className="h-8 w-1/2 bg-white/5 animate-pulse rounded" />
          <div className="h-4 w-1/4 bg-white/5 animate-pulse rounded" />
          <div className="flex gap-2 my-2">
            <div className="h-7 w-16 bg-white/5 animate-pulse rounded-full" />
            <div className="h-7 w-20 bg-white/5 animate-pulse rounded-full" />
            <div className="h-7 w-16 bg-white/5 animate-pulse rounded-full" />
          </div>
          <div className="h-20 w-full bg-white/5 animate-pulse rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/5 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'image') {
    return <div className={`${baseClass} aspect-[2/3] w-full ${className}`} />;
  }

  // Default 'text'
  return <div className={`${baseClass} h-4 w-full ${className}`} />;
};

export default LoadingSkeleton;
