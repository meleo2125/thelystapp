'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '@/backend/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AuthLayout from '@/components/AuthLayout';

import { decrypt } from '../../../utils/crypto';

interface VerifyOTPFormData {
  otp: string;
}

interface RegistrationData {
  name: string;
  email: string;
  encryptedPassword: string;
  registrationId: string;
}

const VerifyOTPForm = () => {
  const { register: registerUser, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/home';
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOTPFormData>();
  
  useEffect(() => {
    // Get registration data from session storage
    const storedData = sessionStorage.getItem('registrationData');
    if (!storedData) {
      toast.error('Registration data not found');
      router.push('/register');
      return;
    }
    
    setRegistrationData(JSON.parse(storedData));
    
    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error('OTP has expired. Please try again.');
          router.push('/register');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const onSubmit = async (data: VerifyOTPFormData) => {
    if (!registrationData) {
      toast.error('Registration data not found');
      router.push('/register');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Verify OTP with registrationId for added security
      // Sent as POST body to keep the code out of server logs and browser history
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registrationData.email,
          otp: data.otp,
          registrationId: registrationData.registrationId,
        }),
      });
      const result = await response.json();
      
      if (!response.ok || !result.valid) {
        throw new Error(result.error || 'Invalid or expired verification code');
      }

      // Decrypt the password and proceed to registration
      const password = decrypt(registrationData.encryptedPassword);
      
      // Register user with Firebase
      await registerUser(
        registrationData.email,
        password,
        registrationData.name,
        `/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`
      );
      
      // Clear session storage
      sessionStorage.removeItem('registrationData');
      
      toast.success('Account created successfully');
      // Router push will be handled by registerUser function
    } catch (error: unknown) {
      console.error('Verification error:', error);
      const err = error as { code?: string; message?: string };
      
      // Handle specific error cases
      if (err.code === 'auth/email-already-in-use') {
        // Email exists — try logging in (succeeds if they have an email/password account)
        try {
          const password = decrypt(registrationData.encryptedPassword);
          await login(registrationData.email, password, callbackUrl);
          sessionStorage.removeItem('registrationData');
          toast.success('Email already registered. Logged in successfully.');
          return; // router.push handled by login()
        } catch {
          // Login also failed — likely a Google-only account. Send them to sign in.
          sessionStorage.removeItem('registrationData');
          toast.error('This email is already registered. Please sign in.');
          router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        }
      } else {
        toast.error(err.message || 'Failed to verify OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const resendOTP = async () => {
    if (!registrationData) {
      toast.error('Registration data not found');
      router.push('/register');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Send new OTP
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: registrationData.email,
          registrationId: registrationData.registrationId
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend OTP');
      }
      
      // Reset timer
      setTimeLeft(300);
      
      toast.success('Verification code resent to your email');
    } catch (error: unknown) {
      console.error('Resend OTP error:', error);
      const err = error as { message?: string };
      toast.error(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthLayout title="Verify your email">
      <div className="text-center mb-6">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          We've sent a verification code to 
          <span className="font-medium text-gray-900 dark:text-white"> {registrationData?.email}</span>
        </div>
        
        <div className="inline-flex items-center justify-center bg-[#e11d48]/10 text-[#e11d48] text-xl font-mono font-semibold rounded-md px-4 py-2 mb-4">
          <span className="animate-pulse">{formatTime(timeLeft)}</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Verification Code"
          fullWidth
          {...register('otp', {
            required: 'Verification code is required',
            minLength: {
              value: 6,
              message: 'Verification code must be 6 digits',
            },
            maxLength: {
              value: 6,
              message: 'Verification code must be 6 digits',
            },
            pattern: {
              value: /^[0-9]+$/,
              message: 'Verification code must contain only numbers',
            },
          })}
          error={errors.otp?.message}
          placeholder="Enter 6-digit code"
          autoComplete="one-time-code"
          inputMode="numeric"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        
        <div className="pt-2">
          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            className="slide-in"
          >
            Verify
          </Button>
        </div>
        
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={resendOTP}
            disabled={isLoading || timeLeft > 270} // Allow resend after 30 seconds
            className={`text-sm font-medium transition-colors ${
              isLoading || timeLeft > 270
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-[#e11d48] hover:text-[#be123c]'
            }`}
          >
            {timeLeft > 270 
              ? `Resend code in ${formatTime(timeLeft - 270)}`
              : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
};

const VerifyOTPPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyOTPForm />
    </Suspense>
  );
};

export default VerifyOTPPage; 