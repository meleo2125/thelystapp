import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

const serverEnvSchema = z.object({
  TMDB_API_KEY: z.string().min(1).optional(),
  ACCESS_TOKEN: z.string().min(1).optional(), // Used as the TMDB Bearer Token
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
  EMAIL_USER: z.string().email(),
  EMAIL_PASSWORD: z.string().min(1),
});

const getEnv = () => {
  const isServer = typeof window === 'undefined';
  
  const clientParsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!clientParsed.success) {
    console.error('❌ Invalid client environment variables:', clientParsed.error.format());
    throw new Error('Invalid client environment variables configuration');
  }

  if (isServer) {
    const serverParsed = serverEnvSchema.safeParse({
      TMDB_API_KEY: process.env.TMDB_API_KEY || process.env.TMBD_API_KEY, // supports the typo variant too
      ACCESS_TOKEN: process.env.ACCESS_TOKEN,
      FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    });

    if (!serverParsed.success) {
      console.error('❌ Invalid server environment variables:', serverParsed.error.format());
      throw new Error('Invalid server environment variables configuration');
    }
    
    if (!serverParsed.data.TMDB_API_KEY && !serverParsed.data.ACCESS_TOKEN) {
      console.error('❌ TMDB API authentication missing. Provide either TMDB_API_KEY or ACCESS_TOKEN (TMDB Bearer token).');
      throw new Error('TMDB API authentication missing');
    }

    return {
      ...clientParsed.data,
      ...serverParsed.data,
      isServer,
    } as const;
  }

  return {
    ...clientParsed.data,
    isServer,
  } as const;
};

export const env = getEnv();
