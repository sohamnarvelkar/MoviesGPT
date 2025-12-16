import React from 'react';
import { Message, RecommendationResponse } from '../types';
import { Bot, User, Globe } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  let textContent = '';
  let clarifyingQuestions: string[] = [];
  let sources: { title: string; uri: string }[] = [];

  if (typeof message.content === 'string') {
    textContent = message.content;
  } else {
    const response = message.content as RecommendationResponse;
    textContent = response.summary;
    clarifyingQuestions = response.clarifyingQuestions || [];
    sources = response.sources || [];
  }

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
          isUser ? 'bg-surfaceHighlight border-gray-700' : 'bg-primary border-primary'
        }`}>
          {isUser ? <User size={16} className="text-gray-300" /> : <Bot size={16} className="text-white" />}
        </div>

        {/* Content */}
        <div className={`flex flex-col space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm ${
            isUser 
              ? 'bg-surfaceHighlight text-textMain rounded-tr-sm border border-gray-800' 
              : 'bg-surfaceHighlight/30 text-gray-200 rounded-tl-sm border border-transparent'
          }`}>
            <p className="whitespace-pre-wrap">{textContent}</p>
          </div>

          {/* Sources (Model Only) */}
          {!isUser && sources.length > 0 && (
             <div className="flex flex-col gap-1.5 mt-1 w-full max-w-full">
                <div className="flex items-center gap-1.5 text-xs text-textMuted uppercase tracking-wider ml-1">
                    <Globe size={10} />
                    <span>Sources</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {sources.slice(0, 3).map((source, idx) => (
                        <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate max-w-[200px] bg-surfaceHighlight/50 px-2 py-1 rounded border border-white/5"
                        >
                            {source.title}
                        </a>
                    ))}
                    {sources.length > 3 && (
                        <span className="text-xs text-textMuted py-1">+ {sources.length - 3} more</span>
                    )}
                </div>
             </div>
          )}

          {/* Clarifying Questions (Only for Model) */}
          {!isUser && clarifyingQuestions.length > 0 && (
            <div className="flex flex-col gap-2 mt-2 w-full">
               <span className="text-xs text-textMuted uppercase tracking-wider ml-1">Refine your search</span>
               <div className="flex flex-wrap gap-2">
                 {clarifyingQuestions.map((q, idx) => (
                   <div key={idx} className="px-3 py-1.5 bg-surfaceHighlight/50 border border-primary/20 text-primary text-xs rounded-full cursor-default">
                     {q}
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
