import { Movie } from '../types';

const BASE_STORAGE_KEY = 'moviesgpt_watchlist';

const getKey = (userId?: string) => {
    return userId ? `${BASE_STORAGE_KEY}_${userId}` : `${BASE_STORAGE_KEY}_guest`;
};

export const watchlistService = {
  getWatchlist: (userId?: string): Movie[] => {
    try {
      const stored = localStorage.getItem(getKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse watchlist", e);
      return [];
    }
  },

  addToWatchlist: (movie: Movie, userId?: string) => {
    try {
      const list = watchlistService.getWatchlist(userId);
      // Check for duplicates based on Title + Year
      if (!list.some(m => m.title === movie.title && m.year === movie.year)) {
        const newList = [...list, movie];
        localStorage.setItem(getKey(userId), JSON.stringify(newList));
      }
    } catch (e) {
      console.error("Failed to add to watchlist", e);
    }
  },

  removeFromWatchlist: (movie: Movie, userId?: string) => {
    try {
      let list = watchlistService.getWatchlist(userId);
      list = list.filter(m => !(m.title === movie.title && m.year === movie.year));
      localStorage.setItem(getKey(userId), JSON.stringify(list));
    } catch (e) {
      console.error("Failed to remove from watchlist", e);
    }
  },

  isInWatchlist: (movie: Movie, userId?: string): boolean => {
    try {
      const list = watchlistService.getWatchlist(userId);
      return list.some(m => m.title === movie.title && m.year === movie.year);
    } catch (e) {
      return false;
    }
  }
};