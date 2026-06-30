'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Themed dropdown menu — replaces native <select> usages (Task 4).
 *
 * Keyboard support:
 *   - ArrowDown / ArrowUp   navigate options
 *   - Home / End            jump to first / last
 *   - Enter / Space         select
 *   - Esc                   close
 *
 * Accessibility:
 *   - role="combobox" trigger + role="listbox"/option semantics
 *   - aria-activedescendant tracks the highlighted option
 */

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional icon node rendered before the label. */
  icon?: React.ReactNode;
  /** Optional secondary text shown muted to the right. */
  hint?: string;
  disabled?: boolean;
}

interface DropdownProps<T extends string = string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Full width by default (matches existing native select). */
  fullWidth?: boolean;
  /** Label for screen readers. */
  ariaLabel?: string;
}

export function Dropdown<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  className = '',
  fullWidth = true,
  ariaLabel,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync highlight when value changes externally.
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setHighlight(idx);
  }, [value, options]);

  // Close on click outside.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const commit = useCallback(
    (idx: number) => {
      const opt = options[idx];
      if (!opt || opt.disabled) return;
      onChange(opt.value);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange, options]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlight(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(highlight);
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (
      e.key === 'ArrowDown' ||
      e.key === 'ArrowUp' ||
      e.key === 'Enter' ||
      e.key === ' '
    ) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={`w-full h-10 px-3 rounded bg-background border border-border text-foreground text-sm font-medium focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selected?.icon}
          <span className={selected ? '' : 'text-muted'}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={`w-4 h-4 text-muted shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            options[highlight] ? `dd-opt-${options[highlight].value}` : undefined
          }
          onKeyDown={onKeyDown}
          className="absolute z-50 mt-2 w-full bg-secondary border border-border rounded-lg shadow-2xl max-h-72 overflow-auto fade-in p-1.5"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlight;
            return (
              <div
                key={opt.value}
                id={`dd-opt-${opt.value}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => commit(idx)}
                className={`px-3 py-2 rounded text-sm cursor-pointer select-none flex items-center justify-between gap-3 transition-colors ${
                  opt.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : isHighlighted
                    ? 'bg-white/5 text-foreground'
                    : 'text-foreground hover:bg-white/5'
                } ${isSelected ? 'text-primary font-bold' : ''}`}
              >
                <span className="flex items-center gap-2 min-w-0 truncate">
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </span>
                {opt.hint && (
                  <span className="text-[10px] text-muted shrink-0">
                    {opt.hint}
                  </span>
                )}
                {isSelected && !opt.hint && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 text-primary shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
