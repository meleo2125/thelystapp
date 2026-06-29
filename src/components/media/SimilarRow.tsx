import React from 'react';
import HorizontalScrollRow from '../ui/HorizontalScrollRow';
import MediaCard from './MediaCard';
import { MediaSummary } from '@/types/media';

interface SimilarRowProps {
  similar: MediaSummary[];
  className?: string;
}

const SimilarRow: React.FC<SimilarRowProps> = ({ similar, className = '' }) => {
  if (!similar || similar.length === 0) {
    return <p className="text-sm text-muted">No similar recommendations available.</p>;
  }

  return (
    <HorizontalScrollRow className={className}>
      {similar.map((item) => (
        <div key={`${item.type}-${item.sourceId}`} className="w-[140px] shrink-0 snap-start">
          <MediaCard media={item} />
        </div>
      ))}
    </HorizontalScrollRow>
  );
};

export default SimilarRow;
