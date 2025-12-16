import React, { useState, useEffect } from 'react';
import { Movie, Language } from '../types';
import { Star, Clock, Calendar, Info, Bookmark, Check, Share2, Play, FileText, Globe, Clapperboard, Sparkles, Tv, Layers } from 'lucide-react';
import { watchlistService } from '../services/watchlistService';
import { geminiService } from '../services/geminiService';
import { translations } from '../translations';

interface MovieCardProps {
  movie: Movie;
  index: number;
  onToggle?: () => void;
  onPlayTrailer?: (movie: Movie) => void;
  language?: Language;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, index, onToggle, onPlayTrailer, language = 'English' }) => {
  // Generate a deterministic random image based on title length to simulate variety
  const seed = movie.title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageUrl = `https://picsum.photos/seed/${seed}/400/600`;

  const [inWatchlist, setInWatchlist] = useState(false);
  const [justShared, setJustShared] = useState(false);
  const t = translations[language];
  
  // Synopsis state
  const [synopsis, setSynopsis] = useState<string>(movie.synopsis || '');
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);

  useEffect(() => {
    setInWatchlist(watchlistService.isInWatchlist(movie));
  }, [movie]);

  // Handle Synopsis: Use prop if available, otherwise fetch
  useEffect(() => {
    let active = true;

    const loadSynopsis = async () => {
        if (movie.synopsis) {
            setSynopsis(movie.synopsis);
            return;
        }

        setLoadingSynopsis(true);
        setSynopsis(''); // Clear previous synopsis while loading new one
        
        try {
            const text = await geminiService.getMovieSynopsis(movie.title, movie.year, language);
            if (active) setSynopsis(text);
        } catch (e) {
            if (active) setSynopsis(t.noSynopsis);
        } finally {
            if (active) setLoadingSynopsis(false);
        }
    };

    loadSynopsis();

    return () => { active = false; };
  }, [movie.title, movie.year, movie.synopsis, language]);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWatchlist) {
      watchlistService.removeFromWatchlist(movie);
      setInWatchlist(false);
    } else {
      watchlistService.addToWatchlist(movie);
      setInWatchlist(true);
    }
    
    if (onToggle) {
      onToggle();
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `🎬 ${t.shareTitle}: ${movie.title} (${movie.year})\n⭐ ${t.shareRating}: ${movie.rating}\n🎭 ${t.shareGenre}: ${movie.genres.join(', ')}\n\n"${movie.reason}"\n\n${t.shareRecommended}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t.watchTrailer} ${movie.title}`,
          text: shareText,
        });
      } catch (err) {
        // User cancelled or share failed
        console.debug('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setJustShared(true);
        setTimeout(() => setJustShared(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

  const isTv = movie.type === 'tv';

  return (
    <div className="group relative bg-surface border border-surfaceHighlight rounded-xl overflow-hidden hover:border-gray-700 transition-all duration-300 flex flex-col h-full shadow-lg">
      <div className="relative aspect-[2/3] overflow-hidden bg-surfaceHighlight">
        <img 
          src={imageUrl} 
          alt={movie.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-90" />
        
        {/* Play Trailer Overlay Button - Always Visible, High Z-Index, Prominent */}
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayTrailer && onPlayTrailer(movie);
                }}
                className="pointer-events-auto bg-black/50 hover:bg-primary text-white rounded-full p-5 backdrop-blur-sm border border-white/30 hover:border-transparent transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] hover:scale-110"
                aria-label={t.watchTrailer}
            >
                <Play size={36} fill="currentColor" className="ml-1" />
            </button>
        </div>

        {/* Action Buttons (Top Left) */}
        <div className="absolute top-2 left-2 flex gap-2 z-40">
            {/* Watchlist Button */}
            <button
              onClick={toggleWatchlist}
              className={`p-2 rounded-full backdrop-blur-md border transition-all duration-200 ${
                inWatchlist 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
              }`}
              aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            >
              {inWatchlist ? <Check size={16} /> : <Bookmark size={16} />}
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className={`p-2 rounded-full backdrop-blur-md border transition-all duration-200 ${
                justShared
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
              }`}
              aria-label="Share movie"
              title="Share movie"
            >
              {justShared ? <Check size={16} /> : <Share2 size={16} />}
            </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 z-20 pointer-events-none">
          <h3 className="text-xl font-bold text-white leading-tight mb-1 drop-shadow-md flex items-center gap-2">
            {movie.title}
          </h3>
          
          {/* Metadata Row */}
          <div className="flex items-center text-sm text-gray-300 space-x-3 flex-wrap gap-y-1 mb-1">
            <span className="flex items-center"><Calendar size={14} className="mr-1" /> {movie.year}</span>
            <span className="flex items-center"><Star size={14} className="mr-1 text-yellow-500" /> {movie.rating}</span>
            {/* Show Runtime OR Seasons */}
            {isTv && movie.totalSeasons ? (
                <span className="flex items-center text-blue-300"><Layers size={14} className="mr-1" /> {movie.totalSeasons}</span>
            ) : (
                <span className="flex items-center"><Clock size={14} className="mr-1" /> {movie.runtime}</span>
            )}
            
            {/* Language + Industry (if available) */}
            {(movie.language || movie.industry) && (
                <span className="flex items-center text-primary">
                    <Globe size={14} className="mr-1" /> 
                    {movie.industry ? (movie.language ? `${movie.language} | ${movie.industry}` : movie.industry) : movie.language}
                </span>
            )}
          </div>

          {/* Director/Creator Row */}
          {movie.director && (
            <div className="flex items-center text-xs text-gray-400">
                <Clapperboard size={12} className="mr-1.5 text-primary" />
                <span className="font-medium text-gray-200">{movie.director}</span>
            </div>
          )}
        </div>
        
        {/* Type Badge (TV vs Movie) */}
        <div className={`absolute top-2 right-2 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-full border border-white/10 z-20 flex items-center gap-1 ${isTv ? 'bg-blue-900/60' : 'bg-black/60'}`}>
          {isTv ? <Tv size={10} /> : null}
          {isTv ? 'TV' : `#${index + 1}`}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-grow space-y-3 relative z-10">
        {/* Genres */}
        <div className="flex flex-wrap gap-1.5">
          {movie.genres.map((genre) => (
            <span key={genre} className="px-2 py-0.5 text-xs bg-surfaceHighlight text-gray-300 rounded border border-gray-800">
              {genre}
            </span>
          ))}
        </div>

        {/* Special Feature Badge */}
        {movie.specialFeature && (
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-lg px-2.5 py-2">
                <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-purple-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-purple-200 font-medium leading-snug">{movie.specialFeature}</span>
                </div>
            </div>
        )}

        {/* Reason */}
        <div className="bg-surfaceHighlight/50 p-3 rounded-lg border border-white/5">
            <div className="flex items-start gap-2">
                <Info size={16} className="text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-gray-300 leading-relaxed italic">"{movie.reason}"</p>
            </div>
        </div>

        {/* Synopsis */}
        <div className="px-1">
             <div className="flex items-center gap-1.5 mb-1">
                <FileText size={12} className="text-textMuted" />
                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{t.synopsis}</h4>
             </div>
             {loadingSynopsis ? (
                 <div className="space-y-1.5 animate-pulse">
                     <div className="h-2 w-full bg-surfaceHighlight rounded"></div>
                     <div className="h-2 w-4/5 bg-surfaceHighlight rounded"></div>
                 </div>
             ) : (
                 <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 hover:line-clamp-none transition-all cursor-default">
                    {synopsis || t.noSynopsis}
                 </p>
             )}
        </div>

        {/* Tone & Context */}
        <div className="grid grid-cols-2 gap-2 mt-auto pt-2 text-xs text-gray-400 border-t border-white/5">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">{t.tone}</span>
            <span>{movie.emotionalTone}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">{t.bestFor}</span>
            <span>{movie.bestSuitedFor}</span>
          </div>
        </div>
        
        {/* Mobile-only Play Button (Visible below image on small screens) */}
        <button
            onClick={() => onPlayTrailer && onPlayTrailer(movie)}
            className="md:hidden w-full mt-2 flex items-center justify-center gap-2 bg-surfaceHighlight hover:bg-gray-800 border border-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
        >
            <Play size={14} fill="currentColor" /> {t.watchTrailer}
        </button>
      </div>
    </div>
  );
};