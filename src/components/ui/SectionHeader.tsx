import React from 'react';
import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  viewAllHref?: string;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, viewAllHref, className = '' }) => {
  return (
    <div className={`flex items-end justify-between mb-6 border-b border-border/40 pb-2 ${className}`}>
      <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      {viewAllHref && (
        <Link href={viewAllHref} className="text-xs font-semibold text-primary hover:text-primary-light transition-all duration-200">
          View all &rarr;
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
