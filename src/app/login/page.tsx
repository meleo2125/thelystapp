'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../../backend/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AuthLayout from '@/components/AuthLayout';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginPage = () => {
  const { login, googleSignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await login(data.email, data.password);
      toast.success('Login successful');
      router.push('/home');
    } catch (error: any) {
      console.error('Login error:', error);
      
      const errorMessage = 
        error.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : error.code === 'auth/user-not-found'
          ? 'User not found'
          : error.code === 'auth/wrong-password'
          ? 'Invalid password'
          : 'Failed to login. Please try again.';
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await googleSignIn();
      toast.success('Login successful');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to login with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-[#e11d48] hover:text-[#be123c] transition-colors">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email address"
          fullWidth
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email',
            },
          })}
          error={errors.email?.message}
          type="email"
          placeholder="you@example.com"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        
        <Input
          label="Password"
          fullWidth
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            },
          })}
          error={errors.password?.message}
          type="password"
          placeholder="••••••••"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
        
        <div className="flex items-center justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-[#e11d48] hover:text-[#be123c] transition-colors">
            Forgot your password?
          </Link>
        </div>
        
        <div className="pt-2">
          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            className="slide-in"
          >
            Sign in
          </Button>
        </div>
        
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Or continue with
            </span>
          </div>
        </div>
        
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={handleGoogleSignIn}
          isLoading={isLoading}
          disabled={isLoading}
          leftIcon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
          }
        >
          Sign in with Google
        </Button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage; 