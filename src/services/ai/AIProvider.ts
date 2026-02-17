export type AIProviderName = 'claude' | 'kimi' | 'openai' | 'gemini';

export interface AIResponse {
  payload: string;
  metadata?: Record<string, any>;
  provider: AIProviderName;
}

export interface AIProviderInterface {
  id: AIProviderName;
  generateResponse(prompt: string, context?: any): Promise<AIResponse>;
}

class AIOrchestrator {
  private providers: Record<AIProviderName, boolean> = {
    claude: true,
    kimi: true,
    openai: true,
    gemini: true,
  };

  getAllCapabilities() {
    return this.providers;
  }

  async generateProactiveInsight(_memories: any[]): Promise<string> {
    // In a real implementation, this would call a specific provider based on routing logic
    return "Remember to drink water and check your task list!";
  }

  async processQuery(query: string, _context: any): Promise<AIResponse> {
    // Mock processing
    return {
      payload: `Processed: ${query}`,
      provider: 'claude'
    }
  }
}

export const aiOrchestrator = new AIOrchestrator();
