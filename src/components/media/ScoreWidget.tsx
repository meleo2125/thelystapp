import React, { useRef } from 'react';

interface ScoreWidgetProps {
  value: number | null;
  onChange: (val: number | null) => void;
  disabled?: boolean;
}

const ScoreWidget: React.FC<ScoreWidgetProps> = ({ value, onChange, disabled = false }) => {
  const scores = Array.from({ length: 10 }, (_, i) => i + 1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    let nextValue: number | null = null;
    const currentValue = value || 0;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextValue = currentValue === 10 ? 1 : currentValue + 1;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextValue = currentValue <= 1 ? 10 : currentValue - 1;
      e.preventDefault();
    }

    if (nextValue !== null) {
      onChange(nextValue);
      // Wait for React to update tabIndex, then focus
      setTimeout(() => {
        const btn = containerRef.current?.querySelector(`button[data-score="${nextValue}"]`) as HTMLElement;
        btn?.focus();
      }, 0);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div 
        ref={containerRef}
        role="radiogroup"
        aria-label="Rating scale from 1 to 10"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-1.5 focus:outline-none"
      >
        {scores.map((num) => {
          const isSelected = value === num;
          const tabIndex = isSelected ? 0 : (value === null && num === 1) ? 0 : -1;
          
          return (
            <button
              key={num}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={tabIndex}
              data-score={num}
              disabled={disabled}
              onClick={() => onChange(num)}
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer select-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                isSelected
                  ? 'bg-primary text-white border border-primary scale-105 shadow-md shadow-primary/25'
                  : 'bg-secondary border border-border text-foreground hover:bg-white/5'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              {num}
            </button>
          );
        })}
      </div>
      {value !== null && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted hover:text-primary active:scale-95 transition-all w-fit cursor-pointer mt-1"
        >
          Clear Score
        </button>
      )}
    </div>
  );
};

export default ScoreWidget;
