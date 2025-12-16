import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Film, Sparkles, Loader2, Bookmark, ArrowUpDown, Filter, Download, FileText, File, Languages, Tags, Globe, User, LogOut, Clock, Tv, LayoutGrid, RefreshCw, WifiOff } from 'lucide-react';
import { Message, Movie, RecommendationResponse, Language } from './types';
import { geminiService } from './services/geminiService';
import { watchlistService } from './services/watchlistService';
import { historyService } from './services/historyService';
import { MovieCard } from './components/MovieCard';
import { ChatBubble } from './components/ChatBubble';
import { TrailerModal } from './components/TrailerModal';
import { AuthModal } from './components/AuthModal';
import { HistoryModal } from './components/HistoryModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { jsPDF } from "jspdf";
import { translations } from './translations';

// Standard Genres List
const GENRES = [
  'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 
  'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 
  'History', 'Horror', 'Music', 'Musical', 'Mystery', 
  'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'
];

// Major Film Industries
const INDUSTRIES = [
  'Hollywood', 'Bollywood', 'Tollywood', 'Kollywood', 
  'Mollywood', 'Sandalwood', 'Anime', 'K-Drama',
  'European', 'British', 'International'
];

// Inner App Component to use Auth Context
const MoviesGPTApp = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [hasInitializationError, setHasInitializationError] = useState(false);
  
  // Auth State
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Language State
  const [language, setLanguage] = useState<Language>('English');
  const t = translations[language];

  // View State
  const [viewMode, setViewMode] = useState<'recommendations' | 'watchlist'>('recommendations');
  const [watchlist, setWatchlist] = useState<Movie[]>([]);

  // Filter/Sort State
  const [sortBy, setSortBy] = useState<'default' | 'newest' | 'oldest'>('default');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');
  const [filterDecade, setFilterDecade] = useState<string>('all');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  
  // Download Menu State
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Trailer State
  const [selectedTrailerMovie, setSelectedTrailerMovie] = useState<Movie | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Watchlist
  useEffect(() => {
    // Reload watchlist whenever user changes or view mode changes
    if (viewMode === 'watchlist' || user) {
      setWatchlist(watchlistService.getWatchlist(user?.uid));
    }
  }, [viewMode, user]);

  const refreshWatchlist = () => {
     setWatchlist(watchlistService.getWatchlist(user?.uid));
  };

  const handlePlayTrailer = (movie: Movie) => {
    setSelectedTrailerMovie(movie);
  };

  const closeTrailer = () => {
    setSelectedTrailerMovie(null);
  };

  // Initialization Logic
  const initApp = async () => {
    setIsLoading(true);
    setHasInitializationError(false);
    try {
      // Initial load is always English to be safe, or we could check browser lang
      const response = await geminiService.getColdStart('English');
      const initialMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: response,
        timestamp: Date.now(),
      };
      setMessages([initialMsg]);
      setRecommendations(response.recommendations);
    } catch (e) {
      console.error("Initialization failed", e);
      setHasInitializationError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Cold Start
  useEffect(() => {
    initApp();
  }, []);

  // Modified to accept text argument for History triggers
  const handleSend = async (textOverride?: string) => {
    const userText = textOverride || input.trim();
    if (!userText || isLoading) return;

    // Reset input if it was typed
    if (!textOverride) setInput('');
    
    setIsLoading(true);
    
    // Save to History
    historyService.addToHistory(userText, user?.uid);
    
    // Ensure we switch back to recommendations view when asking for new movies
    setViewMode('recommendations');
    // Reset sort and filter for new search results
    setSortBy('default');
    setFilterType('all');
    setFilterDecade('all');
    setFilterGenre('all');
    setFilterIndustry('all');

    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Fetch from Gemini with selected language
      const response = await geminiService.sendMessage(userText, language);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, botMsg]);
      
      // Update recommendations only if the response contains them
      if (response.recommendations && response.recommendations.length > 0) {
        setRecommendations(response.recommendations);
      }
    } catch (error) {
        // Error handling visual feedback
        const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: {
                summary: translations[language].connectionError,
                recommendations: []
            },
            timestamp: Date.now()
        }
        setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleHistorySelect = (query: string) => {
      setIsHistoryModalOpen(false);
      handleSend(query);
  };

  const displayMovies = useMemo(() => {
    const currentList = viewMode === 'watchlist' ? watchlist : recommendations;
    
    let filtered = currentList;

    // 0. Filter by Type (Movie vs TV)
    if (filterType !== 'all') {
        filtered = filtered.filter(item => item.type === filterType);
    }

    // 1. Filter by Industry
    if (filterIndustry !== 'all') {
      filtered = filtered.filter(movie => {
        const ind = movie.industry?.toLowerCase() || '';
        const lang = movie.language?.toLowerCase() || '';
        const target = filterIndustry.toLowerCase();
        // Check industry field primarily, fallback to language check
        return ind.includes(target) || lang.includes(target);
      });
    }

    // 2. Filter by Decade
    if (filterDecade !== 'all') {
        filtered = filtered.filter(movie => {
            const yearStr = movie.year.split('–')[0].split('-')[0].trim(); // Handle "2010–2014" or "2020-"
            const year = parseInt(yearStr);
            if (isNaN(year)) return false;

            if (filterDecade === 'older') {
                return year < 1980;
            }
            
            const decadeStart = parseInt(filterDecade);
            return year >= decadeStart && year < decadeStart + 10;
        });
    }

    // 3. Filter by Genre
    if (filterGenre !== 'all') {
      filtered = filtered.filter(movie => 
        movie.genres.some(g => g.toLowerCase().includes(filterGenre.toLowerCase()))
      );
    }

    // 4. Sort
    const sorted = [...filtered];

    if (sortBy === 'newest') {
        sorted.sort((a, b) => {
             const yA = parseInt(a.year.split('–')[0]) || 0;
             const yB = parseInt(b.year.split('–')[0]) || 0;
             return yB - yA;
        });
    } else if (sortBy === 'oldest') {
        sorted.sort((a, b) => {
             const yA = parseInt(a.year.split('–')[0]) || 0;
             const yB = parseInt(b.year.split('–')[0]) || 0;
             return yA - yB;
        });
    }
    
    return sorted;
  }, [viewMode, watchlist, recommendations, sortBy, filterDecade, filterGenre, filterIndustry, filterType]);

  // --- Download Handlers ---

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const title = viewMode === 'watchlist' ? `${t.watchlist} - MoviesGPT` : `${t.topPicks} - MoviesGPT`;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(229, 9, 20); // Primary Red
    doc.text(title, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 26);
    
    let y = 40;
    
    displayMovies.forEach((movie, index) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`${index + 1}. ${movie.title} (${movie.year})`, 14, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(80);
        const industryText = movie.industry ? ` | ${movie.industry}` : '';
        const typeText = movie.type === 'tv' ? ` | ${movie.totalSeasons || 'TV Series'}` : '';
        doc.text(`${movie.genres.join(', ')} | ${movie.rating} | ${movie.runtime}${industryText}${typeText}`, 14, y);
        y += 6;
        const desc = movie.synopsis || movie.reason || "";
        const splitDesc = doc.splitTextToSize(desc, 180);
        doc.setTextColor(50);
        doc.text(splitDesc, 14, y);
        y += (splitDesc.length * 5) + 8;
    });
    
    doc.save("moviesgpt-list.pdf");
    setShowDownloadMenu(false);
  };

  const handleDownloadDOC = () => {
    const title = viewMode === 'watchlist' ? t.watchlist : t.topPicks;
    let htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${title}</title></head>
        <body style="font-family: Arial, sans-serif;">
        <h1 style="color: #E50914;">${title} - MoviesGPT</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        <hr/>
    `;
    displayMovies.forEach((movie, idx) => {
        htmlContent += `
            <div style="margin-bottom: 20px; padding-bottom: 10px;">
                <h2 style="margin-bottom: 5px;">${idx + 1}. ${movie.title} (${movie.year})</h2>
                <p style="color: #666; font-size: 0.9em;">
                    <strong>${t.shareRating}:</strong> ${movie.rating} | 
                    <strong>Runtime:</strong> ${movie.runtime} | 
                    <strong>${t.shareGenre}:</strong> ${movie.genres.join(', ')}
                    ${movie.industry ? `| <strong>${t.industry}:</strong> ${movie.industry}` : ''}
                    ${movie.type === 'tv' ? `| <strong>${t.seasons}:</strong> ${movie.totalSeasons}` : ''}
                </p>
                <p><strong>${t.synopsis}:</strong><br/>${movie.synopsis || movie.reason}</p>
                <p><em>${t.bestFor}: ${movie.bestSuitedFor}</em></p>
            </div>
            <hr style="border: 0; border-top: 1px solid #eee;" />
        `;
    });
    htmlContent += "</body></html>";
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moviesgpt-${viewMode}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowDownloadMenu(false);
  };

  return (
    <div className="flex h-screen bg-background text-textMain overflow-hidden">
      
      {/* Sidebar / Chat Area */}
      <div className="w-full md:w-[450px] flex flex-col border-r border-surfaceHighlight bg-surface/50 backdrop-blur relative z-20">
        
        {/* Header */}
        <header className="h-16 border-b border-surfaceHighlight flex items-center px-6 justify-between bg-surface/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Film className="text-primary" size={24} />
            <h1 className="font-bold text-lg tracking-tight">{t.title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
             {/* History Button */}
             <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="p-1.5 text-textMuted hover:text-white hover:bg-surfaceHighlight rounded-lg transition-colors"
                title={t.history}
             >
                <Clock size={18} />
             </button>

             {/* Language Dropdown */}
             <div className="relative group">
                <div className="flex items-center gap-1.5 bg-surfaceHighlight hover:bg-gray-800 text-xs font-medium text-gray-300 rounded px-2 py-1.5 cursor-pointer border border-gray-800 transition-colors">
                    <Languages size={14} />
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="bg-transparent border-none outline-none appearance-none cursor-pointer w-full text-center"
                        aria-label="Select Language"
                    >
                        <option value="English">EN</option>
                        <option value="Hindi">HI</option>
                        <option value="Marathi">MR</option>
                        <option value="Spanish">ES</option>
                        <option value="French">FR</option>
                    </select>
                </div>
             </div>

            <button 
                onClick={() => setViewMode('watchlist')}
                className="md:hidden p-2 text-textMuted hover:text-white"
                aria-label={t.watchlist}
            >
                <Bookmark size={20} />
            </button>
          </div>
        </header>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-textMuted text-sm px-4 mb-4">
              <Loader2 className="animate-spin text-primary" size={16} />
              <span>{t.thinking}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-surfaceHighlight bg-surface">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              className="w-full bg-surfaceHighlight border border-gray-700 text-textMain placeholder-gray-500 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                !input.trim() || isLoading 
                  ? 'text-gray-600 cursor-not-allowed' 
                  : 'text-primary hover:bg-primary/10'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-600 mt-2">
            {t.disclaimer}
          </p>
        </div>

        {/* Auth Overlay (Sidebar Mode) */}
        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          language={language}
        />
      </div>

      {/* Main Content / Grid Area (Hidden on mobile) */}
      <div className="hidden md:flex flex-1 flex-col bg-background relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
           <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
           <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Main Content Header */}
        <div className="h-16 flex items-center justify-between px-8 relative z-30 border-b border-white/5 bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setViewMode('recommendations')}
              className={`flex items-center gap-2 text-sm transition-colors py-2 border-b-2 ${
                viewMode === 'recommendations' 
                  ? 'text-white font-medium border-primary' 
                  : 'text-textMuted hover:text-gray-300 border-transparent'
              }`}
            >
              <Sparkles size={16} className={viewMode === 'recommendations' ? "text-yellow-500" : ""} />
              <span>{t.topPicks}</span>
            </button>

            <button
              onClick={() => setViewMode('watchlist')}
              className={`flex items-center gap-2 text-sm transition-colors py-2 border-b-2 ${
                viewMode === 'watchlist' 
                  ? 'text-white font-medium border-primary' 
                  : 'text-textMuted hover:text-gray-300 border-transparent'
              }`}
            >
              <Bookmark size={16} className={viewMode === 'watchlist' ? "text-primary" : ""} />
              <span>{t.watchlist}</span>
            </button>
          </div>

          {/* Filter, Sort & Download Controls */}
          <div className="flex items-center gap-4">

             {/* NEW: Type Filter (Movie vs TV) */}
             <div className="flex items-center gap-2">
                <span className="text-xs text-textMuted uppercase tracking-wider font-medium hidden lg:block">{t.type}</span>
                <div className="relative group">
                    <div className="flex items-center gap-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-sm text-gray-200 rounded-lg px-3 py-1.5 border border-white/10 transition-colors">
                        {filterType === 'tv' ? <Tv size={14} className="text-primary" /> : <LayoutGrid size={14} className="text-primary" />}
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as 'all' | 'movie' | 'tv')}
                            className="bg-transparent border-none outline-none appearance-none cursor-pointer pr-4 focus:ring-0 w-24 sm:w-28 text-ellipsis"
                            style={{ backgroundColor: 'transparent' }}
                        >
                            <option value="all" className="bg-surfaceHighlight text-gray-200">{t.allTypes}</option>
                            <option value="movie" className="bg-surfaceHighlight text-gray-200">{t.movies}</option>
                            <option value="tv" className="bg-surfaceHighlight text-gray-200">{t.tvSeries}</option>
                        </select>
                    </div>
                </div>
             </div>

             <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

             {/* Industry Filter */}
             <div className="flex items-center gap-2">
                <span className="text-xs text-textMuted uppercase tracking-wider font-medium hidden lg:block">{t.industry}</span>
                <div className="relative group">
                    <div className="flex items-center gap-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-sm text-gray-200 rounded-lg px-3 py-1.5 border border-white/10 transition-colors">
                        <Globe size={14} className="text-primary" />
                        <select
                            value={filterIndustry}
                            onChange={(e) => setFilterIndustry(e.target.value)}
                            className="bg-transparent border-none outline-none appearance-none cursor-pointer pr-4 focus:ring-0 w-24 sm:w-32 text-ellipsis"
                            style={{ backgroundColor: 'transparent' }}
                        >
                            <option value="all" className="bg-surfaceHighlight text-gray-200">{t.allIndustries}</option>
                            {INDUSTRIES.map(ind => (
                              <option key={ind} value={ind} className="bg-surfaceHighlight text-gray-200">{ind}</option>
                            ))}
                        </select>
                    </div>
                </div>
             </div>

             <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
             
             {/* Genre Filter */}
             <div className="flex items-center gap-2">
                <span className="text-xs text-textMuted uppercase tracking-wider font-medium hidden lg:block">{t.genre}</span>
                <div className="relative group">
                     {/* ... Genre Select ... */}
                    <div className="flex items-center gap-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-sm text-gray-200 rounded-lg px-3 py-1.5 border border-white/10 transition-colors">
                        <Tags size={14} className="text-primary" />
                        <select
                            value={filterGenre}
                            onChange={(e) => setFilterGenre(e.target.value)}
                            className="bg-transparent border-none outline-none appearance-none cursor-pointer pr-4 focus:ring-0 w-24 sm:w-32 text-ellipsis"
                            style={{ backgroundColor: 'transparent' }}
                        >
                            <option value="all" className="bg-surfaceHighlight text-gray-200">{t.allGenres}</option>
                            {GENRES.map(g => (
                              <option key={g} value={g} className="bg-surfaceHighlight text-gray-200">{g}</option>
                            ))}
                        </select>
                    </div>
                </div>
             </div>

             <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

             {/* Sort Control */}
             <div className="flex items-center gap-2">
                <span className="text-xs text-textMuted uppercase tracking-wider font-medium hidden lg:block">{t.sort}</span>
                <div className="relative group">
                    <div className="flex items-center gap-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-sm text-gray-200 rounded-lg px-3 py-1.5 border border-white/10 transition-colors">
                        <ArrowUpDown size={14} className="text-primary" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'default' | 'newest' | 'oldest')}
                            className="bg-transparent border-none outline-none appearance-none cursor-pointer pr-4 focus:ring-0"
                            style={{ backgroundColor: 'transparent' }}
                        >
                            <option value="default" className="bg-surfaceHighlight text-gray-200">{t.relevance}</option>
                            <option value="newest" className="bg-surfaceHighlight text-gray-200">{t.newest}</option>
                            <option value="oldest" className="bg-surfaceHighlight text-gray-200">{t.oldest}</option>
                        </select>
                    </div>
                </div>
             </div>

             <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

             {/* Download Dropdown */}
             <div className="relative">
                <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center gap-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-sm text-gray-200 rounded-lg px-3 py-1.5 border border-white/10 transition-colors"
                    title="Download List"
                >
                    <Download size={14} className="text-primary" />
                </button>
                
                {showDownloadMenu && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowDownloadMenu(false)}
                        ></div>
                        <div className="absolute right-0 mt-2 w-48 bg-surface border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                             <div className="p-1">
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <FileText size={16} className="text-red-500" />
                                    <span>{t.downloadPdf}</span>
                                </button>
                                <button
                                    onClick={handleDownloadDOC}
                                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <File size={16} className="text-blue-500" />
                                    <span>{t.downloadWord}</span>
                                </button>
                             </div>
                        </div>
                    </>
                )}
             </div>

             <div className="h-4 w-px bg-white/10 hidden sm:block"></div>

             {/* Auth Button */}
             <div className="relative">
                {user ? (
                   <div className="relative">
                       <button
                           onClick={() => setShowUserMenu(!showUserMenu)}
                           className="flex items-center gap-2 bg-surfaceHighlight hover:bg-surfaceHighlight/80 text-sm text-white rounded-lg px-3 py-1.5 border border-white/10 transition-colors"
                       >
                           {user.photoURL ? (
                               <img src={user.photoURL} alt="User" className="w-5 h-5 rounded-full" />
                           ) : (
                               <User size={16} className="text-primary" />
                           )}
                           <span className="max-w-[100px] truncate">{user.displayName || t.welcomeBack}</span>
                       </button>

                       {showUserMenu && (
                           <>
                               <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
                               <div className="absolute right-0 mt-2 w-48 bg-surface border border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                   <div className="p-4 border-b border-gray-800">
                                       <p className="text-sm font-bold text-white truncate">{user.displayName || t.guest}</p>
                                       <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                   </div>
                                   <div className="p-1">
                                       <button
                                           onClick={() => {
                                               logout();
                                               setShowUserMenu(false);
                                               setViewMode('recommendations'); // Reset view on logout
                                           }}
                                           className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                                       >
                                           <LogOut size={16} />
                                           <span>{t.logout}</span>
                                       </button>
                                   </div>
                               </div>
                           </>
                       )}
                   </div>
                ) : (
                   <button
                       onClick={() => setIsAuthModalOpen(true)}
                       className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-sm text-white rounded-lg px-4 py-1.5 font-bold transition-all shadow-lg shadow-red-900/20"
                   >
                       <User size={16} />
                       <span className="hidden sm:inline">{t.login}</span>
                   </button>
                )}
             </div>

          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
          {hasInitializationError && displayMovies.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-textMuted space-y-6">
                 <div className="w-20 h-20 rounded-full bg-surfaceHighlight flex items-center justify-center border border-gray-800">
                     <WifiOff size={40} className="text-red-500 opacity-80" />
                 </div>
                 <div className="text-center space-y-2 max-w-md">
                     <h3 className="text-xl font-bold text-white">{t.coldStartError}</h3>
                     <p className="text-sm text-gray-500">{t.genericError}</p>
                 </div>
                 <button 
                    onClick={initApp}
                    className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primaryHover text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/20"
                 >
                    <RefreshCw size={18} />
                    {t.retry}
                 </button>
             </div>
          ) : displayMovies.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
              {displayMovies.map((movie, idx) => (
                <MovieCard 
                    key={`${movie.title}-${movie.year}-${idx}`} 
                    movie={movie} 
                    index={idx} 
                    onToggle={refreshWatchlist}
                    onPlayTrailer={handlePlayTrailer}
                    language={language}
                />
              ))}
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                <div className="w-16 h-16 rounded-full bg-surfaceHighlight flex items-center justify-center">
                    {filterDecade !== 'all' || filterGenre !== 'all' || filterIndustry !== 'all' || filterType !== 'all'
                      ? <Filter size={32} className="opacity-50" /> 
                      : (viewMode === 'watchlist' 
                        ? <Bookmark size={32} className="opacity-50" /> 
                        : <Film size={32} className="opacity-50" />)
                    }
                </div>
                <p>
                    {filterDecade !== 'all' || filterGenre !== 'all' || filterIndustry !== 'all' || filterType !== 'all'
                        ? t.emptyFilter 
                        : (viewMode === 'watchlist' 
                            ? t.emptyWatchlist 
                            : t.welcome)}
                </p>
                {viewMode === 'watchlist' && filterDecade === 'all' && filterGenre === 'all' && filterIndustry === 'all' && filterType === 'all' && (
                    <button 
                        onClick={() => setViewMode('recommendations')}
                        className="text-primary text-sm hover:underline"
                    >
                        {t.browse}
                    </button>
                )}
                {(filterDecade !== 'all' || filterGenre !== 'all' || filterIndustry !== 'all' || filterType !== 'all') && (
                     <button 
                        onClick={() => {
                          setFilterDecade('all');
                          setFilterGenre('all');
                          setFilterIndustry('all');
                          setFilterType('all');
                        }}
                        className="text-primary text-sm hover:underline"
                    >
                        {t.clearFilters}
                    </button>
                )}
             </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TrailerModal 
        movie={selectedTrailerMovie} 
        isOpen={!!selectedTrailerMovie} 
        onClose={closeTrailer}
        language={language}
      />
      
      {/* AuthModal Removed from here and placed inside Sidebar above */}
      
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelect={handleHistorySelect}
        language={language}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MoviesGPTApp />
    </AuthProvider>
  );
}