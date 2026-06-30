import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600; // ISR: Revalidate page every 1 hour
import { tmdbFetch } from '@/lib/tmdb/client';
import { normalizeTmdbMovieDetail, RawTmdbMovieDetail } from '@/lib/tmdb/normalize';
import { TmdbError } from '@/lib/errors';
import MediaImage from '@/components/ui/MediaImage';
import GenrePill from '@/components/ui/GenrePill';
import AggregateScoreBadge from '@/components/ui/AggregateScoreBadge';
import CastRow from '@/components/media/CastRow';
import SimilarRow from '@/components/media/SimilarRow';
import TrailerButton from '@/components/media/TrailerButton';
import SectionHeader from '@/components/ui/SectionHeader';
import StatusPicker from '@/components/media/StatusPicker';


import ReviewsSection from '@/components/media/ReviewsSection';


interface MoviePageProps {
  params: Promise<{ id: string }>;
}

async function getMovieDetail(idStr: string) {
  try {
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) return null;
    
    const rawDetail = await tmdbFetch<RawTmdbMovieDetail>(
      `/movie/${id}?append_to_response=credits,videos,similar,release_dates`,
      604800 // Cache for 7 days
    );
    return normalizeTmdbMovieDetail(rawDetail);
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) {
      return null;
    }
    console.error('Error fetching movie details inside Server Component:', err);
    // Gracefully handle transient network errors instead of crashing
    return null;
  }
}

export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieDetail(id);
  if (!movie) {
    return {
      title: 'Movie Not Found — TheLyst',
    };
  }
  return {
    title: `${movie.title} (${movie.year || 'N/A'}) — TheLyst`,
    description: movie.overview ? movie.overview.substring(0, 160) : `Detailed tracking list metadata for ${movie.title}.`,
  };
}

export default async function MovieDetailPage({ params }: MoviePageProps) {
  const { id } = await params;
  const movie = await getMovieDetail(id);
  
  if (!movie) {
    notFound();
  }

  const formatRuntime = (mins: number | null) => {
    if (!mins) return '—';
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs > 0) {
      return `${hrs}h ${remainingMins}m`;
    }
    return `${remainingMins}m`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Navbar header spacer */}
      <header className="bg-secondary/30 border-b border-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/home" className="text-sm font-semibold text-muted hover:text-foreground flex items-center gap-1.5 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Main Details Panel */}
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 md:gap-12 bg-secondary border border-border p-6 sm:p-8 rounded-xl fade-in mb-12">
          {/* Left Column: Poster + Track Panel */}
          <div className="flex flex-col gap-6 w-full max-w-[300px] mx-auto md:mx-0">
            <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden border border-border bg-background shadow-xl">
              <MediaImage
                src={movie.posterPath}
                alt={movie.title}
                fill
                sizes="300px"
                priority
              />
            </div>

            <StatusPicker
              type="movie"
              sourceId={movie.sourceId}
              mediaTitle={movie.title}
              posterPath={movie.posterPath}
              year={movie.year}
              totalEpisodes={null}
            />

          </div>

          {/* Right Column: Information details */}
          <div className="flex flex-col min-w-0">

            <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
                {movie.title}
              </h1>
              {movie.aggregateScore !== null && (
                <div className="flex items-center gap-1.5 bg-rating/10 border border-rating/20 text-rating font-bold px-3 py-1 rounded text-sm sm:text-base shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 sm:w-5 h-5">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.6 3.102-1.196 4.657c-.209.813.684 1.462 1.394 1.011l4.225-2.7 4.225 2.7c.71.451 1.602-.198 1.394-1.011l-1.196-4.657 3.6-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                  </svg>
                  {movie.aggregateScore.toFixed(1)} / 10
                </div>
              )}
            </div>

            {/* Quick Meta */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted mb-6">
              <span className="font-semibold">{movie.year || '—'}</span>
              <span className="w-1.5 h-1.5 bg-border rounded-full" />
              {movie.contentRating && (
                <>
                  <span className="border border-border px-1.5 py-0.5 rounded font-mono font-semibold">{movie.contentRating}</span>
                  <span className="w-1.5 h-1.5 bg-border rounded-full" />
                </>
              )}
              <span>{formatRuntime(movie.runtimeMinutes)}</span>
              <span className="w-1.5 h-1.5 bg-border rounded-full" />
              <span className="uppercase tracking-wider font-semibold">Movie</span>
              <span className="w-1.5 h-1.5 bg-border rounded-full" />
              <a
                href="#reviews-section"
                className="text-xs font-bold text-muted hover:text-primary transition-colors flex items-center gap-1 cursor-pointer select-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
                Reviews
              </a>
            </div>

            {/* Genres List */}
            <div className="flex flex-wrap gap-2 mb-6">
              {movie.genres.map(g => (
                <GenrePill key={g.id} label={g.name} />
              ))}
            </div>

            {/* Tagline */}
            {movie.tagline && (
              <p className="text-base sm:text-lg italic text-muted mb-4 border-l-2 border-primary/30 pl-3">
                "{movie.tagline}"
              </p>
            )}

            {/* Overview */}
            <p className="text-sm sm:text-base text-muted leading-relaxed mb-6">
              {movie.overview || 'No synopsis available.'}
            </p>

            {/* Watch Trailer CTA */}
            {movie.trailer?.youtubeId && (
              <div className="mb-8">
                <TrailerButton youtubeId={movie.trailer.youtubeId} />
              </div>
            )}

            {/* Crew / Director Details */}
            {movie.director && (
              <div className="mb-6 bg-background/30 border border-border/50 rounded-lg p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">Director</span>
                <span className="text-sm font-medium text-foreground">{movie.director}</span>
              </div>
            )}

            {/* Cast Section */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Top Cast</h3>
                <CastRow cast={movie.cast} />
              </div>
            )}
          </div>
        </div>

        {/* Similar Row */}
        {movie.similar && movie.similar.length > 0 && (
          <div className="fade-in">
            <SectionHeader title="Similar Recommendations" />
            <SimilarRow similar={movie.similar} />
          </div>
        )}

        {/* User Reviews */}
        <ReviewsSection
          type="movie"
          sourceId={movie.sourceId}
          mediaTitle={movie.title}
          posterPath={movie.posterPath}
        />
      </main>
    </div>
  );
}
