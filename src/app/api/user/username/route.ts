import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/backend/firebaseAdmin';
import { getSessionUser } from '@/lib/firebase/sessions';
import { z } from 'zod';

const usernameSchema = z.object({
  username: z.string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username must be alphanumeric or underscore')
    .transform((val) => val.toLowerCase()),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }
    const uid = user.uid;


    const body = await req.json();
    const validation = usernameSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'bad_input',
        details: validation.error.format(),
      }, { status: 400 });
    }

    const { username } = validation.data;

    // Run transaction to claim username uniquely
    const result = await adminDb.runTransaction(async (transaction) => {
      const usernameRef = adminDb.collection('usernames').doc(username);
      const userRef = adminDb.collection('users').doc(uid);

      const usernameDoc = await transaction.get(usernameRef);
      const userDoc = await transaction.get(userRef);

      // Check if username is already taken by someone else
      if (usernameDoc.exists) {
        const owner = usernameDoc.data();
        if (owner?.uid !== uid) {
          return { success: false, error: 'taken' };
        }
      }

      // Check if user already has a username to delete old claim
      const userData = userDoc.data();
      const oldUsername = userData?.username;

      if (oldUsername && oldUsername !== username) {
        const oldUsernameRef = adminDb.collection('usernames').doc(oldUsername);
        transaction.delete(oldUsernameRef);
      }

      // Set new claim & update user document
      transaction.set(usernameRef, { uid });
      transaction.set(userRef, { username }, { merge: true });

      return { success: true };
    });

    if (!result.success) {
      return NextResponse.json({ error: 'username_taken' }, { status: 409 });
    }

    return NextResponse.json({ success: true, username });
  } catch (err: unknown) {
    console.error('Username claim error:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
