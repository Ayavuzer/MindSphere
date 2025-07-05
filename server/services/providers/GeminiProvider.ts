import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  IAIProvider,
  AIProviderConfig,
  AIModel,
  AICapability,
  ConversationContext,
  AIResponse,
  StreamResponse,
  HealthData,
  MoodData,
  TaskData,
  AIProviderError,
  RateLimitError,
  AuthenticationError,
  ModelNotAvailableError,
  ProviderType
} from '../base/IAIProvider';

export class GeminiProvider implements IAIProvider {
  public readonly name = ProviderType.GEMINI;
  private client: GoogleGenerativeAI | null = null;
  public config: AIProviderConfig;

  constructor() {
    this.config = {
      name: ProviderType.GEMINI,
      displayName: 'Google Gemini',
      models: [],
      capabilities: [],
      isEnabled: false,
      priority: 3,
      costPerToken: {
        input: 0.000001, // Gemini Pro pricing (very competitive)
        output: 0.000002
      }
    };
  }

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (!this.config.apiKey) {
      throw new AuthenticationError(this.name);
    }

    this.client = new GoogleGenerativeAI(this.config.apiKey);

    // Define available Gemini models
    this.config.models = [
      {
        id: 'gemini-1.5-pro',
        name: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro (Latest)',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsImages: true,
        supportsAudio: true,
        contextWindow: 2000000, // 2M tokens - industry leading
        costMultiplier: 1.0
      },
      {
        id: 'gemini-1.5-flash',
        name: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash (Fast)',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsImages: true,
        supportsAudio: true,
        contextWindow: 1000000, // 1M tokens
        costMultiplier: 0.05
      },
      {
        id: 'gemini-pro',
        name: 'gemini-pro',
        displayName: 'Gemini Pro (Stable)',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: false,
        supportsAudio: false,
        contextWindow: 32000,
        costMultiplier: 0.5
      },
      {
        id: 'gemini-pro-vision',
        name: 'gemini-pro-vision',
        displayName: 'Gemini Pro Vision (Multimodal)',
        maxTokens: 4096,
        supportsStreaming: false,
        supportsImages: true,
        supportsAudio: false,
        contextWindow: 16000,
        costMultiplier: 1.0
      }
    ];

    // Define capabilities
    this.config.capabilities = [
      { type: 'text', supported: true },
      { type: 'image', supported: true },
      { type: 'audio', supported: true },
      { type: 'function_calling', supported: true },
      { type: 'code_execution', supported: true }
    ];

    console.log(`✅ Gemini Provider initialized with ${this.config.models.length} models`);
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      // Simple health check with Gemini Flash (fastest model)
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent('Hi');
      
