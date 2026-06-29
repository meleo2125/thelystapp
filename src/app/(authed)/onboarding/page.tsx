'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../backend/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const POPULAR_GENRES: string[] = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 
  'Isekai', 'Shounen', 'Seinen', 'Shoujo', 'Slice of Life', 'Mecha'
];

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in, or if onboarding is already complete
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const checkAlreadyOnboarded = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const json = await res.json();
          if (json.profile && json.profile.onboardingCompleted) {
            router.replace('/home');
          }
        }
      } catch (err) {
        console.error('Failed to check onboarding status:', err);
      }
    };
    checkAlreadyOnboarded();
  }, [user, authLoading, router]);

  const handleToggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      toast.error('Username must be between 3 and 20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      toast.error('Username must contain only letters, numbers, or underscores');
      return;
    }

    if (selectedGenres.length === 0) {
      toast.error('Please select at least one favorite genre');
      return;
    }

    setLoading(true);
    try {
      // 1. Claim username
      const usernameRes = await fetch('/api/user/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername }),
      });

      if (!usernameRes.ok) {
        const errJson = await usernameRes.json();
        throw new Error(errJson.error === 'username_taken' ? 'Username is already taken' : 'Failed to save username');
      }

      // 2. Save profile updates (genres + completed flag)
      const profileRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          favoriteGenres: selectedGenres,
          onboardingCompleted: true,
        }),
      });

      if (!profileRes.ok) {
        throw new Error('Failed to save profile preferences');
      }

      toast.success('Onboarding complete! Welcome to TheLyst.');
      router.replace('/home');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred during onboarding');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <span className="loading loading-spinner text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-secondary border border-border/80 rounded-2xl p-8 shadow-2xl space-y-6 fade-in">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-foreground">Welcome to TheLyst</h1>
          <p className="text-xs text-muted">Complete your setup to start tracking media catalog entries.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div className="space-y-1">
            <Input
              label="Choose your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. janesmith"
              fullWidth
              required
              leftIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <p className="text-[10px] text-muted">Alphanumeric characters or underscores only, 3–20 characters.</p>
          </div>

          {/* Genre Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted">
              Select Favorite Genres
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {POPULAR_GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleToggleGenre(genre)}
                    className={`h-9 rounded-lg text-xs font-bold transition-all border flex items-center justify-center cursor-pointer select-none ${
                      isSelected
                        ? 'bg-primary/20 border-primary text-primary scale-105 shadow-sm shadow-primary/10'
                        : 'bg-background border-border hover:bg-white/5 text-foreground'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={loading}
            className="font-bold h-10 mt-2"
          >
            Get Started
          </Button>
        </form>
      </div>
    </div>
  );
}
