import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../backend/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

const bodySchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'Verification code must be 6 digits'),
  registrationId: z.string().min(1, 'Registration ID is required'),
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body', valid: false }, { status: 400 });
  }

  const result = bodySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message, valid: false },
      { status: 400 }
    );
  }

  const { email, otp, registrationId } = result.data;

  try {
    const otpDocRef = adminDb.collection('otps').doc(email);
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.', valid: false },
        { status: 404 }
      );
    }

    const otpData = otpDoc.data()!;

    // Brute-force: check if this email is currently locked out
    const lockedUntil = otpData.lockedUntil?.toDate?.()?.getTime?.() ?? 0;
    if (lockedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((lockedUntil - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${remainingSeconds}s.`, valid: false },
        { status: 429 }
      );
    }

    // Check expiry
    const expiresAt = (otpData.expiresAt as Timestamp).toDate().getTime();
    if (expiresAt < Date.now()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.', valid: false },
        { status: 400 }
      );
    }

    // Verify registrationId to tie the OTP to the specific session
    if (otpData.registrationId && otpData.registrationId !== registrationId) {
      return NextResponse.json(
        { error: 'Invalid verification session', valid: false },
        { status: 400 }
      );
    }

    // Verify OTP value
    if (otpData.otp !== otp) {
      const failedAttempts = ((otpData.failedAttempts as number) ?? 0) + 1;

      if (failedAttempts >= MAX_ATTEMPTS) {
        await otpDocRef.update({
          failedAttempts,
          lockedUntil: Timestamp.fromDate(new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)),
        });
        return NextResponse.json(
          { error: 'Too many failed attempts. Please request a new code.', valid: false },
          { status: 429 }
        );
      }

      await otpDocRef.update({ failedAttempts });
      const remaining = MAX_ATTEMPTS - failedAttempts;
      return NextResponse.json(
        {
          error: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
          valid: false,
        },
        { status: 400 }
      );
    }

    // ✅ OTP is valid — delete to prevent replay attacks
    await otpDocRef.delete();

    return NextResponse.json(
      { success: true, message: 'OTP verified successfully', valid: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP', valid: false },
      { status: 500 }
    );
  }
}