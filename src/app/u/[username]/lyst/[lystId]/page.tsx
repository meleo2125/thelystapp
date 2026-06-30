import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  getUserByUsername,
  getLyst,
  getLystItems,
  getUserVoteOnLyst,
} from '@/../backend/db';
import { getSessionUser } from '@/lib/firebase/sessions';
import PublicLystClient from '@/components/social/PublicLystClient';

interface LystPageProps {
  params: Promise<{ username: string; lystId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: LystPageProps): Promise<Metadata> {
  const { username, lystId } = await params;
  const profile = await getUserByUsername(username);
  if (!profile) {
    return { title: 'Lyst Not Found — TheLyst' };
  }
  const lyst = await getLyst(profile.uid, lystId);
  if (!lyst) {
    return { title: 'Lyst Not Found — TheLyst' };
  }
  return {
    title: `${lyst.name} by @${profile.username} — TheLyst`,
    description: lyst.description || `A custom Lyst curated by @${profile.username}.`,
  };
}

export default async function PublicLystPage({ params, searchParams }: LystPageProps) {
  const { username, lystId } = await params;
  const sParams = await searchParams;
  const profile = await getUserByUsername(username);
  if (!profile) {
    notFound();
  }

  const lyst = await getLyst(profile.uid, lystId);
  if (!lyst) {
    notFound();
  }

  const sessionUser = await getSessionUser();
  const isOwner = sessionUser?.uid === profile.uid;

  if (!lyst.isPublic && !isOwner) {
    notFound();
  }

  const items = await getLystItems(profile.uid, lystId);
  const userVote = sessionUser && !isOwner
    ? await getUserVoteOnLyst(profile.uid, lystId, sessionUser.uid)
    : 'none';

  const referrer = sParams.referrer;
  const backHref = referrer === 'home'
    ? '/home'
    : (isOwner ? '/list?tab=lysts' : `/u/${profile.username}`);
  const backLabel = referrer === 'home'
    ? 'Back to Home'
    : (isOwner ? 'Back to My Lysts' : `Back to @${profile.username}`);

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <header className="bg-secondary/30 border-b border-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href={backHref}
            className="text-sm font-semibold text-muted hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            {backLabel}
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <PublicLystClient
          lyst={lyst}
          items={items}
          ownerUid={profile.uid}
          ownerUsername={profile.username}
          isOwner={isOwner}
          isSignedIn={!!sessionUser}
          initialVote={userVote}
        />
      </main>
    </div>
  );
}
