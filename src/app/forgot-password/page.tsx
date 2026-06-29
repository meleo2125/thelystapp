'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AuthLayout from '@/components/AuthLayout';

interface ForgotPasswordFormData {
  email: string;
}

type PageState = 'idle' | 'sent' | 'google-only';

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>('idle');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong. Please try again.');
      }

      if (result.googleOnly) {
        setSubmittedEmail(data.email);
        setPageState('google-only');
        return;
      }

      // Generic success for both "email found" and "email not found" cases
      // to prevent user enumeration
      setSubmittedEmail(data.email);
      setPageState('sent');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Success State ───────────────────────────────────────────────────────────
  if (pageState === 'sent') {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={
          <>
            Back to{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center text-center gap-5">
          {/* Icon */}
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted">
              If an account exists for{' '}
              <span className="font-semibold text-foreground">{submittedEmail}</span>, you&apos;ll
              receive a password reset link shortly.
            </p>
            <p className="text-xs text-muted">
              Didn&apos;t get the email? Check your spam folder or{' '}
              <button
                onClick={() => setPageState('idle')}
                className="text-primary hover:text-primary-dark underline underline-offset-2 transition-colors"
              >
                try again
              </button>
              .
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ─── Google-Only State ───────────────────────────────────────────────────────
  if (pageState === 'google-only') {
    return (
      <AuthLayout
        title="No password on this account"
        subtitle={
          <>
            Back to{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center text-center gap-5">
          {/* Google icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">{submittedEmail}</span> is linked to a
              Google account. There&apos;s no password to reset.
            </p>
            <p className="text-sm text-muted">
              To sign in, use the <span className="text-foreground font-medium">Sign in with Google</span>{' '}
              button on the login page. Google manages your account security.
            </p>
          </div>

          <Link href="/login" className="w-full mt-2">
            <Button fullWidth variant="primary">
              Go to sign in
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ─── Default Form State ──────────────────────────────────────────────────────
  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle={
        <>
          Remember it?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
            Back to sign in
          </Link>
        </>
      }
    >
      <div className="space-y-2 text-center -mt-4 mb-2">
        <p className="text-sm text-muted">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email address"
          fullWidth
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Please enter a valid email address',
            },
          })}
          error={errors.email?.message}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        <div className="pt-2">
          <Button type="submit" fullWidth isLoading={isLoading} className="slide-in">
            Send reset link
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
