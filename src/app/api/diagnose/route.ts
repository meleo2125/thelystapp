import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/backend/firebaseAdmin';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  // Simple query-param protection to avoid exposing info publicly
  if (secret !== 'lystdebug123') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const diagnosis: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: {
        present: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
      },
      FIREBASE_ADMIN_CLIENT_EMAIL: {
        present: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        value: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || null,
      },
      FIREBASE_ADMIN_PRIVATE_KEY: {
        present: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        length: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length ?? 0,
        startsWithBeginHeader: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----') ?? false,
        endsWithEndHeader: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----') ?? false,
        containsRawNewlines: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('\n') ?? false,
        containsEscapedNewlines: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.includes('\\n') ?? false,
      },
      TMDB_API_KEY: {
        present: !!process.env.TMDB_API_KEY,
      },
      ACCESS_TOKEN: {
        present: !!process.env.ACCESS_TOKEN,
      },
      EMAIL_USER: {
        present: !!process.env.EMAIL_USER,
      },
    },
    firebaseAdmin: {
      initialized: false,
      error: null,
    },
    firestore: {
      connection: 'untested',
      error: null,
    }
  };

  // Test Firebase Admin State
  try {
    if (adminDb && typeof adminDb.collection === 'function') {
      diagnosis.firebaseAdmin.initialized = true;
    } else {
      diagnosis.firebaseAdmin.error = 'adminDb is not initialized or is mock object';
    }
  } catch (err: any) {
    diagnosis.firebaseAdmin.error = err.message || String(err);
  }

  // Test Firestore Connection
  if (diagnosis.firebaseAdmin.initialized) {
    try {
      // Perform a minimal, fast read
      const testSnap = await adminDb.collection('usernames').limit(1).get();
      diagnosis.firestore.connection = 'success';
      diagnosis.firestore.count = testSnap.size;
    } catch (err: any) {
      diagnosis.firestore.connection = 'failed';
      diagnosis.firestore.error = {
        message: err.message || String(err),
        code: err.code || null,
        details: err.details || null,
      };
    }
  }

  return NextResponse.json(diagnosis);
}
