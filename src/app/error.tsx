'use client';

import React, { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application boundary error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-secondary border border-border/80 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6 fade-in">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-foreground">Something went wrong!</h2>
          <p className="text-xs text-muted leading-relaxed">
            An unexpected error occurred in the application rendering layer. Let's try recovering your session.
          </p>
          {error.message && (
            <div className="p-3 bg-background border border-border rounded text-[10px] text-rose-400 font-mono break-all mt-4 text-left select-text">
              {error.message}
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
          <Button variant="primary" onClick={() => reset()} className="w-full cursor-pointer">
            Try Again
          </Button>
          <Button variant="secondary" onClick={() => window.location.href = '/home'} className="w-full cursor-pointer">
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
