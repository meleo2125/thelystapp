import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: { textSize: 'text-lg tracking-widest font-black uppercase text-primary' },
    md: { textSize: 'text-xl tracking-widest font-black uppercase text-primary' },
    lg: { textSize: 'text-2xl tracking-widest font-black uppercase text-primary' }
  };

  const { textSize } = sizeMap[size];

  return (
    <Link 
      href="/home" 
      className={`transition-opacity hover:opacity-90 select-none ${className}`}
    >
      <span className={textSize}>
        THELYST
      </span>
    </Link>
  );
};

export default Logo;
 