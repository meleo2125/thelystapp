'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/../backend/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/../backend/firebase';
import SearchBar from './SearchBar';
import SearchDropdown from './SearchDropdown';
import Button from '../ui/Button';
import MediaImage from '../ui/MediaImage';
import { ConfirmDialog } from '../ui/Dialog';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: string;
  type:
    | 'follow_request'
    | 'follow'
    | 'recommendation'
    | 'like'
    | 'lyst_clone'
    | 'lyst_like';
  requesterUid?: string;
  requesterUsername?: string;
  mediaType?: 'movie' | 'tv' | 'anime';
  sourceId?: number;
  mediaTitle?: string;
  lystId?: string;
  lystName?: string;
  read: boolean;
  createdAt: string;
}

interface ActivityFeedItem {
  id: string;
  uid: string;
  username: string;
  type: string;
  mediaType?: 'movie' | 'tv' | 'anime';
  sourceId?: number;
  mediaTitle?: string;
  mediaPoster?: string | null;
  detail: string;
  createdAt: string;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Notifications panel state.
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'alerts' | 'feed'>('alerts');


  // Friend activity feed.
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Recommendations.
  const [recs, setRecs] = useState<{ title: string; type: string; id: number }[]>([]);

  // Fetch username (single doc, cached in state).
  useEffect(() => {
    if (!user) {
      setUsername(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (cancelled) return;
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || null);
          if ((data.favoriteGenres || []).length > 0) {
            setRecs([
              { title: 'Chainsaw Man', type: 'anime', id: 1144132 },
              { title: 'Spider-Man: Beyond the Spider-Verse', type: 'movie', id: 569094 },
            ]);
          }
        }
      } catch (err) {
        console.error('Error fetching username for navbar:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Poll unread count and activities every 30s while authenticated.
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [notifRes, feedRes] = await Promise.all([
          fetch('/api/user/notifications'),
          fetch('/api/social/feed')
        ]);
        if (notifRes.ok) {
          const json = await notifRes.json();
          const list: NotificationItem[] = json.notifications || [];
          setUnreadCount(
            list.filter((n) => !n.read).length
          );
        }
        if (feedRes.ok) {
          const json = await feedRes.json();
          setFeedItems(json.data || json.activities || []);
        }
      } catch (err) {
        console.error('Error polling navbar data:', err);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('#notif-bell-btn') &&
        !target.closest('#notif-dropdown-panel')
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [isNotifOpen]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/user/notifications');
      if (res.ok) {
        const json = await res.json();
        const list: NotificationItem[] = json.notifications || [];
        setNotifications(list);
        setUnreadCount(0);
        await fetch('/api/user/notifications', { method: 'POST' });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await fetch('/api/social/feed');
      if (res.ok) {
        const json = await res.json();
        // FIX: API returns `data` (and now also `activities` for backwards
        // compat). Old code only read `data` which was undefined, leaving
        // the feed permanently empty.
        setFeedItems(json.data || json.activities || []);
      }
    } catch (err) {
      console.error('Failed to fetch social feed:', err);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const handleToggleNotif = async () => {
    const nextState = !isNotifOpen;
    setIsNotifOpen(nextState);
    if (nextState) {
      fetchNotifications();
      fetchFeed();
    }
  };

  const handleFollowAction = async (
    requesterUid: string,
    action: 'accept' | 'decline'
  ) => {
    try {
      const res = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requesterUid }),
      });
      if (res.ok) {
        toast.success(`Request ${action === 'accept' ? 'accepted' : 'declined'}`);
        fetchNotifications();
      } else {
        toast.error('Failed to process follow request');
      }
    } catch {
      toast.error('Error processing follow request');
    }
  };

  /**
   * Task 5: Clear all currently-visible notifications from the UI without
   * deleting them from Firestore.
   */
  const handleClearNotifications = async () => {
    try {
      const res = await fetch('/api/user/notifications', { method: 'DELETE' });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        toast.success('Notifications cleared');
      } else {
        toast.error('Failed to clear notifications');
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      toast.error('Error clearing notifications');
    }
  };

  const visibleNotifications = notifications;

  const handleClearFeed = async () => {
    try {
      const res = await fetch('/api/social/feed', { method: 'DELETE' });
      if (res.ok) {
        setFeedItems([]);
        toast.success('Activity feed cleared');
      } else {
        toast.error('Failed to clear activity feed');
      }
    } catch (err) {
      console.error('Failed to clear activity feed:', err);
      toast.error('Error clearing activity feed');
    }
  };

  const totalUnread = unreadCount + feedItems.length;

  const navLinks = [
    { href: '/home', label: 'Home' },
    { href: '/browse', label: 'Browse' },
    { href: '/list', label: 'My Lysts' },
  ];

