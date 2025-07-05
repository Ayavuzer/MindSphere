import Anthropic from '@anthropic-ai/sdk';
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

export class ClaudeProvider implements IAIProvider {
  public readonly name = ProviderType.CLAUDE;
  private client: Anthropic | null = null;
  public config: AIProviderConfig;

  constructor() {
    this.config = {
      name: ProviderType.CLAUDE,
      displayName: 'Claude (Anthropic)',
      models: [],
      capabilities: [],
      isEnabled: false,
      priority: 2,
      costPerToken: {
        input: 0.000015, // Claude 3.5 Sonnet pricing
        output: 0.000075
      }
    };
  }

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (!this.config.apiKey) {
      throw new AuthenticationError(this.name);
    }

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl
    });

    // Define available Claude models
    this.config.models = [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet (Latest)',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsImages: true,
        supportsAudio: false,
        contextWindow: 200000,
        costMultiplier: 1.0
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'claude-3-5-haiku-20241022',
        displayName: 'Claude 3.5 Haiku (Fast)',
        maxTokens: 8192,
        supportsStreaming: true,
        supportsImages: true,
        supportsAudio: false,
        contextWindow: 200000,
        costMultiplier: 0.1
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'claude-3-opus-20240229',
        displayName: 'Claude 3 Opus (Premium)',
        maxTokens: 4096,
        supportsStreaming: true,
        supportsImages: true,
        supportsAudio: false,
        contextWindow: 200000,
        costMultiplier: 5.0
      }
    ];

    // Define capabilities
    this.config.capabilities = [
      { type: 'text', supported: true },
      { type: 'image', supported: true },
      { type: 'audio', supported: false },
      { type: 'function_calling', supported: true },
      { type: 'code_execution', supported: false }
    ];

    console.log(`✅ Claude Provider initialized with ${this.config.models.length} models`);
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      // Simple health check with a minimal request
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      return !!response.content;
    } catch (error) {
      console.error('Claude health check failed:', error);
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
      throw new AIProviderError('Claude client not initialized', this.name);
    }

    try {
      const model = context.model || 'claude-3-5-sonnet-20241022';
      const messages = this.convertMessages(context);
      const systemPrompt = context.systemPrompt || this.getDefaultSystemPrompt(context);

      const startTime = Date.now();
      const response = await this.client.messages.create({
        model,
        max_tokens: context.maxTokens || 4096,
        temperature: context.temperature || 0.7,
        system: systemPrompt,
        messages,
        stream: false
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('');

      const usage = response.usage;

      return {
        content,
        model,
        provider: this.name,
        metadata: {
          tokens: {
            input: usage.input_tokens,
            output: usage.output_tokens,
            total: usage.input_tokens + usage.output_tokens
          },
          cost: this.calculateCost(usage.input_tokens, usage.output_tokens),
          latency: Date.now() - startTime,
          finishReason: response.stop_reason || 'unknown'
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
      throw new AIProviderError('Claude client not initialized', this.name);
    }

    try {
      const model = context.model || 'claude-3-5-sonnet-20241022';
      const messages = this.convertMessages(context);
      const systemPrompt = context.systemPrompt || this.getDefaultSystemPrompt(context);

      const startTime = Date.now();
      const stream = await this.client.messages.create({
        model,
        max_tokens: context.maxTokens || 4096,
        temperature: context.temperature || 0.7,
        system: systemPrompt,
        messages,
        stream: true
      });

      let fullContent = '';
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let stopReason: string | null = null;

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = (event as any).delta;
          if (delta.type === 'text_delta') {
            const content = delta.text;
            fullContent += content;

            onChunk({
              content: fullContent,
              isComplete: false,
              metadata: {
                model,
                tokens: totalTokens
              }
            });
          }
        } else if (event.type === 'message_delta') {
          const usage = (event as any).usage;
          if (usage) {
            outputTokens = usage.output_tokens;
            totalTokens = inputTokens + outputTokens;
          }
          stopReason = (event as any).delta.stop_reason;
        } else if (event.type === 'message_start') {
          const usage = (event as any).message.usage;
          if (usage) {
            inputTokens = usage.input_tokens;
          }
        }
      }

      // Send final chunk
      onChunk({
        content: fullContent,
        isComplete: true,
        metadata: {
          model,
          tokens: totalTokens,
          finishReason: stopReason || undefined
        }
      });

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
          latency: Date.now() - startTime,
          finishReason: stopReason || 'unknown'
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
          content: `Please analyze this journal entry and provide insightful, empathetic feedback. Focus on patterns, emotions, growth opportunities, and positive reinforcement. Keep your response to 2-3 paragraphs.

Journal entry: "${content}"`
        }
      ],
      maxTokens: 500,
      temperature: 0.7,
      systemPrompt: `You are an AI journal analyst with expertise in psychology and personal development. Your goal is to provide thoughtful, encouraging analysis that helps people understand their thoughts and emotions better.`
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
      temperature: 0.7,
      systemPrompt: `You are a health data analyst with expertise in wellness and behavioral patterns. Provide insights that are scientifically grounded yet accessible and motivating.`
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
      temperature: 0.7,
      systemPrompt: `You are a mood pattern analyst with expertise in emotional intelligence and mental wellness. Focus on identifying patterns and providing constructive guidance.`
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
      temperature: 0.7,
      systemPrompt: `You are a productivity expert specializing in task management and time optimization. Provide actionable insights and practical prioritization strategies.`
    };

    const response = await this.generateResponse(context);
    
    // Sort tasks by priority and due date
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

  async estimateCost(context: ConversationContext): Promise<number> {
    const totalChars = context.messages.reduce((acc, msg) => acc + msg.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 3.5); // Claude typically has better tokenization
    
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
    // This would typically connect to Anthropic's usage API or internal tracking
    return {
      requestsToday: 0,
      tokensUsedToday: 0,
      costToday: 0,
      rateLimitRemaining: undefined
    };
  }

  // Private helper methods
  private convertMessages(context: ConversationContext): Anthropic.Messages.MessageParam[] {
    const messages: Anthropic.Messages.MessageParam[] = [];

    for (const message of context.messages) {
      if (message.role !== 'system') { // System messages are handled separately in Claude
        messages.push({
          role: message.role as 'user' | 'assistant',
          content: message.content
        });
      }
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

You should be helpful, thoughtful, and actionable in your responses. Adapt your communication style to be warm and supportive while maintaining professionalism. Always strive to be genuinely helpful and provide value in every interaction.`;
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
        error.message || 'Unknown Claude error',
        this.name,
        error.error?.type || error.code,
        error.status >= 500 // Server errors are retryable
      );
    }
  }
}