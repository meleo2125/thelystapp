import React from 'react';

interface GenrePillProps {
  label: string;
  className?: string;
  onClick?: () => void;
}

const GenrePill: React.FC<GenrePillProps> = ({ label, className = '', onClick }) => {
  const isClickable = !!onClick;
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-secondary-light border border-border text-foreground transition-all duration-200 select-none ${
        isClickable ? 'cursor-pointer hover:bg-white/5 active:scale-95' : ''
      } ${className}`}
    >
      {label}
    </span>
  );
};

export default GenrePill;
