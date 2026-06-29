import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { getUserByUsername } from '@/../backend/db';
import { getSessionUser } from '@/lib/firebase/sessions';
import ProfilePageClient from '@/components/social/ProfilePageClient';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getUserByUsername(username);
  if (!profile) {
    return { title: 'User Not Found — TheLyst' };
  }
  return {
    title: `${profile.name || username} (@${profile.username}) — TheLyst`,
    description: `View ${profile.name || username}'s media tracking list, stats, and watch progress on TheLyst.`,
  };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getUserByUsername(username);
  
  if (!profile) {
    notFound();
  }

  const currentUser = await getSessionUser();
  const isOwner = currentUser?.uid === profile.uid;

  // Check Follow Status
  let followStatus: 'following' | 'requested' | 'none' = 'none';
  if (currentUser && !isOwner) {
    const { getFollowStatus } = await import('@/../backend/db');
    followStatus = await getFollowStatus(currentUser.uid, profile.uid);
  }

  // Safe cast profile document for client serialization
  const clientProfile = {
    uid: profile.uid,
    email: isOwner ? profile.email : undefined, // only share email with the owner
    name: profile.name || '',
    username: profile.username,
    createdAt: profile.createdAt || '',
    followingCount: profile.followingCount || 0,
    followerCount: profile.followerCount || 0,
    preferences: {
      profilePublic: profile.preferences?.profilePublic ?? false,
      scoreSystem: profile.preferences?.scoreSystem ?? '10point',
    },
    favoriteGenres: profile.favoriteGenres || [],
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Back Header navigation */}
      <header className="bg-secondary/30 border-b border-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/home" className="text-sm font-semibold text-muted hover:text-foreground flex items-center gap-1.5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
          {isOwner && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted border border-border px-2 py-0.5 rounded">
              Your Public Profile
            </span>
          )}
        </div>
      </header>

      <ProfilePageClient
        profile={clientProfile}
        isOwner={isOwner}
        initialFollowStatus={followStatus}
        currentUser={currentUser ? { uid: currentUser.uid } : null}
      />
    </div>
  );
}
