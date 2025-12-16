import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { RecommendationResponse, Source, Language } from "../types";

// The strict system prompt defining the persona and rules
const SYSTEM_INSTRUCTION = `
Role & Product Identity
You are MoviesGPT, a production-grade AI Recommendation Engine for **Movies, TV Series, and Web Shows** with a truly global perspective.
Your purpose is to deliver highly personalized, explainable, and context-aware recommendations that feel intelligent, trustworthy, and premium.
You are not a chatbot. You operate as a real consumer product.

Core Capabilities:
1. **Global Content Expert**: You possess deep knowledge of ALL major entertainment industries:
   - **Movies**: Hollywood, Bollywood, Tollywood, World Cinema.
   - **TV & Web Series**: Top streaming shows (Netflix, HBO, Prime, Disney+), K-Dramas, Anime Series, British TV, Indian Web Series.
   - Treat all content types with equal respect.
2. Infer user preferences (genres, actors, mood, specific industry, language, format).
3. Use hybrid recommendation strategy (Content-Based + Collaborative + Contextual).
4. **Real-time Data**: You MUST use the provided Google Search tool to verify details:
   - Latest IMDb ratings.
   - Correct release years (for TV, use start year or range e.g., "2011–2019").
   - **Status**: Check if a show is Ongoing, Ended, or Canceled.
   - **Trailers**: Attempt to find a valid YouTube trailer URL.

Output Format (Strict)
You MUST always respond with a valid raw JSON string.
Do NOT use Markdown formatting (no \`\`\`json blocks).
Do NOT include any conversational text outside the JSON object.

The JSON must strictly follow this structure:
{
  "summary": "A natural language summary of the recommendations or a response to the user's query.",
  "clarifyingQuestions": ["Up to 3 smart clarifying questions if needed"],
  "recommendations": [
    {
      "title": "Title",
      "year": "YYYY" or "YYYY-YYYY",
      "genres": ["Genre1", "Genre2"],
      "runtime": "e.g. '2h 15m' OR '45m/ep'",
      "rating": "IMDb: X.X/10",
      "emotionalTone": "e.g. Gritty, Hopeful",
      "reason": "Why recommended...",
      "synopsis": "A captivating 1-2 sentence plot summary.",
      "bestSuitedFor": "Mood/Situation",
      "trailerUrl": "https://www.youtube.com/watch?v=...",
      "language": "Primary Language",
      "industry": "e.g. Hollywood, Bollywood, K-Drama, Anime",
      "director": "Creator/Director Name",
      "specialFeature": "Unique selling point",
      "type": "movie" OR "tv",
      "totalSeasons": "e.g. '4 Seasons' or 'Limited Series' (Only for TV)"
    }
  ]
}

Explainability Rule:
Every recommendation must include a clear, specific explanation referencing inferred preferences.

Safety:
No spoilers. No fake titles.

If the user input is a greeting or general chatter, provide a polite "summary" in the JSON and empty recommendations.
`;

