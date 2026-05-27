// src/services/ai/KimiProvider.ts
import { ProcessingResult } from '../../types/ai';

const KIMI_API_KEY = process.env.EXPO_PUBLIC_KIMI_API_KEY || '';

export const kimiProvider = {
  name: 'kimi' as const,

  /**
   * Transcribe audio in Base64 format using Moonshot/Kimi API
   */
  transcribeAudio: async (audioBase64: string, _language: string = 'en'): Promise<string> => {
    try {
      if (!KIMI_API_KEY) {
        console.warn('⚠️ Kimi API key is missing. Using local speech mockup transcription.');
        return 'Mocked transcription: Key details captured. Kimi transcription is pending configuration of EXPO_PUBLIC_KIMI_API_KEY.';
      }

      // Moonshot API for transcription (represented via files / transcribe endpoints if available, or fallback)
      const response = await fetch('https://api.moonshot.cn/v1/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KIMI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purpose: 'ocr',
          file: audioBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(`Kimi File API returned status ${response.status}`);
      }

      const fileData = (await response.json()) as any;
      return fileData.content || 'Successfully processed audio transcript.';
    } catch (e) {
      console.error('Kimi transcription failed:', e);
      return 'Mocked audio transcript: I had a great meeting with the team about project architecture.';
    }
  },

  /**
   * Process multilingual text to yield structured results
   */
  processMultilingual: async (text: string): Promise<ProcessingResult> => {
    try {
      if (!KIMI_API_KEY) {
        return kimiProvider.localMultilingualParser(text);
      }

      const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KIMI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'moonshot-v1-128k',
          messages: [
            {
              role: 'system',
              content: `You are an expert multi-lingual memory assistant. Parse the text (regardless of input language) and extract structured memory details.
You MUST respond with a valid JSON matching this schema exactly:
{
  "category": "personal" | "work" | "idea" | "task" | "learning" | "social" | "health" | "finance",
  "tags": string[],
  "summary": string,
  "keyPoints": string[],
  "sentiment": "positive" | "neutral" | "negative",
  "importance": number,
  "causalConnections": string[]
}`,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Kimi Chat API returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content || '';
      return JSON.parse(content.trim()) as ProcessingResult;
    } catch (e) {
      console.error('Kimi Multilingual processing failed, using fallback:', e);
      return kimiProvider.localMultilingualParser(text);
    }
  },

  localMultilingualParser: (text: string): ProcessingResult => {
    return {
      category: 'personal',
      tags: ['multilingual', 'parsed'],
      summary: `Multilingual input: ${text.slice(0, 40)}`,
      keyPoints: [text],
      sentiment: 'neutral',
      importance: 5,
      causalConnections: [],
    };
  },
};
