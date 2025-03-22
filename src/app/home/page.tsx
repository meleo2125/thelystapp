'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../backend/AuthContext';
import Button from '@/components/ui/Button';
import Logo from '@/components/Logo';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../backend/firebase';

const HomePage = () => {
  const { user, logout, verifySession } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const router = useRouter();
  
  useEffect(() => {
    // Don't verify session if we're logging out
    if (isLoggingOut) return;
    
    const checkAuth = async () => {
      try {
        setIsVerifying(true);
        const isAuthenticated = await verifySession();
        if (!isAuthenticated) {
          console.warn('Session verification failed');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Authentication check error:', error);
        router.replace('/login');
      } finally {
        setIsVerifying(false);
      }
    };
    
    checkAuth();
  }, [router, verifySession, isLoggingOut]);
  
  // Fetch user profile from Firestore
  useEffect(() => {
    if (!user || isLoggingOut) return;
    
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.name || '');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user, isLoggingOut]);
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };
  
  if (isVerifying && !isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e11d48]"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying your session...</p>
        </div>
      </div>
    );
  }
  
  if (isLoggingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e11d48]"></div>
          <p className="text-gray-600 dark:text-gray-400">Logging out...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Logo size="md" />
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
              <span>
                {userName || user?.displayName || user?.email?.split('@')[0] || 'User'}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings')}
            >
              Settings
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-6 fade-in">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Welcome{userName ? `, ${userName}` : ''}
          </h2>
          
          <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-8 text-center">
            <div className="mb-4 text-[#e11d48]">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Your lists will appear here</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Track and organize your favorite TV shows, movies, anime and more.
            </p>
            
            <Button 
              variant="primary"
              leftIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Create your first list
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage; 