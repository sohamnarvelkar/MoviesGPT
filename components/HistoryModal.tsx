import React, { useState, useEffect } from 'react';
import { X, Clock, Trash2, Search, ArrowRight } from 'lucide-react';
import { HistoryItem, Language } from '../types';
import { historyService } from '../services/historyService';
import { translations } from '../translations';
import { useAuth } from '../context/AuthContext';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (query: string) => void;
  language: Language;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelect, language }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { user } = useAuth();
  const t = translations[language];

  useEffect(() => {
    if (isOpen) {
      setHistory(historyService.getHistory(user?.uid));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleClear = () => {
    historyService.clearHistory(user?.uid);
    setHistory([]);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-surface border border-surfaceHighlight rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-surfaceHighlight flex items-center justify-between bg-surface/80 backdrop-blur-md">
          <div className="flex items-center gap-2 text-white">
            <Clock size={20} className="text-primary" />
            <h2 className="font-bold text-lg">{t.searchHistory}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-textMuted hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {history.length > 0 ? (
            <div className="space-y-1">
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelect(item.query)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surfaceHighlight group transition-all duration-200 text-left"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:text-primary transition-colors text-textMuted">
                      <Search size={14} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-gray-200 text-sm truncate pr-2 font-medium group-hover:text-white">{item.query}</span>
                      <span className="text-[10px] text-gray-500">{formatTime(item.timestamp)}</span>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-textMuted opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-200" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-textMuted space-y-3">
              <div className="w-12 h-12 rounded-full bg-surfaceHighlight flex items-center justify-center">
                <Clock size={24} className="opacity-50" />
              </div>
              <p className="text-sm">{t.emptyHistory}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-surfaceHighlight bg-surface">
            <button
              onClick={handleClear}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all"
            >
              <Trash2 size={16} />
              {t.clearHistory}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};