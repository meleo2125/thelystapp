import React from 'react';
import Link from 'next/link';
import { MediaSummary } from '@/types/media';
import MediaImage from '../ui/MediaImage';
import AggregateScoreBadge from '../ui/AggregateScoreBadge';

interface MediaCardProps {
  media: MediaSummary;
  actionSlot?: React.ReactNode; // For the quick-add or status button in lists
  showBadge?: boolean; // For showing the type badge if needed
}

const typeLabelMap: Record<MediaSummary['type'], string> = {
  movie: 'Movie',
  tv: 'TV',
  anime: 'Anime',
};

const MediaCard: React.FC<MediaCardProps> = ({ media, actionSlot, showBadge = false }) => {
  const detailLink = `/${media.type}/${media.sourceId}`;

  return (
    <div className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow w-full sm:max-w-[200px] shadow-md">
      {/* Poster Container */}
      <Link href={detailLink} className="relative aspect-[2/3] block overflow-hidden bg-background">
        <MediaImage
          src={media.posterPath}
          alt={media.title}
          fill
          sizes="(max-w-768px) 50vw, 200px"
          className="group-hover:scale-105 transition-transform duration-500"
          priority={false}
        />
        
        {/* Score Badge */}
        {media.aggregateScore !== null && (
          <div className="absolute top-2 left-2 z-10">
            <AggregateScoreBadge score={media.aggregateScore} size="sm" />
          </div>
        )}

        {/* Action Slot Overlay */}
        {actionSlot && (
          <div className="absolute bottom-2 right-2 z-10">
            {actionSlot}
          </div>
        )}

        {/* Media Type Badge */}
        {showBadge && (
          <div className="absolute top-2 right-2 z-10">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-black/80 border border-white/10 px-1.5 py-0.5 rounded text-foreground">
              {typeLabelMap[media.type]}
            </span>
          </div>
        )}
      </Link>

      {/* Info Container */}
      <div className="flex-1 flex flex-col p-3">
        <Link href={detailLink} className="hover:text-primary transition-colors line-clamp-2 text-sm font-semibold mb-1 h-10 text-foreground leading-snug block">
          {media.title}
        </Link>

        <span className="text-xs text-muted">
          {media.year || '—'}
        </span>
      </div>
    </div>
  );
};

export default MediaCard;
