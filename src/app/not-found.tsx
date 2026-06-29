import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-secondary border border-border/80 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6 fade-in">
        {/* Help/Question Icon */}
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground">404</h2>
          <p className="text-sm font-bold text-foreground">Page Not Found</p>
          <p className="text-xs text-muted leading-relaxed">
            The media details, tracking list, or settings configuration path you requested doesn't exist or has been removed.
          </p>
        </div>

        {/* Return Button */}
        <Link href="/home" className="w-full mt-2">
          <Button variant="primary" className="w-full cursor-pointer">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
