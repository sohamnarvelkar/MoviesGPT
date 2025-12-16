import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, Search, PlayCircle, Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Movie, Language } from '../types';
import { translations } from '../translations';

interface TrailerModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export const TrailerModal: React.FC<TrailerModalProps> = ({ movie, isOpen, onClose, language = 'English' }) => {
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const t = translations[language];
  
  // Player state tracking
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    // Reset error and player state when modal opens or movie changes
    if (isOpen) {
      setHasError(false);
      setIsMuted(true);
      setIsPlaying(true);
    }
  }, [isOpen, movie]);

  if (!isOpen || !movie) return null;

  // Helper to extract Video ID from various YouTube URL formats
  const getYouTubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    
    const cleanUrl = url.trim();
    
    // Enhanced Regex to handle various YouTube formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);

    if (match && match[2].length === 11) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      // Critical params:
      // enablejsapi=1: Allows postMessage control and error listening
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1&mute=1&enablejsapi=1&controls=1&origin=${encodeURIComponent(origin)}&modestbranding=1&rel=0&playsinline=1`;
    }
    return null;
  };

  const embedUrl = getYouTubeEmbedUrl(movie.trailerUrl);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + " " + movie.year + " trailer")}`;
  
  const showPlayer = embedUrl && !hasError;

  // YouTube Player API Control Helpers
  const sendCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func,
        args
      }), '*');
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      sendCommand('pauseVideo');
    } else {
      sendCommand('playVideo');
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (isMuted) {
      sendCommand('unMute');
    } else {
      sendCommand('mute');
    }
    setIsMuted(!isMuted);
  };

  const handleReplay = () => {
    sendCommand('seekTo', [0, true]);
    sendCommand('playVideo');
    setIsPlaying(true);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-4xl bg-surface border border-surfaceHighlight rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surfaceHighlight bg-surface">
          <h3 className="text-lg font-bold text-white truncate pr-4">
            {movie.title} <span className="text-textMuted font-normal">({movie.year}) - {t.trailerSuffix}</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video bg-black w-full group flex flex-col">
          {showPlayer ? (
            <>
                <iframe
                    ref={iframeRef}
                    width="100%"
                    height="100%"
                    src={embedUrl}
                    title={`${movie.title} Trailer`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 z-10 w-full h-full"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onError={() => setHasError(true)}
                />
                 {/* Fallback overlay for successful load but maybe user wants external */}
                 <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <a 
                         href={movie.trailerUrl || searchUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center gap-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-medium rounded-lg backdrop-blur-md border border-white/10 transition-colors"
                     >
                         <ExternalLink size={12} /> {t.openYoutube}
                     </a>
                 </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center bg-surfaceHighlight/10 relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none" />
              
              <div className="flex flex-col items-center space-y-4 z-10 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="w-20 h-20 rounded-full bg-surfaceHighlight/50 flex items-center justify-center border border-white/10 mb-2">
                     <PlayCircle className="text-gray-400" size={40} />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold text-white">{t.trailerUnavailable}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                        {movie.trailerUrl && !hasError
                            ? t.embedError 
                            : t.loadError}
                    </p>
                  </div>

                  <div className="flex flex-col w-full gap-3 mt-4">
                    {/* Primary Call to Action */}
                    {movie.trailerUrl && (
                        <a 
                        href={movie.trailerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] shadow-xl shadow-red-900/20 w-full border border-red-500/20"
                        >
                        <ExternalLink size={24} /> {t.watchYoutube}
                        </a>
                    )}
                    
                    <a 
                    href={searchUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors border w-full ${
                        movie.trailerUrl 
                            ? "bg-surface hover:bg-surfaceHighlight text-gray-300 hover:text-white border-gray-700" 
                            : "bg-primary hover:bg-primaryHover text-white border-transparent"
                    }`}
                    >
                    <Search size={18} /> {movie.trailerUrl ? t.searchAlternative : t.searchYoutube}
                    </a>
                  </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions - Contextual & Controls */}
        <div className="bg-surface p-4 border-t border-surfaceHighlight flex flex-col sm:flex-row gap-4 justify-between items-center">
             {showPlayer && (
                 <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
                     <div className="flex items-center gap-2 bg-surfaceHighlight/50 rounded-lg p-1 border border-white/5">
                        <button 
                            onClick={togglePlay} 
                            className="p-2 hover:bg-white/10 rounded-md text-white transition-colors" 
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <button 
                            onClick={toggleMute} 
                            className="p-2 hover:bg-white/10 rounded-md text-white transition-colors" 
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <button 
                            onClick={handleReplay} 
                            className="p-2 hover:bg-white/10 rounded-md text-white transition-colors" 
                            title="Replay"
                        >
                            <RotateCcw size={18} />
                        </button>
                     </div>
                 </div>
             )}
             
             <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {showPlayer ? (
                     <button
                        onClick={() => setHasError(true)}
                        className="text-xs text-textMuted hover:text-white underline underline-offset-4"
                    >
                        {t.reportIssue}
                    </button>
                ) : (
                     <span className="text-xs text-textMuted mr-auto">
                        {t.linksNewTab}
                     </span>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};