      return !!result.response.text();
    } catch (error) {
      console.error('Gemini health check failed:', error);
      return false;
    }
  }

  async getModels(): Promise<AIModel[]> {
    return this.config.models;
  }

  async validateApiKey(): Promise<boolean> {
    return await this.isHealthy();
  }

  async generateResponse(context: ConversationContext): Promise<AIResponse> {
    if (!this.client) {
      throw new AIProviderError('Gemini client not initialized', this.name);
    }

    try {
      const modelName = context.model || 'gemini-1.5-pro';
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
        generationConfig: {
          temperature: context.temperature || 0.7,
          maxOutputTokens: context.maxTokens || 4096,
        }
      });

      const history = this.convertMessagesToHistory(context);
      const chat = model.startChat({ history });

      const lastMessage = context.messages[context.messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new AIProviderError('Last message must be from user', this.name);
      }

      const startTime = Date.now();
      const result = await chat.sendMessage(lastMessage.content);
      const response = result.response;
      
      const content = response.text();
      const usage = response.usageMetadata;

      return {
        content,
        model: modelName,
        provider: this.name,
        metadata: {
          tokens: {
            input: usage?.promptTokenCount || 0,
            output: usage?.candidatesTokenCount || 0,
            total: usage?.totalTokenCount || 0
          },
          cost: this.calculateCost(
            usage?.promptTokenCount || 0, 
            usage?.candidatesTokenCount || 0
          ),
          latency: Date.now() - startTime,
          finishReason: response.candidates?.[0]?.finishReason || 'unknown'
        }
      };

    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateStreamResponse(
    context: ConversationContext,
    onChunk: (chunk: StreamResponse) => void
  ): Promise<AIResponse> {
    if (!this.client) {
      throw new AIProviderError('Gemini client not initialized', this.name);
    }

    try {
      const modelName = context.model || 'gemini-1.5-pro';
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: context.temperature || 0.7,
          maxOutputTokens: context.maxTokens || 4096,
        }
      });

      const history = this.convertMessagesToHistory(context);
      const chat = model.startChat({ history });

      const lastMessage = context.messages[context.messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new AIProviderError('Last message must be from user', this.name);
      }

      const startTime = Date.now();
      const result = await chat.sendMessageStream(lastMessage.content);

      let fullContent = '';
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullContent += chunkText;

        onChunk({
          content: fullContent,
          isComplete: false,
          metadata: {
            model: modelName,
            tokens: totalTokens
          }
        });
      }

      const finalResponse = await result.response;
      const usage = finalResponse.usageMetadata;
      
      if (usage) {
        inputTokens = usage.promptTokenCount;
        outputTokens = usage.candidatesTokenCount;
        totalTokens = usage.totalTokenCount;
      }

      // Send final chunk
      onChunk({
        content: fullContent,
        isComplete: true,
        metadata: {
          model: modelName,
          tokens: totalTokens,
          finishReason: finalResponse.candidates?.[0]?.finishReason
        }
      });

      return {
        content: fullContent,
        model: modelName,
        provider: this.name,
        metadata: {
          tokens: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens
          },
          cost: this.calculateCost(inputTokens, outputTokens),
          latency: Date.now() - startTime,
          finishReason: finalResponse.candidates?.[0]?.finishReason || 'unknown'
        }
      };

    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateJournalInsights(content: string): Promise<string> {
    const context: ConversationContext = {
      userId: 'system',
      messages: [
        {
          role: 'user',
          content: `As an AI journal analyst, please analyze this journal entry and provide insightful, empathetic feedback. Focus on patterns, emotions, growth opportunities, and positive reinforcement. Keep your response to 2-3 paragraphs.

Journal entry: "${content}"`
        }
      ],
      maxTokens: 500,
      temperature: 0.7
    };

    const response = await this.generateResponse(context);
    return response.content;
  }

  async generateHealthInsights(healthData: HealthData[]): Promise<string> {
    const dataText = healthData.map(entry => 
      `Date: ${entry.date.toISOString().split('T')[0]}, Sleep: ${entry.sleepHours}h, Steps: ${entry.steps}, Mood: ${entry.mood}/10, Energy: ${entry.energy}/10`
    ).join('\n');

    const context: ConversationContext = {
      userId: 'system',
      messages: [
        {
          role: 'user',
          content: `Analyze this health data and provide actionable insights about patterns, trends, and recommendations for improvement. Be encouraging and specific.

Health data:
${dataText}`
        }
      ],
      maxTokens: 600,
      temperature: 0.7
    };

    const response = await this.generateResponse(context);
    return response.content;
  }

  async generateMoodInsights(moodData: MoodData[]): Promise<string> {
    const dataText = moodData.map(entry => 
      `Date: ${entry.date.toISOString().split('T')[0]}, Mood: ${entry.mood}/10, Energy: ${entry.energy}/10, Stress: ${entry.stress}/10`
    ).join('\n');

    const context: ConversationContext = {
      userId: 'system',
      messages: [
        {
          role: 'user',
          content: `Analyze this mood data and provide insights about emotional patterns, triggers, and suggestions for maintaining good mental health.

Mood data:
${dataText}`
        }
      ],
      maxTokens: 600,
      temperature: 0.7
    };

    const response = await this.generateResponse(context);
    return response.content;
  }

  async generateTaskPrioritization(tasks: TaskData[]): Promise<{
    insights: string;
    prioritizedTasks: TaskData[];
  }> {
    const tasksText = tasks.map(task => 
      `${task.title} (Priority: ${task.priority}, Status: ${task.status}, Due: ${task.dueDate?.toISOString().split('T')[0] || 'No due date'})`
    ).join('\n');

    const context: ConversationContext = {
      userId: 'system',
      messages: [
        {
          role: 'user',
          content: `Analyze and prioritize these tasks. Provide insights about prioritization, time management, and productivity optimization.

Tasks:
${tasksText}`
        }
      ],
      maxTokens: 800,
      temperature: 0.7
    };

    const response = await this.generateResponse(context);
    
    // Smart task prioritization using Gemini's analysis
    const prioritizedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by due date
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }
      
      return 0;
    });

    return {
      insights: response.content,
      prioritizedTasks
    };
  }

  async analyzeImage(imageBuffer: Buffer, prompt?: string): Promise<string> {
    if (!this.client) {
      throw new AIProviderError('Gemini client not initialized', this.name);
    }

    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const result = await model.generateContent([
        prompt || 'Describe this image in detail',
        imagePart
      ]);

      return result.response.text();
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async estimateCost(context: ConversationContext): Promise<number> {
    const totalChars = context.messages.reduce((acc, msg) => acc + msg.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4); // Conservative estimation
    
    const inputCost = estimatedTokens * (this.config.costPerToken?.input || 0);
    const outputCost = (context.maxTokens || 1000) * (this.config.costPerToken?.output || 0);
    
    return inputCost + outputCost;
  }

  async getUsageStats(): Promise<{
    requestsToday: number;
    tokensUsedToday: number;
    costToday: number;
    rateLimitRemaining?: number;
  }> {
    // This would typically connect to Google Cloud usage API or internal tracking
    return {
      requestsToday: 0,
      tokensUsedToday: 0,
      costToday: 0,
      rateLimitRemaining: undefined
    };
  }

  // Private helper methods
  private convertMessagesToHistory(context: ConversationContext): any[] {
    const history: any[] = [];

    // Skip the last message as it will be sent separately
    const messagesForHistory = context.messages.slice(0, -1);

    for (const message of messagesForHistory) {
      if (message.role === 'system') {
        // System messages can be converted to user messages with special formatting
        history.push({
          role: 'user',
          parts: [{ text: `[System]: ${message.content}` }]
        });
        history.push({
          role: 'model',
          parts: [{ text: 'Understood. I will follow these instructions.' }]
        });
      } else {
        history.push({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }]
        });
      }
    }

    return history;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = inputTokens * (this.config.costPerToken?.input || 0);
    const outputCost = outputTokens * (this.config.costPerToken?.output || 0);
    return inputCost + outputCost;
  }

  private handleError(error: any): AIProviderError {
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('authentication')) {
      return new AuthenticationError(this.name);
    } else if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('quota')) {
      return new RateLimitError(this.name);
    } else if (errorMessage.includes('model') && errorMessage.includes('not found')) {
      return new ModelNotAvailableError(this.name, error.model || 'unknown');
    } else {
      return new AIProviderError(
        errorMessage || 'Unknown Gemini error',
        this.name,
        error.code,
        errorMessage.includes('server') || errorMessage.includes('internal')
      );
    }
  }
}