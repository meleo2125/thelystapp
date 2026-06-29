import React from 'react';
import Link from 'next/link';
import { MediaSummary } from '@/types/media';

interface RelationGroup {
  type: string;
  entries: MediaSummary[];
}

interface RelationsGridProps {
  relations: RelationGroup[];
  className?: string;
}

const RelationsGrid: React.FC<RelationsGridProps> = ({ relations, className = '' }) => {
  if (!relations || relations.length === 0) {
    return <p className="text-sm text-muted">No related anime entries available.</p>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {relations.map((group) => (
        <div key={group.type} className="bg-secondary/50 border border-border/40 rounded-lg p-4">
          {/* Relation Header */}
          <h4 className="text-xs font-bold tracking-wider uppercase text-primary mb-3">
            {group.type}
          </h4>
          
          {/* Related Items List */}
          <div className="flex flex-col gap-2">
            {group.entries.map((entry) => {
              const detailLink = `/${entry.type}/${entry.sourceId}`;
              return (
                <Link
                  key={`${entry.type}-${entry.sourceId}`}
                  href={detailLink}
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-white/5 border border-transparent hover:border-border/60 transition-all duration-200"
                >
                  <span className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                    {entry.title}
                  </span>
                  <span className="text-[10px] font-semibold text-muted uppercase border border-border px-1.5 py-0.5 rounded shrink-0">
                    {entry.type === 'movie' ? 'Movie' : entry.type === 'tv' ? 'TV' : 'Anime'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RelationsGrid;
