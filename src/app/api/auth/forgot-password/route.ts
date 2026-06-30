import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/backend/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import crypto from 'crypto';

const bodySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const RATE_LIMIT_SECONDS = 60;        // 1 minute between requests
const TOKEN_EXPIRY_MINUTES = 60;      // link expires in 1 hour

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = bodySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { email } = result.data;

  try {
    // Look up account by email via Admin SDK
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      // User not found — still return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // Check which sign-in providers the account uses
    const providers = userRecord.providerData.map((p) => p.providerId);
    const hasPassword = providers.includes('password');
    const hasGoogle = providers.includes('google.com');

    if (!hasPassword && hasGoogle) {
      // Google-only account — there is no password to reset
      return NextResponse.json({ success: false, googleOnly: true });
    }

    // Rate-limit: prevent spamming the reset endpoint
    const existingDoc = await adminDb.collection('passwordResets').doc(email).get();
    if (existingDoc.exists) {
      const data = existingDoc.data()!;
      const secondsSinceLastRequest =
        (Date.now() - (data.createdAt as Timestamp).toDate().getTime()) / 1000;

      if (secondsSinceLastRequest < RATE_LIMIT_SECONDS) {
        const waitSeconds = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceLastRequest);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds}s before requesting another link.`, rateLimited: true },
          { status: 429 }
        );
      }
    }

    // Generate a cryptographically secure one-time token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)
    );

    // Persist token in Firestore keyed by email (overwrites any prior token)
    await adminDb.collection('passwordResets').doc(email).set({
      token,
      email,
      expiresAt,
      createdAt: Timestamp.now(),
    });

    // Build our own reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // Send via our Nodemailer transporter
    const { sendResetEmail } = await import('@/backend/mailer');
    await sendResetEmail(email, resetLink);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to send reset email. Please try again.' },
      { status: 500 }
    );
  }
}
