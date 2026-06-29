'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/../backend/AuthContext';
import Navbar from '@/components/nav/Navbar';
import BottomNav from '@/components/nav/BottomNav';

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const checkProfileOnboarding = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const json = await res.json();
          const profile = json.profile;
          if (profile && !profile.onboardingCompleted && pathname !== '/onboarding') {
            router.replace('/onboarding');
            return;
          }
        }
      } catch (err) {
        console.error('Error verifying onboarding status in layout:', err);
      } finally {
        setChecking(false);
      }
    };

    checkProfileOnboarding();
  }, [user, loading, pathname, router]);

  if (loading || (checking && pathname !== '/onboarding')) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <div className="flex-1 pt-16 pb-16 md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}
