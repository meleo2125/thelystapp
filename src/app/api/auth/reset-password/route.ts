import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../../../../backend/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

const bodySchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain uppercase, lowercase, a number, and a special character'
    ),
});

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

  const { token, email, password } = result.data;

  try {
    // Look up the stored reset token by email
    const resetDocRef = adminDb.collection('passwordResets').doc(email);
    const resetDoc = await resetDocRef.get();

    if (!resetDoc.exists) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has already been used.' },
        { status: 400 }
      );
    }

    const resetData = resetDoc.data()!;

    // Constant-time string comparison to guard against timing attacks
    const storedToken: string = resetData.token;
    if (
      storedToken.length !== token.length ||
      !require('crypto').timingSafeEqual(Buffer.from(storedToken), Buffer.from(token))
    ) {
      return NextResponse.json({ error: 'This reset link is invalid.' }, { status: 400 });
    }

    // Check expiry
    const expiresAt = (resetData.expiresAt as Timestamp).toDate().getTime();
    if (expiresAt < Date.now()) {
      await resetDocRef.delete();
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get the Firebase user by email
    const userRecord = await adminAuth.getUserByEmail(email);

    // Update the password via Admin SDK
    await adminAuth.updateUser(userRecord.uid, { password });

    // Revoke all existing refresh tokens so any active sessions are signed out
    await adminAuth.revokeRefreshTokens(userRecord.uid);

    // Delete the used token — single use only
    await resetDocRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
