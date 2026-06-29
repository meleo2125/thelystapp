import React from 'react';

interface AggregateScoreBadgeProps {
  score: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const AggregateScoreBadge: React.FC<AggregateScoreBadgeProps> = ({ score, className = '', size = 'md' }) => {
  if (score === null || score === undefined) {
    return (
      <span className={`inline-flex items-center text-muted font-medium bg-secondary border border-border rounded ${
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${className}`}>
        —
      </span>
    );
  }

  const roundedScore = score.toFixed(1);

  return (
    <span className={`inline-flex items-center gap-1 font-bold bg-rating/10 border border-rating/20 text-rating rounded ${
      size === 'sm' ? 'px-1.5 py-0.5 text-xs' : size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    } ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={
        size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'
      }>
        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.6 3.102-1.196 4.657c-.209.813.684 1.462 1.394 1.011l4.225-2.7 4.225 2.7c.71.451 1.602-.198 1.394-1.011l-1.196-4.657 3.6-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
      </svg>
      {roundedScore}
    </span>
  );
};

export default AggregateScoreBadge;
