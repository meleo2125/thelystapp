'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/../backend/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/../backend/firebase';
import SearchBar from './SearchBar';
import SearchDropdown from './SearchDropdown';
import Button from '../ui/Button';
import MediaImage from '../ui/MediaImage';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: string;
  type: 'follow_request' | 'follow' | 'recommendation' | 'like';
  requesterUid?: string;
  requesterUsername?: string;
  mediaType?: 'movie' | 'tv' | 'anime';
  sourceId?: number;
  mediaTitle?: string;
  reviewId?: string;
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
  mediaPoster?: string;
  detail: string;
  createdAt: string;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Notifications Panel State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasOpenedNotifsOnce, setHasOpenedNotifsOnce] = useState(false);
  const [notifTab, setNotifTab] = useState<'alerts' | 'feed'>('alerts');

  // Feed State
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  // Recommendations State
  const [recs, setRecs] = useState<{ title: string; type: string; id: number }[]>([]);

  useEffect(() => {
    if (!user) {
      setUsername(null);
      return;
    }

    const fetchUsername = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUsername(userData.username || null);

          // Get mock recommendation releases based on favorite genres
          const favGenres = userData.favoriteGenres || [];
          if (favGenres.length > 0) {
            // Generate a couple of recommendation objects
            setRecs([
              { title: 'Chainsaw Man', type: 'anime', id: 1144132 },
              { title: 'Spider-Man: Beyond the Spider-Verse', type: 'movie', id: 569094 }
            ]);
          }
        }
      } catch (err) {
        console.error('Error fetching username for navbar:', err);
      }
    };
    fetchUsername();
  }, [user]);

  // Periodically fetch notifications unread count
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/user/notifications');
        if (res.ok) {
          const json = await res.json();
          const list = json.notifications || [];
          setUnreadCount(list.filter((n: NotificationItem) => !n.read).length);
        }
      } catch (err) {
        console.error('Error checking unread notifications count:', err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#notif-bell-btn') && !target.closest('#notif-dropdown-panel')) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [isNotifOpen]);

  const handleToggleNotif = async () => {
    const nextState = !isNotifOpen;
    setIsNotifOpen(nextState);
    if (nextState) {
      setHasOpenedNotifsOnce(true);
      fetchNotifications();
      fetchFeed();
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/user/notifications');
      if (res.ok) {
        const json = await res.json();
        const list = json.notifications || [];
        setNotifications(list);
        setUnreadCount(0);
        // Mark as read in DB
        await fetch('/api/user/notifications', { method: 'POST' });
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const fetchFeed = async () => {
    setFeedLoading(true);
    try {
      const res = await fetch('/api/social/feed');
      if (res.ok) {
        const json = await res.json();
        setFeedItems(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch social feed:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleFollowAction = async (requesterUid: string, action: 'accept' | 'decline') => {
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
    } catch (err) {
      toast.error('Error processing follow request');
    }
  };

  const navLinks = [
    { href: '/home', label: 'Home' },
    { href: '/browse', label: 'Browse' },
    { href: '/list', label: 'My Lysts' },
  ];

  return (
    <>
      <header className="bg-secondary/70 border-b border-border fixed top-0 w-full z-50 backdrop-blur-xl h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-6">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/home" className="text-xl font-black tracking-widest text-primary uppercase select-none">
              THELYST
            </Link>
            
            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                      isActive
                        ? 'text-primary'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Global Desktop Search Input */}
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

          {/* Auth / Right Area */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 relative">
                
                {/* Notifications Bell Icon */}
                <div className="relative">
                  <button
                    id="notif-bell-btn"
                    onClick={handleToggleNotif}
                    className="p-1.5 rounded-full hover:bg-white/5 text-muted hover:text-foreground transition-all cursor-pointer relative active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-primary text-white rounded-full flex items-center justify-center animate-pulse select-none font-black w-4 h-4 text-[8px]">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown Panel */}
                  {isNotifOpen && (
                    <>
                      <div id="notif-dropdown-panel" className="absolute right-0 top-12 mt-2 w-80 bg-secondary border border-border rounded-xl shadow-2xl z-50 p-4 space-y-4 max-h-[480px] overflow-y-auto fade-in">
                        
                        {/* Tab Headers */}
                        <div className="flex border-b border-border/50 pb-1.5 gap-4">
                          <button
                            onClick={() => setNotifTab('alerts')}
                            className={`text-xs font-bold pb-0.5 border-b cursor-pointer transition-colors ${
                              notifTab === 'alerts' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
                            }`}
                          >
                            Notifications
                          </button>
                          <button
                            onClick={() => setNotifTab('feed')}
                            className={`text-xs font-bold pb-0.5 border-b cursor-pointer transition-colors ${
                              notifTab === 'feed' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
                            }`}
                          >
                            Friend Activities
                          </button>
                        </div>

                        {/* TAB 1: Alerts notifications list */}
                        {notifTab === 'alerts' && (
                          <div className="space-y-3">
                            {/* Follow Requests */}
                            {notifications.filter(n => n.type === 'follow_request').map((notif) => (
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

                            {/* Started Following Alerts */}
                            {notifications.filter(n => n.type === 'follow').map((notif) => (
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

                            {/* Review Like Alerts */}
                            {notifications.filter(n => n.type === 'like').map((notif) => (
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
                                  </Link>.
                                </p>
                              </div>
                            ))}

                            {/* Recommendations */}
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

                            {notifications.length === 0 && recs.length === 0 && (
                              <p className="text-xs text-muted text-center py-4">No recent notifications.</p>
                            )}
                          </div>
                        )}

                        {/* TAB 2: Friend Activity Feed */}
                        {notifTab === 'feed' && (
                          <div className="space-y-3">
                            {feedLoading ? (
                              <div className="space-y-2 py-4">
                                <div className="h-10 bg-white/5 animate-pulse rounded" />
                                <div className="h-10 bg-white/5 animate-pulse rounded" />
                              </div>
                            ) : feedItems.length === 0 ? (
                              <p className="text-xs text-muted text-center py-4">No friend activities logged yet.</p>
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
                    </>
                  )}
                </div>

                {/* Profile Link and Avatar */}
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

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative w-full max-w-sm bg-secondary border border-border rounded-xl p-6 shadow-2xl z-10 fade-in text-center sm:text-left">
            <h3 className="text-lg font-bold text-foreground mb-2 flex items-center justify-center sm:justify-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-primary">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H9a.75.75 0 0 0 0 1.5h9.25A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M14.78 6.97a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06l2.47-2.47-2.47-2.47a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
              Log Out
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-6">
              Are you sure you want to end your current session and sign out of TheLyst?
            </p>
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => {
                setShowLogoutConfirm(false);
                logout();
              }} className="cursor-pointer">
                Log Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
