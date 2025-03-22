'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../backend/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Logo from '@/components/Logo';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../backend/firebase';

interface PasswordFormData {
  password: string;
  confirmPassword: string;
}

const SettingsPage = () => {
  const { user, logout, verifySession, linkEmailPassword, hasPassword } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [userName, setUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<PasswordFormData>();
  
  const password = watch('password');
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsVerifying(true);
        const isAuthenticated = await verifySession();
        if (!isAuthenticated) {
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
  }, [router, verifySession]);
  
  // Fetch user profile from Firestore
  useEffect(() => {
    if (!user) return;
    
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
  }, [user]);
  
  const onSubmit = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      await linkEmailPassword(data.password);
      toast.success('Password set successfully');
      reset(); // Clear the form
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast.error(error.message || 'Failed to set password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await logout();
  };
  
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }
  
  const hasPasswordAuth = hasPassword();
  
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
              onClick={() => router.push('/home')}
            >
              Back to Home
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
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Account Settings
          </h2>
          
          <div className="max-w-md">
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Email and Password
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Email:</strong> {user?.email}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Sign-in Provider:</strong> {user?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email/Password'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Email/Password Sign-in:</strong> {hasPasswordAuth ? 'Enabled' : 'Not set up'}
                </p>
              </div>
              
              {user?.providerData[0]?.providerId === 'google.com' && !hasPasswordAuth && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                    Set a Password
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Setting a password allows you to sign in using your email and password in addition to Google.
                  </p>
                  
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                      leftIcon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      }
                    />
                    
                    <Input
                      label="Confirm Password"
                      type="password"
                      fullWidth
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) => value === password || 'Passwords do not match',
                      })}
                      error={errors.confirmPassword?.message}
                      placeholder="********"
                      leftIcon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      }
                    />
                    
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isLoading}
                    >
                      Set Password
                    </Button>
                  </form>
                </div>
              )}
              
              {hasPasswordAuth && (
                <div className="mt-4">
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    You can now sign in using your email and password
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage; 