import React from 'react';
import MediaImage from '@/components/ui/MediaImage';
import { tmdbFetch } from '@/lib/tmdb/client';
import { normalizeTmdbMovieSummary, RawTmdbMovieSummary } from '@/lib/tmdb/normalize';
import { LandingHeaderAuth, LandingHeroAuth } from '@/components/auth/LandingAuthComponents';

export const revalidate = 3600; // ISR: Revalidate landing page every 1 hour

async function getTrendingMovies() {
  try {
    const res = await tmdbFetch<{ results: RawTmdbMovieSummary[] }>('/trending/movie/week', 3600);
    return res.results.slice(0, 6).map(normalizeTmdbMovieSummary);
  } catch (err) {
    console.error('Failed to fetch trending movies for landing page:', err);
    return [];
  }
}

export default async function LandingPage() {
  const trending = await getTrendingMovies();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header bar */}
      <header className="border-b border-border bg-secondary/30 backdrop-blur-md sticky top-0 z-50 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
          <span className="text-xl font-black tracking-widest text-primary uppercase select-none">
            THELYST
          </span>
          <LandingHeaderAuth />
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center flex flex-col items-center gap-6">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-foreground max-w-4xl">
          Track what you watch. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">
            Curate your obsession.
          </span>
        </h1>
        <p className="text-sm sm:text-base text-muted max-w-2xl leading-relaxed">
          The ultimate minimal tracker for movie buffs, TV series binge-watchers, and anime enthusiasts. Free, beautiful, and completely custom.
        </p>

        <LandingHeroAuth />
      </section>

      {/* Feature Cards Grid */}
      <section className="bg-secondary/40 border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary text-center mb-10">Platform Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-secondary border border-border p-6 rounded-xl shadow-md">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Unified Catalog</h3>
              <p className="text-xs text-muted leading-relaxed">
                Search TMDB and Jikan indexes in a single input. Movies, serial TV, and anime are cataloged together.
              </p>
            </div>

            <div className="bg-secondary border border-border p-6 rounded-xl shadow-md">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Tactile Tracking</h3>
              <p className="text-xs text-muted leading-relaxed">
                Log score ratings, watch progress updates, and write private notes from a clean detail sidebar panel.
              </p>
            </div>

            <div className="bg-secondary border border-border p-6 rounded-xl shadow-md">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Visual Habit Insights</h3>
              <p className="text-xs text-muted leading-relaxed">
                Observe score distributions, formats ratios, and watch hours automatically computed from your lists.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Previews Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <h2 className="text-lg font-extrabold tracking-tight mb-8">Trending Releases</h2>

        {trending.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted border border-dashed border-border rounded-xl">
            No trending media available.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
            {trending.map((item) => (
              <div key={`${item.type}-${item.sourceId}`} className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow">
                <div className="relative aspect-[2/3] bg-background">
                  <MediaImage src={item.posterPath} alt={item.title} fill sizes="(max-w-768px) 50vw, 200px" />
                </div>
                <div className="p-3">
                  <span className="hover:text-primary transition-colors text-xs font-bold text-foreground line-clamp-1 block leading-tight">
                    {item.title}
                  </span>
                  <span className="text-[9px] text-muted mt-1 block uppercase font-extrabold">{item.type}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/10 py-8 text-center text-xs text-muted mt-auto">
        <p>© {new Date().getFullYear()} TheLyst. Built with Next.js & Firebase. All rights reserved.</p>
      </footer>
    </div>
  );
}