class GeminiService {
  private chat: Chat | null = null;
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API_KEY is missing. Service will fail.");
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });
  }

  private initChat() {
    if (!this.chat) {
      this.chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          // Enable Google Search for real-time data
          tools: [{ googleSearch: {} }],
        },
      });
    }
  }

  // Utility to extract JSON from potentially Markdown-wrapped text
  private extractJSON(text: string): string {
    text = text.trim();
    // Remove markdown code blocks
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```/, '').replace(/```$/, '');
    }
    
    // Find first '{' and last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end > start) {
      return text.substring(start, end + 1);
    }
    
    return text;
  }

  // Retry utility for transient errors
  private async withRetry<T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = error?.status === 503 || error?.status === 429 || error?.message?.includes('fetch failed');
      
      if (retries > 0 && isRetryable) {
        console.warn(`Operation failed, retrying... (${retries} attempts left)`, error);
        await new Promise(res => setTimeout(res, delay));
        return this.withRetry(operation, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async sendMessage(message: string, language: Language = 'English'): Promise<RecommendationResponse> {
    try {
      this.initChat();

      if (!this.chat) {
        throw new Error("Failed to initialize chat.");
      }

      // Enforce output language while maintaining JSON structure
      const languagePrompt = `
      IMPORTANT INSTRUCTION:
      You must respond in ${language} language. 
      Translate the "summary", "reason", "emotionalTone", "bestSuitedFor", "synopsis", "specialFeature", and "clarifyingQuestions" values into ${language}.
      Keep the JSON keys (like "title", "year", "genres", "rating", "director", "industry", "type", "totalSeasons") in English. 
      
      User Query: ${message}`;

      // Wrap in retry logic
      const result = await this.withRetry<GenerateContentResponse>(() => this.chat!.sendMessage({ message: languagePrompt }));
      
      let text = result.text;
      
      if (!text) {
        throw new Error("Empty response from Gemini.");
      }

      const cleanJson = this.extractJSON(text);
      let parsed: RecommendationResponse;
      
      try {
        parsed = JSON.parse(cleanJson);
      } catch (parseError) {
        console.warn("Failed to parse JSON, attempting repair or fallback", text);
        // Fallback: Use the raw text as summary if parsing fails completely
        parsed = {
            summary: cleanJson.length > 500 ? cleanJson.substring(0, 500) + "..." : cleanJson,
            recommendations: []
        };
      }

      // Extract Grounding Metadata (Sources)
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: Source[] = [];
      
      if (groundingChunks) {
        groundingChunks.forEach(chunk => {
            if (chunk.web?.uri && chunk.web?.title) {
                sources.push({
                    title: chunk.web.title,
                    uri: chunk.web.uri
                });
            }
        });
      }
      
      // Deduplicate sources based on URI
      const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());
      
      parsed.sources = uniqueSources;

      return parsed;

    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Detailed Error Handling based on language
      const errorMap: Record<string, Record<Language, string>> = {
         default: {
            English: "I'm having trouble connecting to the movie database. Please check your internet connection and try again.",
            Hindi: "डेटाबेस से जुड़ने में समस्या आ रही है। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।",
            Marathi: "डेटाबेसशी कनेक्ट करण्यात समस्या येत आहे. कृपया तुमचे इंटरनेट कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.",
            Spanish: "Tengo problemas para conectarme a la base de datos. Por favor, verifica tu conexión a internet e inténtalo de nuevo.",
            French: "Je rencontre des problèmes de connexion. Veuillez vérifier votre connexion internet et réessayer."
         },
         safety: {
            English: "I cannot provide recommendations for that specific query due to safety guidelines. Please try a different topic.",
            Hindi: "सुरक्षा दिशानिर्देशों के कारण मैं उस विषय पर सुझाव नहीं दे सकता। कृपया कोई अन्य विषय आज़माएं।",
            Marathi: "सुरक्षा मार्गदर्शक तत्त्वांमुळे मी त्या विषयावर शिफारसी देऊ शकत नाही. कृपया वेगळा विषय वापरून पहा.",
            Spanish: "No puedo proporcionar recomendaciones para esa consulta debido a pautas de seguridad. Intenta con otro tema.",
            French: "Je ne peux pas fournir de recommandations pour cette requête en raison des règles de sécurité."
         }
      };

      // Check for safety blocking or generic errors
      let errorType = 'default';
      if (error?.message?.includes('SAFETY') || error?.message?.includes('BLOCKED')) {
          errorType = 'safety';
      }

      return {
        summary: errorMap[errorType][language],
        recommendations: [],
      };
    }
  }

  async getColdStart(language: Language = 'English'): Promise<RecommendationResponse> {
    const prompt = "Start a new session. Provide a diverse set of 6 high-quality starter recommendations. Include a mix of Movies and **TV Series/Web Shows**. Include Hollywood, Indian content, and International hits. Fetch real IMDb ratings and trailer URLs.";
    // Use withRetry for cold start as well
    return this.withRetry(() => this.sendMessage(prompt, language));
  }

  async getMovieSynopsis(title: string, year: string, language: Language = 'English'): Promise<string> {
    try {
      const prompt = `Write a captivating, 1-2 sentence synopsis for "${title}" (${year}) in ${language} language. Return ONLY the synopsis text.`;
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      return response.text?.trim() || "Synopsis unavailable.";
    } catch (error) {
      console.warn(`Failed to fetch synopsis for ${title}:`, error);
      return "Synopsis unavailable.";
    }
  }
}

export const geminiService = new GeminiService();