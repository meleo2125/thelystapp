import React from 'react';
import HorizontalScrollRow from '../ui/HorizontalScrollRow';
import MediaImage from '../ui/MediaImage';

interface CastMember {
  name: string;
  character: string;
  profilePath: string | null;
}

interface CastRowProps {
  cast: CastMember[];
  className?: string;
}

const CastRow: React.FC<CastRowProps> = ({ cast, className = '' }) => {
  if (!cast || cast.length === 0) {
    return <p className="text-sm text-muted">No cast details available.</p>;
  }

  return (
    <HorizontalScrollRow className={className}>
      {cast.map((member, idx) => (
        <div
          key={`${member.name}-${idx}`}
          className="flex flex-col items-center text-center w-24 shrink-0 snap-start"
        >
          {/* Avatar Container */}
          <div className="relative w-20 h-20 rounded-full overflow-hidden border border-border mb-2 bg-secondary/85">
            <MediaImage
              src={member.profilePath}
              alt={member.name}
              fill
              fallbackSrc="/poster-fallback.svg"
              sizes="80px"
            />
          </div>
          
          {/* Actor Name */}
          <span className="text-xs font-semibold text-foreground line-clamp-1 w-full px-1">
            {member.name}
          </span>
          {/* Character Name */}
          <span className="text-[10px] text-muted line-clamp-1 w-full px-1 mt-0.5">
            {member.character}
          </span>
        </div>
      ))}
    </HorizontalScrollRow>
  );
};

export default CastRow;