  return (
    <>
      <header className="bg-secondary/70 border-b border-border fixed top-0 w-full z-50 backdrop-blur-xl h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/home"
              className="text-xl font-black tracking-widest text-primary uppercase select-none"
            >
              THELYST
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                      isActive ? 'text-primary' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop search */}
          <div className="hidden sm:block relative flex-1 max-w-md">
            <SearchBar
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setIsDropdownOpen(true);
              }}
              placeholder="Quick search media..."
            />
            <SearchDropdown
              query={searchQuery}
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
            />
          </div>

          {/* Right area */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 relative">
                <div className="static sm:relative">
                  <button
                    id="notif-bell-btn"
                    onClick={handleToggleNotif}
                    aria-label="Notifications"
                    aria-haspopup="dialog"
                    aria-expanded={isNotifOpen}
                    className="p-1.5 rounded-full hover:bg-white/5 text-muted hover:text-foreground transition-all cursor-pointer relative active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    {totalUnread > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-primary text-white rounded-full flex items-center justify-center animate-pulse select-none font-black w-4 h-4 text-[8px]">
                        {totalUnread}
                      </span>
                    )}
                  </button>

                  {isNotifOpen && (
                    <div
                      id="notif-dropdown-panel"
                      role="dialog"
                      aria-label="Notifications"
                      className="absolute right-0 top-12 mt-2 w-80 bg-secondary border border-border rounded-xl shadow-2xl z-50 p-4 space-y-4 max-h-[480px] overflow-y-auto fade-in"
                    >
                      {/* Tabs + Clear button (Task 5) */}
                      <div className="flex border-b border-border/50 pb-1.5 gap-4 items-center">
                        <button
                          onClick={() => setNotifTab('alerts')}
                          className={`text-xs font-bold pb-0.5 border-b cursor-pointer transition-colors ${
                            notifTab === 'alerts'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted hover:text-foreground'
                          }`}
                        >
                          Notifications
                        </button>
                        <button
                          onClick={() => setNotifTab('feed')}
                          className={`text-xs font-bold pb-0.5 border-b cursor-pointer transition-colors relative flex items-center gap-1.5 ${
                            notifTab === 'feed'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted hover:text-foreground'
                          }`}
                        >
                          Friend Activities
                          {feedItems.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-white font-bold scale-90">
                              {feedItems.length}
                            </span>
                          )}
                        </button>
                        {notifTab === 'alerts' && visibleNotifications.length > 0 && (
                          <button
                            onClick={handleClearNotifications}
                            className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted hover:text-primary cursor-pointer transition-colors"
                          >
                            Clear
                          </button>
                        )}
                        {notifTab === 'feed' && feedItems.length > 0 && (
                          <button
                            onClick={handleClearFeed}
                            className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted hover:text-primary cursor-pointer transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* TAB: Alerts */}
                      {notifTab === 'alerts' && (
                        <div className="space-y-3">
                          {visibleNotifications.filter((n) => n.type === 'follow_request').map((notif) => (
                            <div key={notif.id} className="bg-background border border-border p-3 rounded space-y-2 text-xs">
                              <p className="text-foreground leading-snug">
                                <Link href={`/u/${notif.requesterUsername}`} onClick={() => setIsNotifOpen(false)} className="font-bold hover:text-primary">
                                  @{notif.requesterUsername}
                                </Link>{' '}
                                requested to follow you.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleFollowAction(notif.requesterUid!, 'accept')}
                                  className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded cursor-pointer hover:bg-primary-dark active:scale-95"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleFollowAction(notif.requesterUid!, 'decline')}
                                  className="bg-white/5 border border-border text-foreground text-[10px] font-bold px-3 py-1 rounded cursor-pointer hover:bg-white/10 active:scale-95"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}

                          {visibleNotifications.filter((n) => n.type === 'follow').map((notif) => (
                            <div key={notif.id} className="text-xs flex gap-2.5 items-start border-b border-border/30 pb-2 last:border-0">
                              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[9px] font-black uppercase">
                                {notif.requesterUsername?.slice(0, 2)}
                              </div>
                              <p className="text-foreground flex-1 leading-snug">
                                <Link href={`/u/${notif.requesterUsername}`} onClick={() => setIsNotifOpen(false)} className="font-bold hover:text-primary">
                                  @{notif.requesterUsername}
                                </Link>{' '}
                                started following you.
                              </p>
                            </div>
                          ))}

                          {visibleNotifications.filter((n) => n.type === 'like').map((notif) => (
                            <div key={notif.id} className="text-xs flex gap-2.5 items-start border-b border-border/30 pb-2 last:border-0">
                              <div className="w-6 h-6 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500 text-[9px] font-black uppercase">
                                {notif.requesterUsername?.slice(0, 2)}
                              </div>
                              <p className="text-foreground flex-1 leading-snug">
                                <Link href={`/u/${notif.requesterUsername}`} onClick={() => setIsNotifOpen(false)} className="font-bold hover:text-primary">
                                  @{notif.requesterUsername}
                                </Link>{' '}
                                liked your review on{' '}
                                <Link href={`/${notif.mediaType}/${notif.sourceId}`} onClick={() => setIsNotifOpen(false)} className="font-bold text-primary hover:underline">
                                  {notif.mediaTitle}
                                </Link>
                                .
                              </p>
                            </div>
                          ))}

                          {visibleNotifications.filter((n) => n.type === 'lyst_like' || n.type === 'lyst_clone').map((notif) => (
                            <div key={notif.id} className="text-xs flex gap-2.5 items-start border-b border-border/30 pb-2 last:border-0">
                              <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 text-[9px] font-black uppercase">
                                {notif.requesterUsername?.slice(0, 2)}
                              </div>
                              <p className="text-foreground flex-1 leading-snug">
                                <Link href={`/u/${notif.requesterUsername}`} onClick={() => setIsNotifOpen(false)} className="font-bold hover:text-primary">
                                  @{notif.requesterUsername}
                                </Link>{' '}
                                {notif.type === 'lyst_like'
                                  ? <>liked your Lyst <strong className="text-primary">{notif.lystName}</strong></>
                                  : <>cloned your Lyst <strong className="text-primary">{notif.lystName}</strong></>}
                                .
                              </p>
                            </div>
                          ))}

                          {recs.length > 0 && (
                            <div className="border-t border-border/40 pt-3 space-y-2">
                              <span className="text-[9px] text-muted font-bold uppercase tracking-wider block">Recommended for you</span>
                              {recs.map((rec) => (
                                <div key={rec.id} className="text-xs flex justify-between items-center bg-background/40 border border-border/50 p-2 rounded">
                                  <div className="min-w-0 flex-1">
                                    <Link href={`/${rec.type}/${rec.id}`} onClick={() => setIsNotifOpen(false)} className="font-bold text-foreground hover:text-primary transition-colors block truncate">
                                      {rec.title}
                                    </Link>
                                    <span className="text-[9px] text-muted uppercase font-bold block mt-0.5">{rec.type}</span>
                                  </div>
                                  <Link href={`/${rec.type}/${rec.id}`} onClick={() => setIsNotifOpen(false)}>
                                    <button className="bg-primary/20 text-primary border border-primary/20 text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer hover:bg-primary/30">
                                      View
                                    </button>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}

                          {visibleNotifications.length === 0 && recs.length === 0 && (
                            <p className="text-xs text-muted text-center py-4">
                              No new notifications.
                            </p>
                          )}
                        </div>
                      )}

                      {/* TAB: Friend Activity Feed */}
                      {notifTab === 'feed' && (
                        <div className="space-y-3">
                          {feedLoading ? (
                            <div className="space-y-2 py-4">
                              <div className="h-10 bg-white/5 animate-pulse rounded" />
                              <div className="h-10 bg-white/5 animate-pulse rounded" />
                            </div>
                          ) : feedItems.length === 0 ? (
                            <p className="text-xs text-muted text-center py-4">
                              No friend activities logged yet.
                            </p>
                          ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                              {feedItems.map((act) => (
                                <div key={act.id} className="flex gap-2 items-start text-xs border-b border-border/30 pb-2.5 last:border-0 last:pb-0">
                                  {act.mediaPoster ? (
                                    <Link
                                      href={`/${act.mediaType}/${act.sourceId}`}
                                      onClick={() => setIsNotifOpen(false)}
                                      className="relative w-6 h-9 bg-background border border-border rounded overflow-hidden flex-shrink-0"
                                    >
                                      <MediaImage src={act.mediaPoster} alt={act.mediaTitle || ''} fill sizes="24px" />
                                    </Link>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[8px] font-black uppercase shrink-0">
                                      {act.username.slice(0, 2)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0 leading-tight">
                                    <p className="text-foreground">
                                      <Link href={`/u/${act.username}`} onClick={() => setIsNotifOpen(false)} className="font-bold hover:text-primary">
                                        @{act.username}
                                      </Link>{' '}
                                      <span className="text-muted">{act.detail}</span>{' '}
                                      {act.mediaTitle && (
                                        <Link href={`/${act.mediaType}/${act.sourceId}`} onClick={() => setIsNotifOpen(false)} className="font-bold text-primary-light hover:underline">
                                          {act.mediaTitle}
                                        </Link>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile link */}
                <Link
                  href={username ? `/u/${username}` : '/onboarding'}
                  className="flex items-center gap-2 text-xs font-bold text-muted hover:text-primary active:scale-95 transition-all truncate max-w-[150px] cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black uppercase text-[10px] select-none shrink-0">
                    {(user.displayName || user.email || 'U').slice(0, 2)}
                  </div>
                  <span className="hidden sm:inline">
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </span>
                </Link>

                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-400 active:scale-95 transition-all cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Log out?"
        description="Are you sure you want to end your current session and sign out of TheLyst?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        variant="danger"
        loading={loggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          setLoggingOut(true);
          try {
            await logout();
          } finally {
            setLoggingOut(false);
            setShowLogoutConfirm(false);
          }
        }}
      />
    </>
  );
}
