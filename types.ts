export type Language = 'English' | 'Hindi' | 'Marathi' | 'Spanish' | 'French';

export interface Movie {
  title: string;
  year: string;
  genres: string[];
  runtime: string;
  rating: string;
  emotionalTone: string;
  reason: string;
  synopsis?: string;
  bestSuitedFor: string;
  trailerUrl?: string;
  language?: string;
  director?: string;
  specialFeature?: string;
  industry?: string;
  type?: 'movie' | 'tv';
  totalSeasons?: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface RecommendationResponse {
  summary: string;
  clarifyingQuestions?: string[];
  recommendations: Movie[];
  sources?: Source[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string | RecommendationResponse;
  timestamp: number;
}

export interface HistoryItem {
  query: string;
  timestamp: number;
}

export enum ViewMode {
  Chat = 'CHAT',
  Grid = 'GRID'
}