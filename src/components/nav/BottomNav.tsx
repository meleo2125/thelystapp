'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/backend/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/backend/firebase';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUsername(null);
      return;
    }

    const fetchUsername = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username || null);
        }
      } catch (err) {
        console.error('Error fetching username for bottomnav:', err);
      }
    };
    fetchUsername();
  }, [user]);

  const navItems = [
    {
      href: '/home',
      label: 'Home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="m9.707 2.293 6 6V17a1 1 0 0 1-1 1h-2v-5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v5H6a1 1 0 0 1-1-1V8.293l6-6a1 1 0 0 1 1.414 0z" />
        </svg>
      ),
    },
    {
      href: '/search',
      label: 'Search',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      href: '/browse',
      label: 'Browse',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2.5 3A1.5 1.5 0 0 0 1 4.5v11A1.5 1.5 0 0 0 2.5 17h15a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 17.5 3h-15ZM10 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-4.5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm10 1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 12.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm5.5-1.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm3.5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      href: '/list',
      label: 'Lysts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      href: username ? `/u/${username}` : '/onboarding',
      label: 'Profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bg-secondary/70 border-t border-border fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-16 pb-safe backdrop-blur-xl shadow-lg md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.label === 'Profile' && pathname.startsWith('/u/'));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full select-none transition-all active:scale-90 ${
              isActive ? 'text-primary' : 'text-muted hover:text-foreground'
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
