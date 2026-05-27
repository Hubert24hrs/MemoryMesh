// src/services/ai/ClaudeProvider.ts
import { ProcessingResult } from '../../types/ai';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

export const claudeProvider = {
  name: 'claude' as const,

  /**
   * Processes input memory text to extract rich semantic metadata using Claude Sonnet
   */
  processMemory: async (text: string): Promise<ProcessingResult> => {
    try {
      if (!ANTHROPIC_API_KEY) {
        console.warn('⚠️ Anthropic API key is missing. Using dynamic local parser fallback.');
        return claudeProvider.localFallbackParser(text);
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: `You are an expert memory analyst. Extract structured insights from the user's memory. 
You MUST respond with a valid JSON object matching this schema exactly:
{
  "category": "personal" | "work" | "idea" | "task" | "learning" | "social" | "health" | "finance",
  "tags": string[],
  "summary": string,
  "keyPoints": string[],
  "sentiment": "positive" | "neutral" | "negative",
  "importance": number (integer between 1 and 10),
  "causalConnections": string[]
}
Do not write any markdown wrappers, code blocks (such as \`\`\`json), or preamble. Return ONLY the raw JSON string.`,
          messages: [
            {
              role: 'user',
              content: text,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      const rawText = data.content?.[0]?.text || '';
      
      return JSON.parse(rawText.trim()) as ProcessingResult;
    } catch (error) {
      console.error('Claude processing failed, resorting to fallback:', error);
      return claudeProvider.localFallbackParser(text);
    }
  },

  /**
   * localFallbackParser: Local fallback when API keys are not available or fail
   */
  localFallbackParser: (text: string): ProcessingResult => {
    const tags: string[] = [];
    if (text.toLowerCase().includes('work') || text.toLowerCase().includes('meeting')) tags.push('work');
    if (text.toLowerCase().includes('idea') || text.toLowerCase().includes('project')) tags.push('idea');
    if (text.toLowerCase().includes('buy') || text.toLowerCase().includes('pay')) tags.push('finance');
    if (tags.length === 0) tags.push('general');

    // Sentiment heuristic
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (text.toLowerCase().includes('good') || text.toLowerCase().includes('happy') || text.toLowerCase().includes('great')) {
      sentiment = 'positive';
    } else if (text.toLowerCase().includes('bad') || text.toLowerCase().includes('sad') || text.toLowerCase().includes('problem')) {
      sentiment = 'negative';
    }

    return {
      category: tags[0] as any || 'personal',
      tags: tags,
      summary: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
      keyPoints: [text.slice(0, 100)],
      sentiment,
      importance: text.length > 100 ? 7 : 4,
      causalConnections: [],
    };
  },
};
