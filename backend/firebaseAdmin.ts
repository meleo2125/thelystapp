import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Safe initialization of Firebase Admin
function initFirebaseAdmin() {
  try {
    // Check if already initialized
    if (getApps().length > 0) {
      return getApps()[0];
    }

    // Check required env vars
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      throw new Error('Missing Firebase project ID in environment variables');
    }

    // Generate fallback client email if not provided
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 
      `firebase-adminsdk-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.split('-')[1]?.substring(0, 5) || 'default'}@${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`;

    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!privateKey || privateKey === '') {
      throw new Error('Missing Firebase Admin private key in environment variables');
    }

    // Initialize with full config
    return initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw new Error('Failed to initialize Firebase Admin');
  }
}

// Initialize Firebase Admin safely
let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

try {
  app = initFirebaseAdmin();
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
} catch (error) {
  console.error('Firebase Admin services initialization error:', error);
  // Set empty placeholders that will throw clear errors if used
  adminAuth = {
    verifyIdToken: () => Promise.reject(new Error('Firebase Admin Auth not initialized')),
  } as unknown as Auth;
  adminDb = {} as unknown as Firestore;
}

export { adminAuth, adminDb }; 