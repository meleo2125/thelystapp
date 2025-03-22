import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', withText = true }) => {
  const sizeMap = {
    sm: { width: 32, height: 32, textSize: 'text-xl' },
    md: { width: 40, height: 40, textSize: 'text-2xl' },
    lg: { width: 48, height: 48, textSize: 'text-3xl' }
  };

  const { width, height, textSize } = sizeMap[size];

  return (
    <Link 
      href="/" 
      className={`flex items-center gap-2 transition-opacity hover:opacity-90 ${className}`}
    >
      <div className={`relative ${withText ? '' : 'mx-auto'}`}>
        <Image
          src="/lyst.png"
          width={width}
          height={height}
          alt="TheLyst Logo"
          className="object-contain logo-pulse"
          priority
        />
      </div>
      
      {withText && (
        <span className={`font-heading font-bold text-gray-900 dark:text-white ${textSize}`}>
          The<span className="text-[#e11d48]">Lyst</span>
        </span>
      )}
    </Link>
  );
};

export default Logo; 