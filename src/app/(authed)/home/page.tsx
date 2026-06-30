'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/backend/AuthContext';
import { useList } from '@/hooks/useList';
import Button from '@/components/ui/Button';
import MediaImage from '@/components/ui/MediaImage';
import LystLeaderboard from '@/components/social/LystLeaderboard';
import { MediaSummary } from '@/types/media';
import { ListEntry } from '@/types/list';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { list, loading: listLoading, refresh } = useList();

  const [trendingMovies, setTrendingMovies] = useState<MediaSummary[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<MediaSummary[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const abort = new AbortController();
    (async () => {
      setTrendingLoading(true);
      try {
        const [moviesRes, animeRes] = await Promise.all([
          fetch('/api/media/trending?type=movie', { signal: abort.signal }),
          fetch('/api/media/trending?type=anime', { signal: abort.signal }),
        ]);
        const moviesJson = await moviesRes.json();
        const animeJson = await animeRes.json();
        setTrendingMovies(moviesJson.items || []);
        setTrendingAnime(animeJson.items || []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Failed to fetch trending media:', err);
        }
      } finally {
        setTrendingLoading(false);
      }
    })();
    return () => abort.abort();
  }, [user]);

  // Compute quick stats.
  const stats = useMemo(() => {
    let totalTracked = list.length;
    let watching = 0;
    let completed = 0;
    let totalScore = 0;
    let scoredCount = 0;
    list.forEach((item) => {
      if (item.status === 'watching') watching++;
      if (item.status === 'completed') completed++;
      if (item.score !== null) {
        totalScore += item.score;
        scoredCount++;
      }
    });
    const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : '—';
    return { totalTracked, watching, completed, avgScore };
  }, [list]);

  const watchingItems = useMemo(
    () => list.filter((item) => item.status === 'watching' && item.type !== 'movie'),
    [list]
  );

  const recentlyUpdated = useMemo(
    () =>
      [...list]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 6),
    [list]
  );

  const planToWatch = useMemo(
    () => list.filter((item) => item.status === 'plan_to_watch').slice(0, 6),
    [list]
  );

  const handleIncrementProgress = async (item: ListEntry) => {
    const nextProgress = item.progress + 1;
    if (item.cache.totalEpisodes && nextProgress > item.cache.totalEpisodes) return;
    try {
      const res = await fetch(`/api/list/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: nextProgress,
          status:
            item.cache.totalEpisodes && nextProgress === item.cache.totalEpisodes
              ? 'completed'
              : 'watching',
        }),
      });
      if (res.ok) {
        toast.success(`Updated progress for ${item.cache.title}`);
        refresh();
      } else {
        const errJson = await res.json().catch(() => ({}));
        toast.error(errJson.error || 'Failed to update progress');
      }
    } catch {
      toast.error('Network error updating progress');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
      {/* Hero */}
      <div className="relative overflow-hidden bg-secondary border border-border p-6 sm:p-8 rounded-xl shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Welcome Back,{' '}
            <span className="text-primary">
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </span>
            !
          </h1>
          <p className="text-sm text-muted">
            Track your favorite shows, movies, and anime adaptations in one clean cinematic space.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/browse">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              Browse Catalog
            </Button>
          </Link>
          <Link href="/list">
            <Button variant="primary" size="sm" className="cursor-pointer">
              My Lysts
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-secondary/50 border border-border p-4 rounded-xl text-center md:text-left">
          <span className="text-[10px] text-muted font-bold uppercase block mb-1">Total Tracked</span>
          <span className="text-2xl font-black text-foreground">{stats.totalTracked}</span>
        </div>
        <div className="bg-secondary/50 border border-border p-4 rounded-xl text-center md:text-left">
          <span className="text-[10px] text-muted font-bold uppercase block mb-1">Watching</span>
          <span className="text-2xl font-black text-primary">{stats.watching}</span>
        </div>
        <div className="bg-secondary/50 border border-border p-4 rounded-xl text-center md:text-left">
          <span className="text-[10px] text-muted font-bold uppercase block mb-1">Completed</span>
          <span className="text-2xl font-black text-green-500">{stats.completed}</span>
        </div>
        <div className="bg-secondary/50 border border-border p-4 rounded-xl text-center md:text-left">
          <span className="text-[10px] text-muted font-bold uppercase block mb-1">Avg Rating</span>
          <span className="text-2xl font-black text-rating">{stats.avgScore}</span>
        </div>
      </div>

      {/* Public Lyst leaderboard (Task 3) */}
      <div className="mb-10">
        <LystLeaderboard defaultWindow="week" />
      </div>

      <div className="space-y-10">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Continue Watching</h2>
          {listLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-28 bg-white/5 animate-pulse rounded-lg border border-border/40" />
              ))}
            </div>
          ) : watchingItems.length === 0 ? (
            <div className="bg-secondary/40 border border-border border-dashed p-8 rounded-lg text-center">
              <p className="text-sm text-muted mb-4">No active shows currently in progress.</p>
              <Link href="/browse">
                <Button variant="secondary" size="sm" className="cursor-pointer">
                  Discover Content
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {watchingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 bg-secondary border border-border p-3 rounded-lg media-glow transition-all"
                >
                  <Link
                    href={`/${item.type}/${item.sourceId}`}
                    className="relative w-14 h-20 rounded overflow-hidden border border-border flex-shrink-0 bg-background"
                  >
                    <MediaImage src={item.cache.posterPath} alt={item.cache.title} fill sizes="56px" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${item.type}/${item.sourceId}`}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {item.cache.title}
                    </Link>
                    <span className="text-[10px] text-muted font-bold uppercase block mt-0.5">
                      {item.type === 'tv' ? 'TV Show' : item.type}
                    </span>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <div className="flex-1 bg-background rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{
                            width: `${
                              item.cache.totalEpisodes
                                ? Math.min(100, (item.progress / item.cache.totalEpisodes) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-muted select-none">
                        {item.progress} / {item.cache.totalEpisodes || '—'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleIncrementProgress(item)}
                    className="w-8 h-8 rounded bg-background border border-border text-foreground hover:bg-white/5 active:scale-90 transition-all flex items-center justify-center cursor-pointer shrink-0"
                    title="Increment episode"
                    aria-label="Increment episode"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {planToWatch.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Plan to Watch</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {planToWatch.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow w-full"
                >
                  <Link href={`/${item.type}/${item.sourceId}`} className="relative aspect-[2/3] block bg-background">
                    <MediaImage src={item.cache.posterPath} alt={item.cache.title} fill sizes="(max-width:768px) 50vw, 200px" />
                  </Link>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <Link
                      href={`/${item.type}/${item.sourceId}`}
                      className="hover:text-primary transition-colors text-xs font-bold text-foreground line-clamp-2 leading-tight"
                    >
                      {item.cache.title}
                    </Link>
                    <span className="text-[10px] text-muted block mt-1 uppercase font-bold">{item.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentlyUpdated.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Recently Updated</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {recentlyUpdated.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow w-full"
                >
                  <Link href={`/${item.type}/${item.sourceId}`} className="relative aspect-[2/3] block bg-background">
                    <MediaImage src={item.cache.posterPath} alt={item.cache.title} fill sizes="(max-width:768px) 50vw, 200px" />
                    {item.score !== null && (
                      <span className="absolute top-2 left-2 bg-rating/90 border border-rating/20 text-foreground font-black text-[10px] px-1.5 py-0.5 rounded shadow">
                        ★ {item.score}
                      </span>
                    )}
                  </Link>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <Link
                      href={`/${item.type}/${item.sourceId}`}
                      className="hover:text-primary transition-colors text-xs font-bold text-foreground line-clamp-2 leading-tight"
                    >
                      {item.cache.title}
                    </Link>
                    <span className="text-[10px] text-primary-light font-bold block mt-1 uppercase">
                      {item.status === 'none' ? 'saved' : item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-10 border-t border-border/40 pt-8 mt-10">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Trending Movies</h2>
          {trendingLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-white/5 animate-pulse rounded-lg border border-border/40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
              {trendingMovies.slice(0, 6).map((movie) => (
                <div
                  key={`${movie.type}-${movie.sourceId}`}
                  className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow w-full"
                >
                  <Link href={`/movie/${movie.sourceId}`} className="relative aspect-[2/3] block bg-background">
                    <MediaImage src={movie.posterPath} alt={movie.title} fill sizes="(max-width:768px) 50vw, 200px" />
                    {movie.aggregateScore !== null && (
                      <span className="absolute top-2 left-2 bg-rating/90 border border-rating/20 text-foreground font-black text-[10px] px-1.5 py-0.5 rounded shadow">
                        ★ {movie.aggregateScore.toFixed(1)}
                      </span>
                    )}
                  </Link>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <Link
                      href={`/movie/${movie.sourceId}`}
                      className="hover:text-primary transition-colors text-xs font-bold text-foreground line-clamp-2 leading-tight"
                    >
                      {movie.title}
                    </Link>
                    <span className="text-[10px] text-muted block mt-1">{movie.year || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Popular Anime</h2>
          {trendingLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-white/5 animate-pulse rounded-lg border border-border/40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
              {trendingAnime.slice(0, 6).map((anime) => (
                <div
                  key={`${anime.type}-${anime.sourceId}`}
                  className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow w-full"
                >
                  <Link href={`/anime/${anime.sourceId}`} className="relative aspect-[2/3] block bg-background">
                    <MediaImage src={anime.posterPath} alt={anime.title} fill sizes="(max-width:768px) 50vw, 200px" />
                    {anime.aggregateScore !== null && (
                      <span className="absolute top-2 left-2 bg-rating/90 border border-rating/20 text-foreground font-black text-[10px] px-1.5 py-0.5 rounded shadow">
                        ★ {anime.aggregateScore.toFixed(1)}
                      </span>
                    )}
                  </Link>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <Link
                      href={`/anime/${anime.sourceId}`}
                      className="hover:text-primary transition-colors text-xs font-bold text-foreground line-clamp-2 leading-tight"
                    >
                      {anime.title}
                    </Link>
                    <span className="text-[10px] text-muted block mt-1">{anime.year || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
