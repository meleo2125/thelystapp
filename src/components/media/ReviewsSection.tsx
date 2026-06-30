'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { useAuth } from '@/backend/AuthContext';
import { useDialogs } from '@/lib/ui/dialogs';

interface Review {
  uid: string;
  username: string;
  content: string;
  isSpoiler: boolean;
  rating: number | null;
  likesCount?: number;
  dislikesCount?: number;
  userVote?: 'like' | 'dislike' | 'none';
  createdAt: string;
  updatedAt: string;
}

interface ReviewsSectionProps {
  type: 'movie' | 'tv' | 'anime';
  sourceId: number;
  mediaTitle: string;
  posterPath: string | null;
}

export default function ReviewsSection({
  type,
  sourceId,
  mediaTitle,
  posterPath,
}: ReviewsSectionProps) {
  const { user } = useAuth();
  const { confirm } = useDialogs();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/media/reviews?type=${type}&sourceId=${sourceId}`
      );
      if (res.ok) {
        const json = await res.json();
        setReviews(json.reviews || []);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setFetching(false);
    }
  }, [type, sourceId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/media/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          sourceId,
          content,
          isSpoiler,
          rating,
          cache: { title: mediaTitle, posterPath },
        }),
      });
      if (res.ok) {
        toast.success('Review posted successfully!');
        setContent('');
        setIsSpoiler(false);
        setRating(null);
        fetchReviews();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Failed to post review');
      }
    } catch {
      toast.error('Network error posting review');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete your review?',
      description: 'This action is permanent and cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/media/reviews?type=${type}&sourceId=${sourceId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        toast.success('Review deleted');
        fetchReviews();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Failed to delete review');
      }
    } catch {
      toast.error('Network error deleting review');
    }
  };

  const handleVote = async (reviewUid: string, targetVote: 'like' | 'dislike') => {
    if (!user) {
      toast.error('You must be signed in to vote on reviews');
      return;
    }
    if (user.uid === reviewUid) {
      toast.error('You cannot vote on your own review');
      return;
    }
    const reviewIndex = reviews.findIndex((r) => r.uid === reviewUid);
    if (reviewIndex === -1) return;
    const currentReview = reviews[reviewIndex];
    const currentVote = currentReview.userVote || 'none';
    const voteType = currentVote === targetVote ? 'none' : targetVote;

    // Optimistic update
    const prev = reviews;
    const updated = [...reviews];
    let newLikes = currentReview.likesCount || 0;
    let newDislikes = currentReview.dislikesCount || 0;
    if (currentVote === 'like') newLikes = Math.max(0, newLikes - 1);
    if (currentVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
    if (voteType === 'like') newLikes++;
    if (voteType === 'dislike') newDislikes++;
    updated[reviewIndex] = {
      ...currentReview,
      userVote: voteType,
      likesCount: newLikes,
      dislikesCount: newDislikes,
    };
    setReviews(updated);

    try {
      const res = await fetch('/api/media/reviews/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, sourceId, reviewUid, voteType, mediaTitle }),
      });
      if (!res.ok) {
        // Rollback
        setReviews(prev);
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Failed to register vote');
      }
    } catch {
      setReviews(prev);
      toast.error('Network error registering vote');
    }
  };

  const toggleRevealSpoiler = (uid: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [uid]: !prev[uid] }));
  };

  return (
    <div
      id="reviews-section"
      className="space-y-6 mt-12 border-t border-border/40 pt-8 fade-in"
    >
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-extrabold tracking-tight">User Reviews</h3>
        <span className="bg-secondary border border-border text-muted font-bold text-xs px-2 py-0.5 rounded-full shrink-0">
          {reviews.length}
        </span>
      </div>

      {user ? (
        <form
          onSubmit={handleSubmit}
          className="bg-secondary/40 border border-border/60 rounded-xl p-5 space-y-4 shadow-md"
        >
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
            Write a Review
          </h4>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted font-semibold">Your Rating (Optional)</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="text-2xl cursor-pointer text-rating transition-all duration-100 hover:scale-110 active:scale-95 focus:outline-none"
                  aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                >
                  {star <= (hoverRating || rating || 0) ? '★' : '☆'}
                </button>
              ))}
              {rating !== null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="text-[10px] text-muted hover:text-primary ml-2 cursor-pointer select-none"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts on this title..."
            rows={4}
            maxLength={5000}
            className="w-full bg-secondary border border-border/80 focus:border-primary/60 rounded-lg p-3 text-sm text-foreground focus:outline-none transition-colors placeholder:text-muted"
            required
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="checkbox checkbox-xs checkbox-primary rounded"
              />
              This review contains spoilers
            </label>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={loading}
              disabled={!content.trim()}
              className="cursor-pointer font-bold px-6"
            >
              Post Review
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-secondary/20 border border-border/40 rounded-xl p-6 text-center">
          <p className="text-xs text-muted mb-3">You must be signed in to write a review.</p>
          <Link href="/login">
            <Button variant="secondary" size="sm" className="cursor-pointer font-bold">
              Sign In
            </Button>
          </Link>
        </div>
      )}

      {fetching ? (
        <div className="space-y-4">
          <div className="h-20 bg-secondary/50 rounded-xl animate-pulse" />
          <div className="h-20 bg-secondary/50 rounded-xl animate-pulse" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-muted italic">
          No reviews written for this title yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const isMyReview = user?.uid === rev.uid;
            const hasSpoiler = rev.isSpoiler;
            const isRevealed = revealedSpoilers[rev.uid] || false;
            const formattedDate = new Date(rev.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={rev.uid}
                className="bg-secondary/35 border border-border/40 rounded-xl p-5 space-y-3 relative group shadow-sm hover:border-border/60 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <Link href={`/u/${rev.username}`} className="text-sm font-black text-foreground hover:text-primary transition-colors">
                      @{rev.username}
                    </Link>
                    <span className="text-xs text-muted">{formattedDate}</span>
                    {hasSpoiler && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                        Spoiler
                      </span>
                    )}
                    {rev.rating !== null && rev.rating !== undefined && (
                      <span
                        className="text-rating text-sm ml-2 select-none"
                        title={`${rev.rating} stars`}
                        aria-label={`Rating: ${rev.rating} of 5`}
                      >
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(5 - rev.rating)}
                      </span>
                    )}
                  </div>

                  {isMyReview && (
                    <button
                      onClick={handleDelete}
                      className="text-muted hover:text-primary transition-colors cursor-pointer select-none p-1 rounded hover:bg-white/5 active:scale-95"
                      title="Delete Review"
                      aria-label="Delete review"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="relative">
                  {hasSpoiler && !isRevealed ? (
                    <div className="relative">
                      <p className="text-xs text-muted leading-relaxed select-none blur-sm filter pr-2 line-clamp-3">
                        {rev.content}
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center bg-background/10">
                        <button
                          type="button"
                          onClick={() => toggleRevealSpoiler(rev.uid)}
                          className="bg-secondary border border-border text-foreground hover:border-primary/50 text-[10px] font-bold py-1.5 px-3 rounded shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
                        >
                          Click to reveal spoilers
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {rev.content}
                      </p>
                      {hasSpoiler && isRevealed && (
                        <button
                          type="button"
                          onClick={() => toggleRevealSpoiler(rev.uid)}
                          className="text-[9px] text-muted hover:text-primary transition-colors cursor-pointer block mt-2"
                        >
                          Hide spoilers
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-border/20">
                  {isMyReview ? (
                    <>
                      <span className="flex items-center gap-1.5 text-xs text-muted select-none">
                        ▲ {rev.likesCount || 0}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted select-none">
                        ▼ {rev.dislikesCount || 0}
                      </span>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleVote(rev.uid, 'like')}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer ${
                          rev.userVote === 'like' ? 'text-primary' : 'text-muted'
                        }`}
                        title="Like Review"
                        aria-pressed={rev.userVote === 'like'}
                      >
                        ▲ {rev.likesCount || 0}
                      </button>
                      <button
                        onClick={() => handleVote(rev.uid, 'dislike')}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer ${
                          rev.userVote === 'dislike' ? 'text-rose-500' : 'text-muted'
                        }`}
                        title="Dislike Review"
                        aria-pressed={rev.userVote === 'dislike'}
                      >
                        ▼ {rev.dislikesCount || 0}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
