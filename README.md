# 🎬 TheLyst

TheLyst is a premium, minimal, unified tracking application designed for movie buffs, TV series binge-watchers, and anime enthusiasts. It integrates metadata from multiple providers into a single, cohesive experience.

---

## ✨ Features

- **Unified Search & Catalog**: Seamlessly search and browse media from TMDB (Movies & TV) and Jikan/MAL (Anime) using a single, unified search interface.
- **Tactile Trackers**: Rate, update watch progress, choose status (`watching`, `completed`, `plan_to_watch`, `on_hold`, `dropped`), and write private notes from a modern detail panel.
- **Custom Lysts**: Group your media into custom collections/lists. Share them, clone lists from other users, and upvote/like your favorite community lists.
- **Social Feed & Follows**: Follow friends, discover what they are watching through a real-time activity feed, and write detailed media reviews.
- **Visual Habit Insights**: Beautiful, interactive charts showing your rating distributions, media type breakdown, and viewing habits over time.
- **Secure Email Auth**: Passwordless registration and login powered by OTP (One-Time Passwords) sent securely via Nodemailer.
- **Robust Security**: Multi-tier architecture utilizing HTTP-only cookie sessions and granular Firestore Security Rules preventing client tampering.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 & DaisyUI
- **Backend / Database**: Google Firebase (Firestore, Authentication, Admin SDK)
- **Form Handling / Validation**: React Hook Form, Zod
- **Mailing**: Nodemailer (SMTP Integration)

---

## 🚀 Getting Started

### 1. Prerequisites

Make sure you have Node.js (v18.x or later) installed.

### 2. Clone and Install Dependencies

```bash
git clone https://github.com/your-username/thelyst.git
cd thelyst
npm install
```

### 3. Environment Variables Configuration

Copy `.env.example` to `.env` (or `.env.local` for local development):

```bash
cp .env.example .env
```

Fill in the required configuration options. Refer to the table below for guidance:

| Variable | Description | Source |
|---|---|---|
| `TMDB_API_KEY` | API Key for TheMovieDB API | [TMDB API Settings](https://www.themoviedb.org/settings/api) |
| `ACCESS_TOKEN` | Bearer Token for TMDB API | [TMDB API Settings](https://www.themoviedb.org/settings/api) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web API Key for Firebase Client SDK | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth Domain (e.g. `your-app.firebaseapp.com`) | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID (e.g. `your-app`) | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage Bucket URL | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID for Firebase Cloud Messaging | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID | Firebase Console > Project Settings |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service Account email for Server-side Admin SDK | Firebase Console > Project Settings > Service Accounts |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service Account private key (preserve newlines `\n`) | Firebase Console > Project Settings > Service Accounts |
| `EMAIL_USER` | SMTP server sender email address (e.g., Gmail) | Email Provider / Google App Password |
| `EMAIL_PASSWORD` | App password associated with the email address | Google Account Security / App Passwords |
| `NEXT_PUBLIC_APP_URL` | Root URL of the application | Local: `http://localhost:3000` |

### 4. Setting up Firebase

This app uses Firebase Firestore for database storage. 

Deploy Firestore Security Rules and Indexes using the Firebase CLI:

```bash
# Log in to Firebase CLI
npx firebase login

# Select or add your project
npx firebase use --add

# Deploy Rules and Indexes
npx firebase deploy --only firestore
```

### 5. Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### 6. Production Build

Verify the build compiles correctly before deploying:

```bash
npm run build
```

---

## 📦 Deployment

### Vercel (Recommended)

1. Import the repository into your Vercel Dashboard.
2. Add all environment variables from `.env` in the Vercel project environment configuration settings.
3. Click **Deploy**. Vercel will auto-build and provision SSL for your project.

### Firebase Admin Key Formatting in Vercel

When pasting `FIREBASE_ADMIN_PRIVATE_KEY` into Vercel, ensure it contains the double quotes and raw newline sequences (`\n`) so the JSON parser on Vercel resolves it correctly (e.g., `"-----BEGIN PRIVATE KEY-----\nMIIEvgIBAD...-----END PRIVATE KEY-----\n"`).
