import { 
  IAIProvider, 
  AIProviderConfig, 
  ProviderType, 
  ConversationContext, 
  AIResponse, 
  StreamResponse,
  HealthData,
  MoodData,
  TaskData,
  AIProviderError 
} from '../base/IAIProvider';

/**
 * Mock AI Provider for development and testing
 * Works without any API keys and provides realistic responses
 */
export class MockProvider implements IAIProvider {
  public name: ProviderType = 'mock' as ProviderType;
  public config: AIProviderConfig;

  constructor() {
    this.config = {
      name: 'mock' as ProviderType,
      displayName: 'Mock AI (Development)',
      apiKey: 'mock-key',
      models: [
        {
          name: 'mock-gpt-4',
          displayName: 'Mock GPT-4',
          contextWindow: 8192,
          maxTokens: 4096,
          pricing: { input: 0.03, output: 0.06 },
          supportsStreaming: true,
          supportsImages: true,
          supportsFunctions: true
        }
      ],
      capabilities: [
        { type: 'text', supported: true },
        { type: 'image', supported: true },
        { type: 'audio', supported: true },
        { type: 'function_calling', supported: true },
        { type: 'streaming', supported: true }
      ],
      isEnabled: true,
      priority: 999, // Low priority, fallback only
      baseUrl: 'mock://localhost'
    };
  }

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    console.log('🎭 Mock AI Provider initialized (for development)');
    console.log('🎭 Mock provider config:', {
      name: this.config.name,
      displayName: this.config.displayName,
      isEnabled: this.config.isEnabled,
      priority: this.config.priority
    });
  }

  async isHealthy(): Promise<boolean> {
    // Always healthy for development
    console.log('🎭 Mock provider health check: always healthy');
    return true;
  }

  async generateResponse(context: ConversationContext): Promise<AIResponse> {
    console.log('🎭 Mock provider generateResponse called:', {
      userId: context.userId,
      messageCount: context.messages?.length || 0,
      lastMessage: context.messages?.[context.messages.length - 1]?.content?.substring(0, 100) || 'No messages'
    });
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const lastMessage = context.messages[context.messages.length - 1];
    const mockResponse = this.generateMockResponse(lastMessage?.content || 'Hello');
    
    console.log('🎭 Mock response generated:', {
      responseLength: mockResponse.length,
      responsePreview: mockResponse.substring(0, 100)
    });

    const response = {
      content: mockResponse,
      usage: {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150
      },
      metadata: {
        model: 'mock-gpt-4',
        provider: 'mock',
        latency: 800,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('🎭 Mock provider returning response');
    return response;
  }

  async generateStreamResponse(
    context: ConversationContext,
    onChunk: (chunk: StreamResponse) => void
  ): Promise<AIResponse> {
    const lastMessage = context.messages[context.messages.length - 1];
    const fullResponse = this.generateMockResponse(lastMessage?.content || 'Hello');
    
    // Simulate streaming by sending chunks
    const words = fullResponse.split(' ');
    let accumulatedContent = '';
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      
      const word = words[i] + (i < words.length - 1 ? ' ' : '');
      accumulatedContent += word;
      
      onChunk({
        content: word,
        delta: word,
        isComplete: i === words.length - 1,
        metadata: {
          model: 'mock-gpt-4',
          provider: 'mock'
        }
      });
    }

    return {
      content: fullResponse,
      usage: {
        promptTokens: 50,
        completionTokens: words.length,
        totalTokens: 50 + words.length
      },
      metadata: {
        model: 'mock-gpt-4',
        provider: 'mock',
        latency: words.length * 75,
        timestamp: new Date().toISOString()
      }
    };
  }

  async generateJournalInsights(content: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return `Based on your journal entry, I notice themes of ${this.getRandomThemes().join(' and ')}. This suggests you're ${this.getRandomMood()}. Consider ${this.getRandomSuggestion()}.`;
  }

  async generateHealthInsights(healthData: HealthData[]): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    if (healthData.length === 0) {
      return "Start tracking your health data to get personalized insights!";
    }
    
    return `Your recent health data shows an average mood of ${Math.floor(Math.random() * 3) + 7}/10 and good sleep patterns. Keep maintaining your ${this.getRandomHealthTip()}.`;
  }

  async generateMoodInsights(moodData: MoodData[]): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 350));
    
    return `Your mood trends show ${this.getRandomMoodTrend()}. I recommend ${this.getRandomMoodSuggestion()} to maintain emotional balance.`;
  }

  async generateTaskPrioritization(tasks: TaskData[]): Promise<{ insights: string; prioritizedTasks: TaskData[] }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Shuffle tasks for mock prioritization
    const prioritized = [...tasks].sort(() => Math.random() - 0.5);
    
    return {
      insights: `I've analyzed your ${tasks.length} tasks and reorganized them based on urgency and importance. Focus on high-priority items first.`,
      prioritizedTasks: prioritized
    };
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "This is a mock transcription of your audio. The actual audio transcription would appear here.";
  }

  async generateSpeech(text: string, voice?: string): Promise<Buffer> {
    await new Promise(resolve => setTimeout(resolve, 800));
    // Return empty buffer for mock
    return Buffer.from('mock-audio-data');
  }

  async analyzeImage(imageBuffer: Buffer, prompt?: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    return `I can see an image that contains ${this.getRandomImageElements().join(', ')}. ${prompt ? `Regarding your question "${prompt}": ` : ''}This appears to be ${this.getRandomImageDescription()}.`;
  }

  async estimateCost(context: ConversationContext): Promise<number> {
    // Mock cost calculation
    const totalTokens = context.messages.reduce((acc, msg) => acc + msg.content.length / 4, 0);
    return totalTokens * 0.00003; // Mock pricing
  }

  async getUsageStats(): Promise<any> {
    return {
      totalRequests: Math.floor(Math.random() * 1000),
      totalTokens: Math.floor(Math.random() * 50000),
      totalCost: Math.random() * 50,
      averageResponseTime: 800 + Math.random() * 400
    };
  }

  // Helper methods for generating realistic mock responses
  private generateMockResponse(input: string): string {
    const responses = [
      `I understand you're asking about "${input}". This is a mock response for development purposes. In a real environment, this would be a genuine AI response.`,
      `Thank you for your message about "${input}". As a development mock, I can help you test the interface. Real AI responses would be more contextual and helpful.`,
      `Regarding "${input}" - this is a simulated response. The actual AI provider would analyze your message and provide meaningful assistance.`,
      `I see you mentioned "${input}". This mock response demonstrates how the AI interface works. With real API keys, you'd get authentic AI assistance.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getRandomThemes(): string[] {
    const themes = ['growth', 'reflection', 'challenges', 'success', 'learning', 'relationships', 'creativity'];
    return themes.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  private getRandomMood(): string {
    const moods = ['in a positive mindset', 'processing changes', 'feeling reflective', 'experiencing growth'];
    return moods[Math.floor(Math.random() * moods.length)];
  }

  private getRandomSuggestion(): string {
    const suggestions = [
      'taking time for mindfulness',
      'celebrating small wins',
      'connecting with others',
      'focusing on self-care'
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  private getRandomHealthTip(): string {
    const tips = ['exercise routine', 'sleep schedule', 'hydration habits', 'stress management'];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  private getRandomMoodTrend(): string {
    const trends = ['steady improvement', 'positive patterns', 'some fluctuation', 'good consistency'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private getRandomMoodSuggestion(): string {
    const suggestions = [
      'practicing gratitude',
      'regular exercise',
      'meditation or deep breathing',
      'maintaining social connections'
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  private getRandomImageElements(): string[] {
    const elements = ['people', 'objects', 'buildings', 'nature', 'text', 'colors', 'patterns'];
    return elements.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  private getRandomImageDescription(): string {
    const descriptions = [
      'a well-composed photograph',
      'an interesting scene',
      'a document or screenshot',
      'an artistic image'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
}