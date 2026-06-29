'use client';

import React from 'react';
import Button from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-screen flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-secondary border border-border rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Critical Error</h2>
            <p className="text-xs text-muted leading-relaxed">
              A critical root rendering error occurred. Please try refreshing.
            </p>
          </div>
          <Button variant="primary" onClick={() => reset()} className="w-full cursor-pointer">
            Refresh App
          </Button>
        </div>
      </body>
    </html>
  );
}
