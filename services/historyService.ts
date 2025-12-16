import { HistoryItem } from '../types';

const BASE_KEY = 'moviesgpt_history';

const getKey = (userId?: string) => userId ? `${BASE_KEY}_${userId}` : `${BASE_KEY}_guest`;

export const historyService = {
  getHistory: (userId?: string): HistoryItem[] => {
    try {
      const stored = localStorage.getItem(getKey(userId));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
  
  addToHistory: (query: string, userId?: string) => {
    try {
      const key = getKey(userId);
      const history = historyService.getHistory(userId);
      const newItem: HistoryItem = { query, timestamp: Date.now() };
      
      // Remove duplicates (case insensitive) and limit to 20 items
      const filtered = history.filter(h => h.query.toLowerCase() !== query.trim().toLowerCase());
      const updated = [newItem, ...filtered].slice(0, 20);
      
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to add to history", e);
    }
  },
  
  clearHistory: (userId?: string) => {
    try {
      localStorage.removeItem(getKey(userId));
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  }
};