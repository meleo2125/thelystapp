import React from 'react';

interface ProgressInputProps {
  value: number;
  max: number | null;
  onChange: (val: number) => void;
  disabled?: boolean;
}

const ProgressInput: React.FC<ProgressInputProps> = ({
  value,
  max,
  onChange,
  disabled = false,
}) => {
  const handleIncrement = () => {
    if (max !== null && value >= max) return;
    onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value <= 0) return;
    onChange(value - 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      onChange(0);
      return;
    }
    const boundedVal = Math.max(0, max !== null ? Math.min(max, val) : val);
    onChange(boundedVal);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Decrement Button */}
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={handleDecrement}
        className="w-10 h-10 rounded bg-secondary border border-border text-foreground hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Input Display */}
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="0"
          max={max ?? undefined}
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className="w-16 h-10 rounded bg-secondary border border-border text-foreground font-semibold text-center focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-sm font-semibold text-muted">
          / {max !== null ? max : '—'}
        </span>
      </div>

      {/* Increment Button */}
      <button
        type="button"
        disabled={disabled || (max !== null && value >= max)}
        onClick={handleIncrement}
        className="w-10 h-10 rounded bg-secondary border border-border text-foreground hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      </button>
    </div>
  );
};

export default ProgressInput;
