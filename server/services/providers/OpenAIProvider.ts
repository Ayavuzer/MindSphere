import OpenAI from 'openai';
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
  ProviderType,
  ModelCategory
} from '../base/IAIProvider';

export class OpenAIProvider implements IAIProvider {
  public readonly name = ProviderType.OPENAI;
  private client: OpenAI | null = null;
  public config: AIProviderConfig;

  constructor() {
    this.config = {
      name: ProviderType.OPENAI,
      displayName: 'OpenAI',
      models: [],
      capabilities: [],
      isEnabled: false,
      priority: 1,
      costPerToken: {
        input: 0.00001, // GPT-4o pricing
        output: 0.00003
      }
    };
  }

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (!this.config.apiKey) {
      throw new AuthenticationError(this.name);
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl
    });

    // Define available models
    this.config.models = [
      {
        id: 'gpt-4o',
        name: 'gpt-4o',
        displayName: 'GPT-4o (Latest)',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: true,
        supportsAudio: false,
        contextWindow: 128000,
        costMultiplier: 1.0
      },
      {
        id: 'gpt-4o-mini',
        name: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini (Fast)',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: true,
        supportsAudio: false,
        contextWindow: 128000,
        costMultiplier: 0.1
      },
      {
        id: 'gpt-4-turbo',
        name: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: true,
        supportsAudio: false,
        contextWindow: 128000,
        costMultiplier: 0.5
      }
    ];

    // Define capabilities
    this.config.capabilities = [
      { type: 'text', supported: true },
      { type: 'image', supported: true },
      { type: 'audio', supported: true },
      { type: 'function_calling', supported: true },
      { type: 'code_execution', supported: false }
    ];

    console.log(`✅ OpenAI Provider initialized with ${this.config.models.length} models`);
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      // Simple health check with a minimal request
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
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
      throw new AIProviderError('OpenAI client not initialized', this.name);
    }

    try {
      const model = context.model || 'gpt-4o';
      const messages = this.convertMessages(context);

      const startTime = Date.now();
      const completion = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: context.maxTokens || 4096,
        temperature: context.temperature || 0.7,
        stream: false
      });

      const response = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      return {
        content: response,
        model,
        provider: this.name,
        metadata: {
          tokens: {
            input: usage?.prompt_tokens || 0,
            output: usage?.completion_tokens || 0,
            total: usage?.total_tokens || 0
          },
          cost: this.calculateCost(usage?.prompt_tokens || 0, usage?.completion_tokens || 0),
          latency: Date.now() - startTime,
          finishReason: completion.choices[0]?.finish_reason || 'unknown'
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
      throw new AIProviderError('OpenAI client not initialized', this.name);
    }

    try {
      const model = context.model || 'gpt-4o';
      const messages = this.convertMessages(context);

      const startTime = Date.now();
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: context.maxTokens || 4096,
        temperature: context.temperature || 0.7,
        stream: true,
        stream_options: { include_usage: true }
      });

      let fullContent = '';
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        const isComplete = chunk.choices[0]?.finish_reason !== null;
        
        if (content) {
          fullContent += content;
        }

        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }

        onChunk({
          content: fullContent,
          isComplete,
          metadata: {
            model,
            tokens: totalTokens,
            finishReason: chunk.choices[0]?.finish_reason || undefined
          }
        });

        if (isComplete) break;
      }

      return {
        content: fullContent,
        model,
        provider: this.name,
        metadata: {
          tokens: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens
          },
          cost: this.calculateCost(inputTokens, outputTokens),
          latency: Date.now() - startTime
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
          role: 'system',
          content: `You are an AI journal analyst. Analyze the following journal entry and provide insightful, empathetic feedback. Focus on patterns, emotions, growth opportunities, and positive reinforcement. Keep your response to 2-3 paragraphs.`
        },
        {
          role: 'user',
          content: `Please analyze this journal entry: "${content}"`
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
          role: 'system',
          content: `You are a health data analyst. Analyze the health data and provide actionable insights about patterns, trends, and recommendations for improvement. Be encouraging and specific.`
        },
        {
          role: 'user',
          content: `Analyze this health data:\n${dataText}`
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
          role: 'system',
          content: `You are a mood pattern analyst. Analyze the mood data and provide insights about emotional patterns, triggers, and suggestions for maintaining good mental health.`
        },
        {
          role: 'user',
          content: `Analyze this mood data:\n${dataText}`
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
          role: 'system',
          content: `You are a productivity expert. Analyze the tasks and provide insights about prioritization, time management, and productivity optimization. Suggest a better priority order if needed.`
        },
        {
          role: 'user',
          content: `Analyze and prioritize these tasks:\n${tasksText}`
        }
      ],
      maxTokens: 800,
      temperature: 0.7
    };

    const response = await this.generateResponse(context);
    
    // For now, return tasks in current order (can be enhanced with AI-based reordering)
    return {
      insights: response.content,
      prioritizedTasks: [...tasks].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
    };
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    if (!this.client) {
      throw new AIProviderError('OpenAI client not initialized', this.name);
    }

    try {
      const response = await this.client.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
        model: 'whisper-1'
      });

      return response.text;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async generateSpeech(text: string, voice: string = 'alloy'): Promise<Buffer> {
    if (!this.client) {
      throw new AIProviderError('OpenAI client not initialized', this.name);
    }

    try {
      const response = await this.client.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: text
      });

      return Buffer.from(await response.arrayBuffer());
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async estimateCost(context: ConversationContext): Promise<number> {
    const totalChars = context.messages.reduce((acc, msg) => acc + msg.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4); // Rough estimation: 4 chars = 1 token
    
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
    // This would typically connect to OpenAI's usage API or internal tracking
    return {
      requestsToday: 0,
      tokensUsedToday: 0,
      costToday: 0,
      rateLimitRemaining: undefined
    };
  }

  // Private helper methods
  private convertMessages(context: ConversationContext): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const systemPrompt = context.systemPrompt || this.getDefaultSystemPrompt(context);
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    for (const message of context.messages) {
      messages.push({
        role: message.role as 'user' | 'assistant',
        content: message.content
      });
    }

    return messages;
  }

  private getDefaultSystemPrompt(context: ConversationContext): string {
    const userName = context.userProfile?.name || 'User';
    
    return `You are MindSphere, an AI-powered personal assistant created to help ${userName} manage their life, work, and personal growth. You are knowledgeable, empathetic, and proactive.

Your capabilities include:
- Managing schedules, tasks, and priorities
- Tracking health, mood, and wellness
- Providing insights and recommendations
- Helping with decision-making
- Offering emotional support and motivation

Always be helpful, concise, and actionable in your responses. Adapt your communication style to be warm and supportive while maintaining professionalism.`;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = inputTokens * (this.config.costPerToken?.input || 0);
    const outputCost = outputTokens * (this.config.costPerToken?.output || 0);
    return inputCost + outputCost;
  }

  private handleError(error: any): AIProviderError {
    if (error.status === 401) {
      return new AuthenticationError(this.name);
    } else if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) : undefined;
      return new RateLimitError(this.name, retryAfter);
    } else if (error.status === 404 && error.message?.includes('model')) {
      return new ModelNotAvailableError(this.name, error.model || 'unknown');
    } else {
      return new AIProviderError(
        error.message || 'Unknown OpenAI error',
        this.name,
        error.code,
        error.status >= 500 // Server errors are retryable
      );
    }
  }
}