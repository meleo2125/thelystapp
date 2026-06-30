'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  AuthError,
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  register: (email: string, password: string, name: string, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: (redirectTo?: string) => Promise<void>;
  verifySession: () => Promise<boolean>;
  linkEmailPassword: (password: string) => Promise<void>;
  hasPassword: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /**
   * Send the current Firebase ID token to the server so it can be set as
   * an HTTP-only session cookie. Robust against stripped Content-Type and
   * non-JSON responses.
   */
  const setSessionCookie = useCallback(async (u: User) => {
    const token = await u.getIdToken();
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error(`Invalid response content type: ${ct || 'unknown'}`);
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to set session cookie');
    }
    return data;
  }, []);

  const verifySession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) return false;
      const data = await response.json();
      return !!data.authenticated;
    } catch (error) {
      console.error('Session verification error:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          setUser(authUser);
          await setSessionCookie(authUser);
        } else {
          await fetch('/api/auth/session', {
            method: 'DELETE',
            credentials: 'include',
          });
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(authUser ?? null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [setSessionCookie]);

  const handleAuthError = (error: unknown): never => {
    console.error('Authentication error:', error);
    const authError = error as AuthError;
    switch (authError.code) {
      case 'auth/invalid-credential':
        throw new Error(
          'Invalid email or password. If you signed up with Google, try the Google sign-in button.'
        );
      case 'auth/user-not-found':
        throw new Error('User not found');
      case 'auth/wrong-password':
        throw new Error('Invalid password');
      case 'auth/email-already-in-use':
        throw new Error('Email already in use');
      case 'auth/weak-password':
        throw new Error('Password is too weak');
      case 'auth/invalid-email':
        throw new Error('Invalid email format');
      case 'auth/network-request-failed':
        throw new Error('Network error. Please check your connection and try again.');
      case 'auth/too-many-requests':
        throw new Error('Too many attempts. Please wait a moment and try again.');
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        throw new Error('Sign-in was cancelled.');
      default:
        throw error instanceof Error ? error : new Error('Authentication failed');
    }
  };

  const login = async (email: string, password: string, redirectTo = '/home') => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await setSessionCookie(userCredential.user);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();
      if (userData && !userData.onboardingCompleted) {
        // If onboarding is not complete, redirect to onboarding while passing the final destination
        const dest = redirectTo !== '/home' ? `/onboarding?callbackUrl=${encodeURIComponent(redirectTo)}` : '/onboarding';
        router.push(dest);
      } else {
        router.push(redirectTo);
      }
    } catch (error) {
      handleAuthError(error);
    }
  };

  const register = async (email: string, password: string, name: string, redirectTo = '/onboarding') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        name,
        createdAt: new Date().toISOString(),
        emailVerified: true,
      });
      await setSessionCookie(userCredential.user);

      // Fire-and-forget sync of emailVerified to Admin SDK.
      fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uid: userCredential.user.uid }),
      }).catch((err) => console.warn('Could not sync emailVerified flag:', err));

      router.push(redirectTo);
    } catch (error) {
      handleAuthError(error);
    }
  };

  const googleSignIn = async (redirectTo = '/home') => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;

      const userDoc = await getDoc(doc(db, 'users', u.uid));
      let isNew = false;
      if (!userDoc.exists()) {
        isNew = true;
        await setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          name: u.displayName,
          photoURL: u.photoURL,
          createdAt: new Date().toISOString(),
          emailVerified: true,
        });
      }

      await setSessionCookie(u);

      if (isNew) {
        const dest = redirectTo !== '/home' ? `/onboarding?callbackUrl=${encodeURIComponent(redirectTo)}` : '/onboarding';
        router.push(dest);
      } else {
        const userData = userDoc.data();
        if (userData && !userData.onboardingCompleted) {
          const dest = redirectTo !== '/home' ? `/onboarding?callbackUrl=${encodeURIComponent(redirectTo)}` : '/onboarding';
          router.push(dest);
        } else {
          router.push(redirectTo);
        }
      }
    } catch (error) {
      handleAuthError(error);
    }
  };

  const logout = async () => {
    try {
      // Clear the session cookie *before* signing out of Firebase so that
      // middleware redirects immediately on the next navigation.
      await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
      setUser(null);
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      handleAuthError(error);
    }
  };

  const linkEmailPassword = async (password: string) => {
    try {
      if (!user) {
        throw new Error('User not logged in');
      }
      if (!user.email) {
        throw new Error('Cannot set a password without a primary email');
      }
      const credential = EmailAuthProvider.credential(user.email, password);
      try {
        await linkWithCredential(user, credential);
        return;
      } catch (error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/requires-recent-login') {
          await reauthenticateWithPopup(user, googleProvider);
          await linkWithCredential(user, credential);
        } else {
          throw error;
        }
      }
    } catch (error) {
      handleAuthError(error);
    }
  };

  const hasPassword = useCallback(
    () =>
      !!user &&
      user.providerData.some((provider) => provider.providerId === 'password'),
    [user]
  );

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    googleSignIn,
    verifySession,
    linkEmailPassword,
    hasPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
