import React, { useEffect, useRef } from 'react';
import Button from '../ui/Button';

interface DuplicateConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  duplicate: {
    type: string;
    cache: {
      title: string;
    };
  } | null;
}

const typeMap: Record<string, string> = {
  movie: 'Movie',
  tv: 'TV Show',
  anime: 'Anime',
};

const DuplicateConflictModal: React.FC<DuplicateConflictModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  duplicate,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (firstElement) {
        firstElement.focus();
      }

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener('keydown', handleTab);
      return () => {
        window.removeEventListener('keydown', handleTab);
      };
    }
  }, [isOpen]);

  if (!isOpen || !duplicate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-secondary border border-border rounded-xl p-6 shadow-2xl z-10 fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
      >
        {/* Title */}
        <h3 id="conflict-title" className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-primary">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          Duplicate Item Found
        </h3>

        {/* Description */}
        <p className="text-sm text-muted leading-relaxed mb-6">
          This ID matches an item already in your list: <strong className="text-foreground">"{duplicate.cache.title}"</strong> which is tracked as a <strong className="text-primary">{typeMap[duplicate.type] || duplicate.type}</strong>.
          <br /><br />
          Due to ID overlaps between databases (TMDB/MyAnimeList), or duplicate media adaptations, this may be a different item. Do you want to track it anyway?
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Track Anyway
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateConflictModal;
