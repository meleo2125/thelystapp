'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useDialogs } from '@/lib/ui/dialogs';
import Button from '@/components/ui/Button';
import MediaImage from '@/components/ui/MediaImage';
import EmptyState from '@/components/ui/EmptyState';
import { Lyst, LystItemRef } from '@/types/list';

interface PublicLystClientProps {
  lyst: Lyst;
  items: LystItemRef[];
  ownerUid: string;
  ownerUsername: string;
  isOwner: boolean;
  isSignedIn: boolean;
  initialVote: 'like' | 'dislike' | 'none';
}

/**
 * Public Lyst viewer with like/dislike + clone (Tasks 2 & 3).
 */
const PublicLystClient: React.FC<PublicLystClientProps> = ({
  lyst: initialLyst,
  items,
  ownerUid,
  ownerUsername,
  isOwner,
  isSignedIn,
  initialVote,
}) => {
  const router = useRouter();
  const { confirm, alert } = useDialogs();
  const [lyst, setLyst] = useState<Lyst>(initialLyst);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | 'none'>(initialVote);
  const [voting, setVoting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const handleVote = async (target: 'like' | 'dislike') => {
    if (!isSignedIn) {
      await alert({
        title: 'Sign in required',
        description: 'You need to sign in to like or dislike a Lyst.',
        buttonLabel: 'OK',
      });
      return;
    }
    if (isOwner) {
      toast.error('You cannot vote on your own Lyst');
      return;
    }
    const nextVote: 'like' | 'dislike' | 'none' =
      userVote === target ? 'none' : target;

    // Optimistic update.
    const prevVote = userVote;
    const prevLyst = lyst;
    let newLikes = lyst.likesCount || 0;
    let newDislikes = lyst.dislikesCount || 0;
    if (prevVote === 'like') newLikes = Math.max(0, newLikes - 1);
    if (prevVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
    if (nextVote === 'like') newLikes++;
    if (nextVote === 'dislike') newDislikes++;
    setUserVote(nextVote);
    setLyst({ ...lyst, likesCount: newLikes, dislikesCount: newDislikes });

    setVoting(true);
    try {
      const res = await fetch(`/api/lysts/${lyst.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerUid, voteType: nextVote }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to register vote');
      }
      setLyst((cur) => ({
        ...cur,
        likesCount: json.likesCount ?? cur.likesCount,
        dislikesCount: json.dislikesCount ?? cur.dislikesCount,
      }));
    } catch (err: unknown) {
      // rollback
      setUserVote(prevVote);
      setLyst(prevLyst);
      toast.error(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  const handleClone = async () => {
    if (!isSignedIn) {
      await alert({
        title: 'Sign in required',
        description: 'Sign in to clone this Lyst into your account.',
        buttonLabel: 'OK',
      });
      return;
    }
    const ok = await confirm({
      title: 'Clone this Lyst?',
      description: `A private copy of "${lyst.name}" with ${lyst.itemCount} item${
        lyst.itemCount === 1 ? '' : 's'
      } will be added to your account. You can edit it freely.`,
      confirmLabel: 'Clone',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;

    setCloning(true);
    try {
      const res = await fetch(`/api/lysts/${lyst.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerUid }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to clone Lyst');
      }
      toast.success('Lyst cloned to your account');
      router.push('/list');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to clone Lyst');
    } finally {
      setCloning(false);
    }
  };

  const handleToggleVisibility = async () => {
    const newPublic = !lyst.isPublic;
    const ok = await confirm({
      title: newPublic ? 'Make this Lyst public?' : 'Make this Lyst private?',
      description: newPublic
        ? 'This Lyst will appear on your public profile and others can like, dislike, and clone it.'
        : 'This Lyst will be hidden from your profile. Existing votes will be preserved.',
      confirmLabel: newPublic ? 'Make Public' : 'Make Private',
      cancelLabel: 'Cancel',
    });
    if (!ok) return;
    setTogglingVisibility(true);
    try {
      const res = await fetch(`/api/lysts/${lyst.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerUid, isPublic: newPublic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update');
      setLyst((cur) => ({ ...cur, isPublic: newPublic }));
      toast.success(newPublic ? 'Lyst is now public' : 'Lyst is now private');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const net = (lyst.likesCount || 0) - (lyst.dislikesCount || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-secondary border border-border rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="relative w-24 h-32 rounded overflow-hidden border border-border bg-background shrink-0">
          <MediaImage src={lyst.coverPosterPath} alt={lyst.name} fill sizes="96px" priority />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {lyst.name}
            </h1>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                lyst.isPublic
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {lyst.isPublic ? 'Public' : 'Private'}
            </span>
            {lyst.clonedFrom && (
              <Link
                href={`/u/${lyst.clonedFrom.ownerUsername}/lyst/${lyst.clonedFrom.lystId}`}
                className="text-[10px] font-semibold text-muted hover:text-primary underline-offset-2 hover:underline"
              >
                cloned from @{lyst.clonedFrom.ownerUsername}
              </Link>
            )}
          </div>
          <p className="text-xs text-muted">
            by{' '}
            <Link href={`/u/${ownerUsername}`} className="font-bold hover:text-primary">
              @{ownerUsername}
            </Link>{' '}
            • {lyst.itemCount} item{lyst.itemCount === 1 ? '' : 's'} • net{' '}
            {net >= 0 ? `+${net}` : net}
          </p>
          {lyst.description && (
            <p className="text-sm text-foreground/80 leading-relaxed mt-1">
              {lyst.description}
            </p>
          )}

          {!isOwner && lyst.isPublic && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                disabled={voting}
                onClick={() => handleVote('like')}
                aria-pressed={userVote === 'like'}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  userVote === 'like'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background border-border text-foreground hover:bg-white/5'
                }`}
              >
                ▲ {lyst.likesCount || 0}
              </button>
              <button
                disabled={voting}
                onClick={() => handleVote('dislike')}
                aria-pressed={userVote === 'dislike'}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  userVote === 'dislike'
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-background border-border text-foreground hover:bg-white/5'
                }`}
              >
                ▼ {lyst.dislikesCount || 0}
              </button>
              <Button
                variant="primary"
                size="sm"
                isLoading={cloning}
                onClick={handleClone}
                className="ml-2"
              >
                Clone to my account
              </Button>
            </div>
          )}

          {isOwner && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                disabled={togglingVisibility}
                onClick={handleToggleVisibility}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors cursor-pointer disabled:opacity-50 ${
                  lyst.isPublic
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                {togglingVisibility ? (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : lyst.isPublic ? (
                  <>🔒 Make Private</>
                ) : (
                  <>🌐 Make Public</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <EmptyState
          title="This Lyst is empty"
          description="No items have been added to this Lyst yet."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
          {items.map((item) => (
            <Link
              key={item.entryId}
              href={`/${item.type}/${item.sourceId}`}
              className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow shadow-md"
            >
              <div className="relative aspect-[2/3] bg-background">
                <MediaImage
                  src={item.posterPath}
                  alt={item.title}
                  fill
                  sizes="(max-width:768px) 50vw, 200px"
                />
              </div>
              <div className="p-3">
                <span className="block text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </span>
                <span className="text-[10px] text-muted mt-1 block uppercase font-bold">
                  {item.type}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicLystClient;
