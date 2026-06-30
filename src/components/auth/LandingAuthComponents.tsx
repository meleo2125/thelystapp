'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/backend/AuthContext';
import Button from '@/components/ui/Button';

export function LandingHeaderAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="w-8 h-8 bg-white/5 animate-pulse rounded-full" />;
  }

  if (user) {
    return (
      <Link href="/home">
        <Button variant="primary" size="sm" className="cursor-pointer">
          Dashboard
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/login" className="text-xs font-bold text-muted hover:text-foreground transition-colors">
        Sign In
      </Link>
      <Link href="/register">
        <Button variant="primary" size="sm" className="cursor-pointer">
          Get Started
        </Button>
      </Link>
    </div>
  );
}

export function LandingHeroAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-12 w-48 bg-white/5 animate-pulse rounded-lg" />;
  }

  if (user) {
    return (
      <Link href="/home">
        <Button variant="primary" size="lg" className="px-8 py-3 text-base shadow-xl shadow-primary/25 cursor-pointer">
          Enter Dashboard
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 mt-4">
      <Link href="/register">
        <Button variant="primary" size="lg" className="px-8 py-3 text-base shadow-xl shadow-primary/25 cursor-pointer">
          Start Tracking
        </Button>
      </Link>
      <Link href="/login">
        <Button variant="secondary" size="lg" className="px-8 py-3 text-base cursor-pointer">
          Sign In
        </Button>
      </Link>
    </div>
  );
}
