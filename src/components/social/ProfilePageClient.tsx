'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/../backend/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import MediaImage from '@/components/ui/MediaImage';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import MediaCard from '@/components/media/MediaCard';
import FollowButton from '@/components/social/FollowButton';
import ActivityHeatmap from '@/components/social/ActivityHeatmap';
import { ListEntry, Lyst } from '@/types/list';
import { MediaSummary } from '@/types/media';

interface PasswordFormData {
  password: string;
  confirmPassword: string;
}

interface ProfilePageClientProps {
  profile: {
    uid: string;
    email?: string;
    name?: string;
    username: string;
    createdAt?: string;
    followingCount?: number;
    followerCount?: number;
    preferences?: {
      profilePublic?: boolean;
      scoreSystem?: '10point' | '5star';
    };
    favoriteGenres?: string[];
  };
  isOwner: boolean;
  initialFollowStatus: 'following' | 'requested' | 'none';
  currentUser: { uid: string } | null;
}

const POPULAR_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 
  'Isekai', 'Shounen', 'Seinen', 'Shoujo', 'Slice of Life', 'Mecha'
];

export default function ProfilePageClient({
  profile,
  isOwner,
  initialFollowStatus,
  currentUser,
}: ProfilePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, linkEmailPassword, hasPassword } = useAuth();

  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<'lyst' | 'lysts' | 'stats' | 'settings'>('lyst');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'stats' || tabParam === 'settings' || tabParam === 'lyst' || tabParam === 'lysts') {
      setActiveTab(tabParam as 'lyst' | 'lysts' | 'stats' | 'settings');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'lyst' | 'lysts' | 'stats' | 'settings') => {
    setActiveTab(tab);
    router.replace(`/u/${profile.username}?tab=${tab}`);
  };

  // Watch List state
  const [watchList, setWatchList] = useState<ListEntry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [watchStatusFilter, setWatchStatusFilter] = useState<'all' | 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped'>('all');

  // Custom Lysts state (public lysts visible on profile)
  const [publicLysts, setPublicLysts] = useState<Lyst[]>([]);
  const [lystsLoading, setLystsLoading] = useState(true);

  const filteredWatchList = useMemo(
    () => watchStatusFilter === 'all' ? watchList : watchList.filter((i) => i.status === watchStatusFilter),
    [watchList, watchStatusFilter]
  );

  // Settings State Hooks
  const [claimedUsername, setClaimedUsername] = useState(profile.username);
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const [scoreSystem, setScoreSystem] = useState<'10point' | '5star'>(profile.preferences?.scoreSystem || '10point');
  const [profilePublic, setProfilePublic] = useState(profile.preferences?.profilePublic || false);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);

  const [selectedGenres, setSelectedGenres] = useState<string[]>(profile.favoriteGenres || []);
  const [isUpdatingGenres, setIsUpdatingGenres] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const hasPasswordAuth = hasPassword ? hasPassword() : false;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<PasswordFormData>();

  const password = watch('password');

  // Fetch watchlyst (only items with a real watch status — not lyst-only items)
  useEffect(() => {
    const fetchWatchList = async () => {
      setListLoading(true);
      try {
        const res = await fetch(`/api/list?username=${profile.username}`);
        if (res.ok) {
          const json = await res.json();
          // Only show items that have an actual watch status (not lyst-only / no-status entries)
          const all: ListEntry[] = json.data || [];
          setWatchList(all.filter((item) => item.status !== 'none'));
          setIsPrivateAccount(false);
        } else if (res.status === 403) {
          setIsPrivateAccount(true);
          const tabParam = searchParams.get('tab');
          if (!tabParam || tabParam === 'lyst' || tabParam === 'stats') {
            setActiveTab('lysts');
          }
        }
      } catch (err) {
        console.error('Error loading watchlist:', err);
      } finally {
        setListLoading(false);
      }
    };
    fetchWatchList();
  }, [profile.username, searchParams]);

  // Fetch public custom lysts for this profile
  useEffect(() => {
    const fetchLysts = async () => {
      setLystsLoading(true);
      try {
        const res = await fetch(`/api/lysts?username=${profile.username}`);
        if (res.ok) {
          const json = await res.json();
          // Only show public lysts on the profile
          const all: Lyst[] = json.data || [];
          setPublicLysts(all.filter((l) => l.isPublic));
        }
      } catch (err) {
        console.error('Error loading lysts:', err);
      } finally {
        setLystsLoading(false);
      }
    };
    fetchLysts();
  }, [profile.username]);

  // Compute Stats — only count completed/watching items from the watchlyst.
  // Items added purely via custom Lysts (status === 'none') are excluded.
  const stats = useMemo(() => {
    // Only items that have been actively watched (completed or watching) affect stats
    const activeItems = watchList.filter(
      (item) => item.status === 'completed' || item.status === 'watching'
    );

    let moviesCount = 0;
    let tvCount = 0;
    let animeCount = 0;
    let totalEpisodes = 0;
    let completedCount = 0;
    let onHoldCount = 0;
    let droppedCount = 0;
    let planToWatchCount = 0;
    let watchingCount = 0;
    let scoredCount = 0;
    let totalScore = 0;
    const scoreMap = Array(10).fill(0);

    // Status breakdown counts from the full watchlyst (all non-none statuses)
    watchList.forEach((item) => {
      if (item.status === 'completed') completedCount++;
      else if (item.status === 'watching') watchingCount++;
      else if (item.status === 'plan_to_watch') planToWatchCount++;
      else if (item.status === 'on_hold') onHoldCount++;
      else if (item.status === 'dropped') droppedCount++;
    });

    // Format counts, episode progress and scores only from completed/watching items
    activeItems.forEach((item) => {
      if (item.type === 'movie') moviesCount++;
      else if (item.type === 'tv') tvCount++;
      else if (item.type === 'anime') animeCount++;

      if (item.type !== 'movie') totalEpisodes += item.progress;

      if (item.score !== null && item.score >= 1 && item.score <= 10) {
        scoredCount++;
        totalScore += item.score;
        scoreMap[item.score - 1]++;
      }
    });

    const estimatedMinutes = moviesCount * 120 + activeItems.reduce((acc, item) => {
      if (item.type === 'tv') return acc + item.progress * 45;
      if (item.type === 'anime') return acc + item.progress * 24;
      return acc;
    }, 0);
    const estimatedHours = Math.round(estimatedMinutes / 60);
    const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : '—';
    const maxScoreCount = Math.max(...scoreMap, 1);

    const recentlyCompleted = [...watchList]
      .filter((item) => item.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);

    const totalActiveCount = activeItems.length;

    return {
      moviesCount,
      tvCount,
      animeCount,
      totalEpisodes,
      completedCount,
      watchingCount,
      planToWatchCount,
      onHoldCount,
      droppedCount,
      estimatedHours,
      avgScore,
      scoreMap,
      maxScoreCount,
      recentlyCompleted,
      totalActiveCount,
    };
  }, [watchList]);

  // Onboarding settings handlers
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setIsUpdatingUsername(true);
    try {
      const res = await fetch('/api/user/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Username claimed successfully!');
        setClaimedUsername(json.username);
        router.replace(`/u/${json.username}?tab=settings`);
      } else {
        toast.error(json.error === 'username_taken' ? 'Username is already taken!' : json.error || 'Failed to update username');
      }
    } catch (err) {
      toast.error('Network error claiming username');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPrefs(true);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreSystem, profilePublic }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Preferences updated successfully!');
      } else {
        toast.error(json.error || 'Failed to update preferences');
      }
    } catch (err) {
      toast.error('Network error updating preferences');
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  const handleToggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleUpdateGenres = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingGenres(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favoriteGenres: selectedGenres }),
      });
      if (res.ok) {
        toast.success('Favorite genres updated successfully!');
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to update genres');
      }
    } catch (err) {
      toast.error('Network error updating genres');
    } finally {
      setIsUpdatingGenres(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    try {
      setIsPasswordLoading(true);
      await linkEmailPassword(data.password);
      toast.success('Password set successfully');
      reset();
    } catch (error: unknown) {
      console.error('Error setting password:', error);
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to set password. Please try again.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm1 = confirm('Are you sure you want to permanently delete your account? This action cannot be undone.');
    if (!confirm1) return;

    const confirm2 = confirm('WARNING: This will erase all your watchlyst tracking details, custom ratings, and profile data from our databases. Continue?');
    if (!confirm2) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Your account has been deleted.');
        await logout();
        router.replace('/register');
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to delete account');
      }
    } catch (err) {
      toast.error('Network error deleting account');
    } finally {
      setIsDeleting(false);
    }
  };

  const joinDate = profile.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-secondary border border-border p-6 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl font-black uppercase">
            {profile.name ? profile.name.slice(0, 2) : profile.username.slice(0, 2)}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">{profile.name || profile.username}</h1>
            <p className="text-xs text-muted font-semibold">@{claimedUsername}</p>
            <p className="text-[10px] text-muted">Joined {joinDate}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="text-xs text-muted">
            <strong className="text-foreground text-sm font-bold mr-1">{profile.followingCount || 0}</strong> Following
          </div>

          {currentUser && !isOwner ? (
            <FollowButton
              targetUid={profile.uid}
              initialStatus={initialFollowStatus}
              initialFollowerCount={profile.followerCount || 0}
            />
          ) : (
            <div className="text-xs text-muted">
              <strong className="text-foreground text-sm font-bold mr-1">{profile.followerCount || 0}</strong> Followers
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher Navigation */}
      <div className="flex border-b border-border/60 pb-px gap-6">
        <button
          onClick={() => handleTabChange('lyst')}
          className={`pb-2 text-sm font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1 ${
            activeTab === 'lyst' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Watch Lyst {isPrivateAccount && !isOwner && <span className="text-[10px]">🔒</span>}
        </button>
        <button
          onClick={() => handleTabChange('lysts')}
          className={`pb-2 text-sm font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'lysts' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Lysts{publicLysts.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted font-semibold">
              {publicLysts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('stats')}
          className={`pb-2 text-sm font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1 ${
            activeTab === 'stats' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Watch Stats {isPrivateAccount && !isOwner && <span className="text-[10px]">🔒</span>}
        </button>
            {isOwner && (
              <button
                onClick={() => handleTabChange('settings')}
                className={`pb-2 text-sm font-bold border-b-2 cursor-pointer transition-colors ${
                  activeTab === 'settings' ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                Settings
              </button>
            )}
          </div>

          {/* TAB 1: Watchlyst Grid */}
          {activeTab === 'lyst' && (
            isPrivateAccount && !isOwner ? (
              <div className="bg-secondary/40 border border-border rounded-xl p-12 text-center max-w-lg mx-auto flex flex-col items-center gap-4 shadow-xl fade-in mt-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-foreground">This Account is Private</h2>
                  <p className="text-xs text-muted leading-relaxed max-w-sm">
                    Follow @{profile.username} to see their watch lists and track progress.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 fade-in">
                {/* Status filter tabs */}
                {!listLoading && watchList.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {([
                      { value: 'all', label: 'All' },
                      { value: 'watching', label: 'Watching' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'plan_to_watch', label: 'Plan to Watch' },
                      { value: 'on_hold', label: 'On Hold' },
                      { value: 'dropped', label: 'Dropped' },
                    ] as const).map((tab) => {
                      const count = tab.value === 'all'
                        ? watchList.length
                        : watchList.filter((i) => i.status === tab.value).length;
                      const isActive = watchStatusFilter === tab.value;
                      return (
                        <button
                          key={tab.value}
                          onClick={() => setWatchStatusFilter(tab.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'bg-secondary border border-border text-muted hover:text-foreground hover:border-primary/30'
                          }`}
                        >
                          {tab.label}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-background text-muted'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {listLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-48 bg-secondary/50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredWatchList.length === 0 ? (
                  <EmptyState
                    title={watchList.length === 0 ? 'Empty Watchlyst' : 'No matches'}
                    description={
                      watchList.length === 0
                        ? 'No media has been added to this list yet.'
                        : 'No items match this status filter.'
                    }
                    {...(watchStatusFilter !== 'all' && watchList.length > 0 ? {
                      actionLabel: 'Show All',
                      onAction: () => setWatchStatusFilter('all'),
                    } : {})}
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                    {filteredWatchList.map((item) => {
                      const mediaSummary: MediaSummary = {
                        type: item.type,
                        sourceId: item.sourceId,
                        title: item.cache.title,
                        posterPath: item.cache.posterPath,
                        year: item.cache.year,
                        aggregateScore: null,
                      };
                      return (
                        <div key={item.id} className="relative group">
                          <MediaCard media={mediaSummary} />
                          {/* Status badge */}
                          <div className="absolute top-2 right-2 scale-90 origin-top-right">
                            <StatusBadge status={item.status} />
                          </div>
                          {/* rating display */}
                          {item.score !== null && (
                            <div className="absolute bottom-2 left-2 bg-black/85 border border-rating/30 text-rating text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg">
                              ★ {item.score}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* TAB: Public Lysts */}
          {activeTab === 'lysts' && (
            <div className="space-y-6 fade-in">
              {isOwner && (
                <p className="text-xs text-muted">
                  Only your <strong className="text-foreground">public</strong> Lysts are shown here. Manage all your Lysts from{' '}
                  <a href="/list" className="text-primary hover:underline font-semibold">My Lysts</a>.
                </p>
              )}
              {lystsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 bg-secondary/50 animate-pulse rounded-xl border border-border/40" />
                  ))}
                </div>
              ) : publicLysts.length === 0 ? (
                <EmptyState
                  title="No Public Lysts"
                  description={isOwner
                    ? 'You have no public Lysts yet. Create one and make it public so others can see and vote on it!'
                    : 'This user has no public Lysts yet.'}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicLysts.map((lyst) => (
                    <a
                      key={lyst.id}
                      href={`/u/${profile.username}/lyst/${lyst.id}`}
                      className="bg-secondary border border-border rounded-xl p-4 flex gap-4 items-start hover:border-primary/40 transition-colors group shadow-md"
                    >
                      {lyst.coverPosterPath && (
                        <div className="relative w-14 h-20 rounded overflow-hidden border border-border bg-background flex-shrink-0">
                          <MediaImage src={lyst.coverPosterPath} alt={lyst.name} fill sizes="56px" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="block font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {lyst.name}
                        </span>
                        <p className="text-[10px] text-muted font-semibold">
                          {lyst.itemCount} item{lyst.itemCount !== 1 ? 's' : ''}
                        </p>
                        {lyst.description && (
                          <p className="text-xs text-foreground/70 line-clamp-2 leading-relaxed">
                            {lyst.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-muted">
                          <span className="text-green-500">▲ {lyst.likesCount || 0}</span>
                          <span className="text-rose-500">▼ {lyst.dislikesCount || 0}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Watch Stats */}
          {activeTab === 'stats' && (
            isPrivateAccount && !isOwner ? (
              <div className="bg-secondary/40 border border-border rounded-xl p-12 text-center max-w-lg mx-auto flex flex-col items-center gap-4 shadow-xl fade-in mt-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-foreground">This Account is Private</h2>
                  <p className="text-xs text-muted leading-relaxed max-w-sm">
                    Follow @{profile.username} to see their watch statistics and track progress.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8 fade-in">
                {/* Heatmap Section */}
                <ActivityHeatmap list={watchList} />

                {/* Stats Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-secondary border border-border p-5 rounded-xl text-center">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Time Watched</span>
                    <span className="text-2xl font-black text-foreground">{stats.estimatedHours} <span className="text-xs text-muted">hrs</span></span>
                  </div>
                  <div className="bg-secondary border border-border p-5 rounded-xl text-center">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Episodes Logged</span>
                    <span className="text-2xl font-black text-foreground">{stats.totalEpisodes}</span>
                  </div>
                  <div className="bg-secondary border border-border p-5 rounded-xl text-center">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Mean Score</span>
                    <span className="text-2xl font-black text-rating">{stats.avgScore}</span>
                  </div>
                  <div className="bg-secondary border border-border p-5 rounded-xl text-center">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Completed</span>
                    <span className="text-2xl font-black text-green-500">{stats.completedCount}</span>
                  </div>
                </div>

                {stats.totalActiveCount > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left stats blocks */}
                    <div className="flex flex-col gap-8">
                      {/* Score Distribution */}
                      <div className="bg-secondary border border-border p-6 rounded-xl">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-6">Score Distribution</h3>
                        <div className="flex items-end justify-between h-48 pt-4 px-2 bg-background/25 rounded border border-border/40">
                          {stats.scoreMap.map((count, index) => {
                            const scoreLabel = index + 1;
                            const heightPercent = (count / stats.maxScoreCount) * 100;
                            return (
                              <div key={scoreLabel} className="flex flex-col items-center flex-1 group relative">
                                <span className="absolute bottom-full mb-1 bg-black border border-border text-foreground font-semibold text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  {count} item{count !== 1 ? 's' : ''}
                                </span>
                                <div
                                  className="w-4 sm:w-6 bg-primary rounded-t-sm transition-all duration-500 ease-out"
                                  style={{ height: `${heightPercent || 2}%`, opacity: heightPercent > 0 ? 1 : 0.15 }}
                                />
                                <span className="text-[10px] text-muted font-bold mt-2">{scoreLabel}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Formats ratio — based on actively watched (completed/watching) items only */}
                      <div className="bg-secondary border border-border p-6 rounded-xl">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-4">Formats Ratio</h3>
                        <div className="flex flex-col gap-4">
                          <div className="flex rounded-full overflow-hidden h-4 bg-background border border-border/50">
                            {stats.moviesCount > 0 && (
                              <div
                                className="bg-primary"
                                style={{ width: `${(stats.moviesCount / stats.totalActiveCount) * 100}%` }}
                                title={`Movies: ${stats.moviesCount}`}
                              />
                            )}
                            {stats.tvCount > 0 && (
                              <div
                                className="bg-primary-light"
                                style={{ width: `${(stats.tvCount / stats.totalActiveCount) * 100}%` }}
                                title={`TV Shows: ${stats.tvCount}`}
                              />
                            )}
                            {stats.animeCount > 0 && (
                              <div
                                className="bg-rating"
                                style={{ width: `${(stats.animeCount / stats.totalActiveCount) * 100}%` }}
                                title={`Anime: ${stats.animeCount}`}
                              />
                            )}
                          </div>

                          <div className="flex justify-between items-center text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                              <span>Movies ({stats.moviesCount})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary-light" />
                              <span>TV Shows ({stats.tvCount})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-rating" />
                              <span>Anime ({stats.animeCount})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right stats blocks */}
                    <div className="flex flex-col gap-8">
                      {/* Status breakdown */}
                      <div className="bg-secondary border border-border p-6 rounded-xl">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-4">Status Summary</h3>
                        <div className="flex flex-col gap-3 font-semibold text-sm">
                          <div className="flex justify-between items-center p-2.5 rounded bg-background/25 border border-border/40">
                            <span className="text-primary-light">Watching</span>
                            <span>{stats.watchingCount}</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 rounded bg-background/25 border border-border/40">
                            <span className="text-green-500">Completed</span>
                            <span>{stats.completedCount}</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 rounded bg-background/25 border border-border/40">
                            <span className="text-muted">Plan to Watch</span>
                            <span>{stats.planToWatchCount}</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 rounded bg-background/25 border border-border/40">
                            <span className="text-amber-500">On Hold</span>
                            <span>{stats.onHoldCount}</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 rounded bg-background/25 border border-border/40">
                            <span className="text-rose-500">Dropped</span>
                            <span>{stats.droppedCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Recently completed */}
                      <div className="bg-secondary border border-border p-6 rounded-xl">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-4">Recently Completed</h3>
                        {stats.recentlyCompleted.length === 0 ? (
                          <p className="text-xs text-muted">No completed titles logged.</p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {stats.recentlyCompleted.map((item) => (
                              <div key={item.id} className="flex items-center gap-3">
                                <Link href={`/${item.type}/${item.sourceId}`} className="relative w-8 h-12 rounded overflow-hidden border border-border bg-background flex-shrink-0">
                                  <MediaImage src={item.cache.posterPath} alt={item.cache.title} fill sizes="32px" />
                                </Link>
                                <div className="flex-1 min-w-0">
                                  <Link href={`/${item.type}/${item.sourceId}`} className="font-bold text-sm text-foreground hover:text-primary transition-colors block truncate">
                                    {item.cache.title}
                                  </Link>
                                  <span className="text-[10px] text-muted uppercase font-bold block mt-0.5">
                                    {item.type} {item.score ? `• Rated ${item.score}/10` : ''}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* TAB 3: Settings Panel (Owner only) */}
          {activeTab === 'settings' && isOwner && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 items-start fade-in animate-fadeIn">
              <div className="space-y-8">
                {/* Profile Identity */}
                <div className="bg-secondary border border-border rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Profile Identity</h3>
                  <form onSubmit={handleUpdateUsername} className="space-y-4 max-w-md">
                    <div className="space-y-1">
                      <span className="text-xs text-muted font-semibold">Registered Email</span>
                      <p className="text-sm font-bold text-foreground bg-background/50 border border-border px-3 py-2 rounded select-none">
                        {profile.email || 'N/A'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted font-semibold block" htmlFor="username-input">
                        Claim Username (alphanumeric, 3-20 chars)
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="username-input"
                          type="text"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="e.g. tracking_king"
                          disabled={isUpdatingUsername}
                          className="flex-1 h-10 px-3 rounded bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          isLoading={isUpdatingUsername}
                          disabled={usernameInput.trim().toLowerCase() === claimedUsername.toLowerCase()}
                        >
                          Claim
                        </Button>
                      </div>
                      {claimedUsername && (
                        <p className="text-xs text-green-500 font-semibold">
                          Current username: <strong className="text-foreground">@{claimedUsername}</strong>
                        </p>
                      )}
                    </div>
                  </form>
                </div>

                {/* Password Credentials Backup */}
                <div className="bg-secondary border border-border rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Credentials Security</h3>
                  <div className="max-w-md">
                    <div className="mb-4 space-y-1.5 text-xs text-muted font-semibold">
                      <p>
                        Backup Password Auth: <strong className={hasPasswordAuth ? 'text-green-500' : 'text-amber-500'}>{hasPasswordAuth ? 'Configured' : 'Not configured'}</strong>
                      </p>
                    </div>

                    {!hasPasswordAuth && (
                      <div className="border-t border-border/40 pt-4">
                        <h4 className="text-sm font-bold text-foreground mb-1">Set a Password</h4>
                        <p className="text-xs text-muted mb-4 leading-relaxed">
                          Set a backup password to enable email & password OTP logins in addition to Google OAuth.
                        </p>

                        <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
                          <Input
                            label="New Password"
                            type="password"
                            fullWidth
                            {...register('password', {
                              required: 'Password is required',
                              minLength: {
                                value: 8,
                                message: 'Password must be at least 8 characters',
                              },
                            })}
                            error={errors.password?.message}
                            placeholder="********"
                          />
                          <Input
                            label="Confirm Password"
                            type="password"
                            fullWidth
                            {...register('confirmPassword', {
                              required: 'Confirm your password',
                              validate: (val) => val === password || 'Passwords do not match',
                            })}
                            error={errors.confirmPassword?.message}
                            placeholder="********"
                          />
                          <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            isLoading={isPasswordLoading}
                          >
                            Set Backup Password
                          </Button>
                        </form>
                      </div>
                    )}

                    {hasPasswordAuth && (
                      <p className="text-xs text-green-500 font-semibold flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                        </svg>
                        You can sign in using email & password
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Settings columns */}
              <div className="space-y-6">
                {/* Application Preferences */}
                <div className="bg-secondary border border-border rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Application Preferences</h3>
                  <form onSubmit={handleUpdatePreferences} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted font-semibold block" htmlFor="score-system-select">
                        Rating System
                      </label>
                      <select
                        id="score-system-select"
                        value={scoreSystem}
                        onChange={(e) => setScoreSystem(e.target.value as '10point' | '5star')}
                        disabled={isUpdatingPrefs}
                        className="w-full h-10 px-3 rounded bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                      >
                        <option value="10point">10-Point scale (1-10)</option>
                        <option value="5star">5-Star scale (halves)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between py-2 border-t border-border/40">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground">Public Profile</span>
                        <span className="text-[10px] text-muted leading-relaxed">Allow others to view your stats and watchlist.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={profilePublic}
                        onChange={(e) => setProfilePublic(e.target.checked)}
                        disabled={isUpdatingPrefs}
                        className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-2 cursor-pointer"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isUpdatingPrefs}
                    >
                      Save Preferences
                    </Button>
                  </form>
                </div>

                {/* Favorite Genres Card */}
                <div className="bg-secondary border border-border rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Favorite Genres</h3>
                  <form onSubmit={handleUpdateGenres} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {POPULAR_GENRES.map((genre) => {
                        const isSelected = selectedGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => handleToggleGenre(genre)}
                            className={`h-8 rounded text-[10px] font-bold transition-all border flex items-center justify-center cursor-pointer select-none ${
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
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isUpdatingGenres}
                      disabled={isUpdatingGenres}
                    >
                      Save Genres
                    </Button>
                  </form>
                </div>

                {/* Danger zone */}
                <div className="bg-secondary border border-rose-500/20 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-2">Danger Zone</h3>
                  <p className="text-xs text-muted mb-4 leading-relaxed">
                    Permanently delete your account and all data from our databases.
                  </p>
                  <Button
                    variant="secondary"
                    fullWidth
                    isLoading={isDeleting}
                    onClick={handleDeleteAccount}
                    className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          )}
    </main>
  );
}
