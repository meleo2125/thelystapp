'use client';

import React, { useRef, useState, useEffect } from 'react';


interface HorizontalScrollRowProps {
  children: React.ReactNode;
  className?: string;
}

const HorizontalScrollRow: React.FC<HorizontalScrollRowProps> = ({ children, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      // Small buffer to avoid float/pixel rounding issues
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      // Run initial check
      checkScroll();
      
      // Setup a ResizeObserver to recheck on window resize / element change
      const observer = new ResizeObserver(checkScroll);
      observer.observe(el);

      // Setup a MutationObserver to recheck when children are added/removed
      const mutationObserver = new MutationObserver(checkScroll);
      mutationObserver.observe(el, { childList: true, subtree: true });

      return () => {
        el.removeEventListener('scroll', checkScroll);
        observer.disconnect();
        mutationObserver.disconnect();
      };
    }
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const { clientWidth } = containerRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      containerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={`relative group/row ${className}`}>
      {/* Left Arrow Button */}
      {showLeftArrow && (
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-secondary-light/95 border border-border text-foreground hover:bg-white/5 active:scale-95 transition-all duration-200 shadow-lg flex items-center justify-center cursor-pointer opacity-0 group-hover/row:opacity-100"
          aria-label="Scroll left"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Right Arrow Button */}
      {showRightArrow && (
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-secondary-light/95 border border-border text-foreground hover:bg-white/5 active:scale-95 transition-all duration-200 shadow-lg flex items-center justify-center cursor-pointer opacity-0 group-hover/row:opacity-100"
          aria-label="Scroll right"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 select-none no-scrollbar"
      >
        {children}
      </div>
    </div>
  );
};

export default HorizontalScrollRow;
