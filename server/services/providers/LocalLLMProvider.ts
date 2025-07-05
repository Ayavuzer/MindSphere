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

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class LocalLLMProvider implements IAIProvider {
  public readonly name = ProviderType.LOCAL_LLM;
  private baseUrl: string;
  public config: AIProviderConfig;
  private availableModels: OllamaModel[] = [];

  constructor() {
    this.baseUrl = 'http://localhost:11434'; // Default Ollama URL
    this.config = {
      name: ProviderType.LOCAL_LLM,
      displayName: 'Local LLM (Ollama)',
      models: [],
      capabilities: [],
      isEnabled: false,
      priority: 4,
      costPerToken: {
        input: 0, // Local models are free!
        output: 0
      }
    };
  }

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    this.baseUrl = this.config.baseUrl || 'http://localhost:11434';

    try {
      // Check if Ollama is running and fetch available models
      await this.fetchAvailableModels();
      
      // Define capabilities
      this.config.capabilities = [
        { type: 'text', supported: true },
        { type: 'image', supported: false }, // Some models support this
        { type: 'audio', supported: false },
        { type: 'function_calling', supported: false },
        { type: 'code_execution', supported: false }
      ];

      console.log(`✅ Local LLM Provider initialized with ${this.config.models.length} models`);
    } catch (error) {
      console.warn(`⚠️  Ollama not available at ${this.baseUrl}:`, error);
      this.config.isEnabled = false;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getModels(): Promise<AIModel[]> {
    return this.config.models;
  }

  async validateApiKey(): Promise<boolean> {
    // Local LLMs don't need API keys
    return await this.isHealthy();
  }

  async generateResponse(context: ConversationContext): Promise<AIResponse> {
    try {
      const model = context.model || this.getDefaultModel();
      if (!model) {
        throw new AIProviderError('No models available', this.name);
      }

      const prompt = this.buildPrompt(context);

      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: context.temperature || 0.7,
            num_predict: context.maxTokens || 2048,
          }
        })
      });

      if (!response.ok) {
        throw new AIProviderError(`HTTP ${response.status}: ${response.statusText}`, this.name);
      }

      const data: OllamaResponse = await response.json();

      return {
        content: data.response,
        model,
        provider: this.name,
        metadata: {
          tokens: {
            input: data.prompt_eval_count || 0,
            output: data.eval_count || 0,
            total: (data.prompt_eval_count || 0) + (data.eval_count || 0)
          },
          cost: 0, // Local models are free
          latency: Date.now() - startTime,
          finishReason: data.done ? 'stop' : 'length'
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
    try {
      const model = context.model || this.getDefaultModel();
      if (!model) {
        throw new AIProviderError('No models available', this.name);
      }

      const prompt = this.buildPrompt(context);

      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          options: {
            temperature: context.temperature || 0.7,
            num_predict: context.maxTokens || 2048,
          }
        })
      });

      if (!response.ok) {
        throw new AIProviderError(`HTTP ${response.status}: ${response.statusText}`, this.name);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIProviderError('No response body', this.name);
      }

      let fullContent = '';
      let totalTokens = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let finalData: OllamaResponse | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data: OllamaResponse = JSON.parse(line);
              
              if (data.response) {
                fullContent += data.response;
              }

              if (data.prompt_eval_count) inputTokens = data.prompt_eval_count;
              if (data.eval_count) outputTokens = data.eval_count;
              totalTokens = inputTokens + outputTokens;

              onChunk({
                content: fullContent,
                isComplete: data.done,
                metadata: {
                  model,
                  tokens: totalTokens
                }
              });

              if (data.done) {
                finalData = data;
                break;
              }
            } catch (parseError) {
              // Skip malformed JSON chunks
              continue;
            }
          }

          if (finalData?.done) break;
        }
      } finally {
        reader.releaseLock();
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
          cost: 0,
          latency: Date.now() - startTime,
          finishReason: finalData?.done ? 'stop' : 'length'
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
          content: 'You are an AI journal analyst. Analyze journal entries and provide insightful, empathetic feedback focusing on patterns, emotions, and growth opportunities.'
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
          content: 'You are a health data analyst. Analyze health data and provide actionable insights about patterns and recommendations.'
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
          content: 'You are a mood pattern analyst. Analyze mood data and provide insights about emotional patterns and mental health suggestions.'
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
          content: 'You are a productivity expert. Analyze tasks and provide insights about prioritization and time management.'
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
    
    // Simple prioritization
    const prioritizedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return {
      insights: response.content,
      prioritizedTasks
    };
  }

  async estimateCost(context: ConversationContext): Promise<number> {
    // Local models are free!
    return 0;
  }

  async getUsageStats(): Promise<{
    requestsToday: number;
    tokensUsedToday: number;
    costToday: number;
    rateLimitRemaining?: number;
  }> {
    return {
      requestsToday: 0,
      tokensUsedToday: 0,
      costToday: 0,
      rateLimitRemaining: undefined // No rate limits for local models
    };
  }

  // Additional Ollama-specific methods
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new AIProviderError(`Failed to pull model ${modelName}`, this.name);
      }

      // Refresh available models
      await this.fetchAvailableModels();
      console.log(`✅ Model ${modelName} pulled successfully`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new AIProviderError(`Failed to delete model ${modelName}`, this.name);
      }

      // Refresh available models
      await this.fetchAvailableModels();
      console.log(`🗑️  Model ${modelName} deleted successfully`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new AIProviderError(`Failed to get model info for ${modelName}`, this.name);
      }

      return await response.json();
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Private helper methods
  private async fetchAvailableModels(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new AIProviderError('Failed to fetch models from Ollama', this.name);
      }

      const data = await response.json();
      this.availableModels = data.models || [];

      // Convert to our AIModel format
      this.config.models = this.availableModels.map(model => {
        const parameterSize = model.details?.parameter_size || '';
        const isLarge = parameterSize.includes('70B') || parameterSize.includes('65B');
        const isMedium = parameterSize.includes('13B') || parameterSize.includes('7B');
        
        return {
          id: model.name,
          name: model.name,
          displayName: `${model.name} (${parameterSize})`,
          maxTokens: isLarge ? 8192 : isMedium ? 4096 : 2048,
          supportsStreaming: true,
          supportsImages: model.name.includes('vision') || model.name.includes('llava'),
          supportsAudio: false,
          contextWindow: isLarge ? 32000 : isMedium ? 16000 : 8000,
          costMultiplier: 0 // Free
        };
      });

      this.config.isEnabled = this.config.models.length > 0;
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      this.config.models = [];
      this.config.isEnabled = false;
    }
  }

  private getDefaultModel(): string | null {
    if (this.config.models.length === 0) return null;
    
    // Prefer llama3 or similar popular models
    const preferredModels = ['llama3:latest', 'llama3:8b', 'llama2:latest', 'mistral:latest'];
    
    for (const preferred of preferredModels) {
      if (this.config.models.some(m => m.name === preferred)) {
        return preferred;
      }
    }
    
    // Fallback to first available model
    return this.config.models[0].name;
  }

  private buildPrompt(context: ConversationContext): string {
    let prompt = '';
    
    // Add system prompt if available
    const systemPrompt = context.systemPrompt || this.getDefaultSystemPrompt(context);
    if (systemPrompt) {
      prompt += `System: ${systemPrompt}\n\n`;
    }

    // Add conversation history
    for (const message of context.messages) {
      const role = message.role === 'assistant' ? 'Assistant' : 'Human';
      prompt += `${role}: ${message.content}\n\n`;
    }

    prompt += 'Assistant: ';
    return prompt;
  }

  private getDefaultSystemPrompt(context: ConversationContext): string {
    const userName = context.userProfile?.name || 'User';
    
    return `You are MindSphere, an AI-powered personal assistant helping ${userName} manage their life, work, and personal growth. You are knowledgeable, empathetic, and proactive. Be helpful, concise, and actionable in your responses.`;
  }

  private handleError(error: any): AIProviderError {
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return new AIProviderError('Ollama server not running', this.name, 'CONNECTION_ERROR', false);
    } else if (errorMessage.includes('model') && errorMessage.includes('not found')) {
      return new ModelNotAvailableError(this.name, error.model || 'unknown');
    } else {
      return new AIProviderError(
        errorMessage || 'Unknown Ollama error',
        this.name,
        error.code,
        false // Local errors are typically not retryable
      );
    }
  }
}