'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AuthLayout from '@/components/AuthLayout';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

type PageState = 'form' | 'success' | 'invalid';

// Inner component that reads search params (must be wrapped in Suspense)
const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [isLoading, setIsLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>('form');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>();

  const password = watch('password');

  useEffect(() => {
    // If no token or email in URL, the link is broken
    if (!token || !email) {
      setPageState('invalid');
    }
  }, [token, email]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !email) {
      setPageState('invalid');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Link already used / expired — send to invalid state
        if (response.status === 400) {
          setPageState('invalid');
          toast.error(result.error || 'This reset link is no longer valid.');
          return;
        }
        throw new Error(result.error || 'Something went wrong. Please try again.');
      }

      setPageState('success');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Success ─────────────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <AuthLayout title="Password updated">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted">
              Your password has been updated. All existing sessions have been signed out for your
              security.
            </p>
          </div>

          <Button fullWidth onClick={() => router.replace('/login')}>
            Sign in with new password
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // ─── Invalid / Expired Link ───────────────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <AuthLayout title="Link expired or invalid">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <p className="text-sm text-muted">
            This reset link is invalid or has already been used. Reset links expire after{' '}
            <span className="text-foreground font-medium">1 hour</span>.
          </p>

          <Link href="/forgot-password" className="w-full">
            <Button fullWidth>Request a new link</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ─── Password Form ────────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="New password"
          fullWidth
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Password must be at least 8 characters' },
            pattern: {
              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
              message:
                'Must contain uppercase, lowercase, a number, and a special character',
            },
          })}
          error={errors.password?.message}
          placeholder="••••••••"
          autoComplete="new-password"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />

        <Input
          label="Confirm new password"
          fullWidth
          type="password"
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
          error={errors.confirmPassword?.message}
          placeholder="••••••••"
          autoComplete="new-password"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <div className="pt-2">
          <Button type="submit" fullWidth isLoading={isLoading} className="slide-in">
            Update password
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
const ResetPasswordPage = () => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }
  >
    <ResetPasswordForm />
  </Suspense>
);

export default ResetPasswordPage;
