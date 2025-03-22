'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  reauthenticateWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<void>;
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

  // Function to set the session cookie
  const setSessionCookie = async (user: User) => {
    try {
      // Get the authentication token
      const token = await user.getIdToken();
      
      // Save the token in a cookie via API
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      
      // Check if the response has a valid content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid response content type: ${contentType}`);
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set session cookie');
      }
      
      return data;
    } catch (error) {
      console.error('Error setting session cookie:', error);
      throw error; // Re-throw to handle in calling function
    }
  };

  // Verify the session token on the server
  const verifySession = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        // Include credentials to send cookies
        credentials: 'include',
        // Add cache control to prevent caching of this critical request
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      // Check if the response is valid JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid response content type:', contentType);
        return false;
      }
      
      const data = await response.json();
      return data.authenticated;
    } catch (error) {
      console.error('Session verification error:', error);
      return false;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          // Update user state first with the latest data
          setUser(authUser);
          // Then set the session cookie
          await setSessionCookie(authUser);
        } else {
          // Clear the session cookie when signed out
          await fetch('/api/auth/session', { method: 'DELETE' });
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        // Even if setting the cookie fails, we should update the user state
        if (authUser) {
          setUser(authUser);
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    });

    // On initial load, verify the session server-side
    const checkSession = async () => {
      try {
        const isAuthenticated = await verifySession();
        if (!isAuthenticated && !user) {
          // If the server says we're not authenticated and we don't have a user,
          // make sure our state reflects that
          setUser(null);
        }
      } catch (error) {
        console.error('Initial session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    return () => unsubscribe();
  }, []);

  const handleAuthError = (error: unknown) => {
    console.error('Authentication error:', error);
    
    // Cast to AuthError if it's from Firebase Auth
    const authError = error as AuthError;
    
    // Add specific error handling based on error codes
    switch(authError.code) {
      case 'auth/invalid-credential':
        throw new Error('Invalid email or password');
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
      default:
        throw error; // Re-throw the original error if not handled
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // No need to setUser, onAuthStateChanged listener will handle it
      await setSessionCookie(userCredential.user);
      router.push('/home');
    } catch (error) {
      handleAuthError(error);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Add user profile to Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        name,
        createdAt: new Date().toISOString(),
        emailVerified: true, // We've verified via OTP
      });
      
      // No need to setUser, onAuthStateChanged listener will handle it
      await setSessionCookie(userCredential.user);
      router.push('/home');
    } catch (error) {
      handleAuthError(error);
    }
  };

  const googleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document if not exists
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          emailVerified: user.emailVerified || true, // Google OAuth verified emails are trusted
        });
      }
      
      // No need to setUser, onAuthStateChanged listener will handle it
      await setSessionCookie(user);
      router.push('/home');
    } catch (error) {
      handleAuthError(error);
    }
  };

  const logout = async () => {
    try {
      // First, clear the session cookie directly
      await fetch('/api/auth/session', { 
        method: 'DELETE',
        credentials: 'include'
      });
      
      // Set user to null immediately to trigger UI updates
      setUser(null);
      
      // Then sign out from Firebase
      await signOut(auth);
      
      // Navigate to login page after everything is cleared
      router.replace('/login');
    } catch (error) {
      handleAuthError(error);
    }
  };

  // Add new linkEmailPassword method  
  const linkEmailPassword = async (password: string) => {
    try {
      if (!user) {
        throw new Error('User not logged in');
      }
      
      // Create email/password credential
      const credential = EmailAuthProvider.credential(user.email!, password);
      
      try {
        // Try to link the credential to the user
        await linkWithCredential(user, credential);
        return;
      } catch (error) {
        // Handle requires-recent-login error
        const authError = error as AuthError;
        if (authError.code === 'auth/requires-recent-login') {
          // Re-authenticate with Google first
          await reauthenticateWithPopup(user, googleProvider);
          
          // Try linking again after re-authentication
          await linkWithCredential(user, credential);
        } else {
          throw error;
        }
      }
    } catch (error) {
      handleAuthError(error);
    }
  };
  
  // Check if user has password authentication method
  const hasPassword = () => {
    if (!user) return false;
    
    // Check if email/password provider exists in providerData
    return user.providerData.some(
      provider => provider.providerId === 'password'
    );
  };

  const value = {
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