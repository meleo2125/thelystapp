'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useAuth } from '@/../backend/AuthContext';
import toast from 'react-hot-toast';

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Tracking revealed spoiler reviews by UID
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/media/reviews?type=${type}&sourceId=${sourceId}`);
      if (res.ok) {
        const json = await res.json();
        setReviews(json.reviews || []);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [type, sourceId]);

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
          cache: {
            title: mediaTitle,
            posterPath,
          },
        }),
      });

      if (res.ok) {
        toast.success('Review posted successfully!');
        setContent('');
        setIsSpoiler(false);
        setRating(null);
        fetchReviews();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to post review');
      }
    } catch (err) {
      toast.error('Network error posting review');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewUid: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      const res = await fetch(`/api/media/reviews?type=${type}&sourceId=${sourceId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Review deleted');
        fetchReviews();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to delete review');
      }
    } catch (err) {
      toast.error('Network error deleting review');
    }
  };

  const handleVote = async (reviewUid: string, targetVote: 'like' | 'dislike') => {
    if (!user) {
      toast.error('You must be signed in to vote on reviews');
      return;
    }

    // Prevent self-voting
    if (user.uid === reviewUid) {
      toast.error('You cannot vote on your own review');
      return;
    }

    const reviewIndex = reviews.findIndex((r) => r.uid === reviewUid);
    if (reviewIndex === -1) return;

    const currentReview = reviews[reviewIndex];
    const currentVote = currentReview.userVote || 'none';
    const voteType = currentVote === targetVote ? 'none' : targetVote;

    // Optimistic UI updates
    const updatedReviews = [...reviews];
    let newLikes = currentReview.likesCount || 0;
    let newDislikes = currentReview.dislikesCount || 0;

    if (currentVote === 'like') newLikes = Math.max(0, newLikes - 1);
    if (currentVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1);

    if (voteType === 'like') newLikes++;
    if (voteType === 'dislike') newDislikes++;

    updatedReviews[reviewIndex] = {
      ...currentReview,
      userVote: voteType,
      likesCount: newLikes,
      dislikesCount: newDislikes,
    };
    setReviews(updatedReviews);

    try {
      const res = await fetch('/api/media/reviews/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          sourceId,
          reviewUid,
          voteType,
          mediaTitle,
        }),
      });
      if (!res.ok) {
        fetchReviews();
        toast.error('Failed to register vote');
      }
    } catch (err) {
      fetchReviews();
      toast.error('Network error registering vote');
    }
  };

  const toggleRevealSpoiler = (uid: string) => {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [uid]: !prev[uid],
    }));
  };

  return (
    <div id="reviews-section" className="space-y-6 mt-12 border-t border-border/40 pt-8 fade-in">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-extrabold tracking-tight">User Reviews</h3>
        <span className="bg-secondary border border-border text-muted font-bold text-xs px-2 py-0.5 rounded-full shrink-0">
          {reviews.length}
        </span>
      </div>

      {/* Review Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="bg-secondary/40 border border-border/60 rounded-xl p-5 space-y-4 shadow-md">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Write a Review</h4>
          
          {/* Interactive Star Selector */}
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

      {/* Reviews List */}
      {fetching ? (
        <div className="space-y-4">
          <div className="h-20 bg-secondary/50 rounded-xl animate-pulse" />
          <div className="h-20 bg-secondary/50 rounded-xl animate-pulse" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-muted italic">No reviews written for this title yet. Be the first to share your thoughts!</p>
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
                {/* Review Header */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <Link
                      href={`/u/${rev.username}`}
                      className="text-sm font-black text-foreground hover:text-primary transition-colors"
                    >
                      @{rev.username}
                    </Link>
                    <span className="text-xs text-muted">{formattedDate}</span>
                    {hasSpoiler && (
                      <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                        Spoiler
                      </span>
                    )}
                    {rev.rating !== null && rev.rating !== undefined && (
                      <span className="text-rating text-sm ml-2 select-none" title={`${rev.rating} stars`}>
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </span>
                    )}
                  </div>

                  {isMyReview && (
                    <button
                      onClick={() => handleDelete(rev.uid)}
                      className="text-muted hover:text-primary transition-colors cursor-pointer select-none p-1 rounded hover:bg-white/5 active:scale-95"
                      title="Delete Review"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Review Content */}
                <div className="relative">
                  {hasSpoiler && !isRevealed ? (
                    <div className="relative">
                      {/* Blurred review backdrop */}
                      <p className="text-xs text-muted leading-relaxed select-none blur-sm filter pr-2 line-clamp-3">
                        {rev.content}
                      </p>
                      {/* Unblur Overlay trigger */}
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

                {/* Review Votes Row */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/20">
                  {/* Vote counts are always shown; buttons are hidden on own reviews */}
                  {isMyReview ? (
                    // Own review: show read-only counts with no interactive buttons
                    <>
                      <span className="flex items-center gap-1.5 text-xs text-muted select-none">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.156c1.246 0 2.227 1.077 2.115 2.308a18.318 18.318 0 0 1-1.045 4.5c-.7 2.01-2.6 3.324-4.73 3.324H11a3 3 0 0 1-3-3V12m-3.75 3h-.75A2.25 2.25 0 0 1 1.5 12.75v-4.5A2.25 2.25 0 0 1 3.75 6H5.25m-1.5 9h1.5" />
                        </svg>
                        <span>{rev.likesCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted select-none">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54" />
                        </svg>
                        <span>{rev.dislikesCount || 0}</span>
                      </span>
                    </>
                  ) : (
                    // Other reviews: show interactive like/dislike buttons
                    <>
                      <button
                        onClick={() => handleVote(rev.uid, 'like')}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer ${
                          rev.userVote === 'like' ? 'text-primary' : 'text-muted'
                        }`}
                        title="Like Review"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill={rev.userVote === 'like' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.156c1.246 0 2.227 1.077 2.115 2.308a18.318 18.318 0 0 1-1.045 4.5c-.7 2.01-2.6 3.324-4.73 3.324H11a3 3 0 0 1-3-3V12m-3.75 3h-.75A2.25 2.25 0 0 1 1.5 12.75v-4.5A2.25 2.25 0 0 1 3.75 6H5.25m-1.5 9h1.5" />
                        </svg>
                        <span>{rev.likesCount || 0}</span>
                      </button>

                      <button
                        onClick={() => handleVote(rev.uid, 'dislike')}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer ${
                          rev.userVote === 'dislike' ? 'text-rose-500' : 'text-muted'
                        }`}
                        title="Dislike Review"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill={rev.userVote === 'dislike' ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54" />
                        </svg>
                        <span>{rev.dislikesCount || 0}</span>
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
