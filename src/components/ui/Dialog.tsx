'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';

/**
 * Custom Dialog primitives — Task 4.
 *
 * The product spec calls for replacing all native browser primitives
 * (`window.confirm`, `window.alert`, `<select>` style dropdowns) with custom
 * components matching the dark cinematic theme.
 *
 * This file ships:
 *   - <Modal>      base portal-based modal with focus trap + ESC + backdrop
 *   - <ConfirmDialog> drop-in replacement for window.confirm
 *   - <AlertDialog>   drop-in replacement for window.alert
 *
 * Imperative helpers live in `lib/ui/dialogs.tsx` (renders a singleton
 * `<DialogHost />` mounted via Providers).
 */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Restrict click-outside dismissal (defaults to true). */
  dismissOnBackdropClick?: boolean;
  /** Custom width class. */
  widthClass?: string;
  labelledBy?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  dismissOnBackdropClick = true,
  widthClass = 'max-w-md',
  labelledBy,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC to close + body scroll lock + focus trap.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const focusables = (): HTMLElement[] =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    // Focus the first focusable element when opening.
    setTimeout(() => {
      const els = focusables();
      const first = els[0];
      if (first) first.focus();
    }, 0);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        const els = focusables();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = 'unset';
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render-via-portal only in the browser.
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 fade-in"
      role="presentation"
    >
      <div
        className="absolute inset-0"
        onClick={() => dismissOnBackdropClick && onClose()}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative w-full ${widthClass} bg-secondary border border-border rounded-xl p-6 shadow-2xl z-10`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

/* ------------------------------------------------------------------
 * ConfirmDialog
 * ---------------------------------------------------------------- */

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' colors the primary button red. */
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  /** When true, the confirm button shows a spinner. */
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} labelledBy="dialog-title">
      <h3
        id="dialog-title"
        className="text-lg font-bold text-foreground mb-2 flex items-center gap-2"
      >
        {variant === 'danger' && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5 text-rose-500"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {title}
      </h3>
      {description && (
        <div className="text-sm text-muted leading-relaxed mb-6">
          {description}
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          isLoading={loading}
          className={
            variant === 'danger'
              ? 'bg-rose-500 hover:bg-rose-600 focus-visible:ring-rose-500/50'
              : ''
          }
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------
 * AlertDialog
 * ---------------------------------------------------------------- */

export interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  buttonLabel?: string;
  onClose: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  description,
  buttonLabel = 'OK',
  onClose,
}) => {
  const handleClose = useCallback(() => onClose(), [onClose]);
  return (
    <Modal isOpen={isOpen} onClose={handleClose} labelledBy="dialog-title">
      <h3 id="dialog-title" className="text-lg font-bold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <div className="text-sm text-muted leading-relaxed mb-6">
          {description}
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        <Button variant="primary" size="sm" onClick={handleClose}>
          {buttonLabel}
        </Button>
      </div>
    </Modal>
  );
};
