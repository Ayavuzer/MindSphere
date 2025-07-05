// Base AI Provider Interface for MindSphere
// Supports OpenAI, Claude, Gemini, and Local LLMs

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  metadata?: {
    model?: string;
    provider?: string;
    tokens?: number;
    cost?: number;
  };
}

export interface ConversationContext {
  userId: string;
  messages: AIMessage[];
  userProfile?: {
    name?: string;
    preferences?: any;
    recentActivities?: any;
  };
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIProviderConfig {
  name: string;
  displayName: string;
  apiKey?: string;
  baseUrl?: string;
  models: AIModel[];
  capabilities: AICapability[];
  isEnabled: boolean;
  priority: number; // For fallback ordering
  costPerToken?: {
    input: number;
    output: number;
  };
}

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  contextWindow: number;
  costMultiplier?: number;
}

export interface AICapability {
  type: 'text' | 'image' | 'audio' | 'function_calling' | 'code_execution';
  supported: boolean;
  limitations?: string[];
}

export interface StreamResponse {
  content: string;
  isComplete: boolean;
  metadata?: {
    model?: string;
    tokens?: number;
    finishReason?: string;
  };
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  metadata: {
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    cost?: number;
    latency: number;
    finishReason?: string;
  };
}

export interface HealthData {
  date: Date;
  sleepHours?: number;
  steps?: number;
  weight?: number;
  mood: number;
  energy: number;
  notes?: string;
}

export interface MoodData {
  date: Date;
  mood: number;
  energy: number;
  stress: number;
  notes?: string;
}

export interface TaskData {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  tags?: string[];
}

// Main AI Provider Interface
export interface IAIProvider {
  // Provider Information
  readonly name: string;
  readonly config: AIProviderConfig;
  
  // Initialization
  initialize(config: AIProviderConfig): Promise<void>;
  isHealthy(): Promise<boolean>;
  getModels(): Promise<AIModel[]>;
  
  // Core Chat Functionality
  generateResponse(context: ConversationContext): Promise<AIResponse>;
  generateStreamResponse(
    context: ConversationContext,
    onChunk: (chunk: StreamResponse) => void
  ): Promise<AIResponse>;
  
  // Specialized AI Functions
  generateJournalInsights(content: string): Promise<string>;
  generateHealthInsights(healthData: HealthData[]): Promise<string>;
  generateMoodInsights(moodData: MoodData[]): Promise<string>;
  generateTaskPrioritization(tasks: TaskData[]): Promise<{
    insights: string;
    prioritizedTasks: TaskData[];
  }>;
  
  // Voice/Audio Functions (optional)
  transcribeAudio?(audioBuffer: Buffer): Promise<string>;
  generateSpeech?(text: string, voice?: string): Promise<Buffer>;
  
  // Image Functions (optional)
  analyzeImage?(imageBuffer: Buffer, prompt?: string): Promise<string>;
  generateImage?(prompt: string, options?: any): Promise<Buffer>;
  
  // Utility Functions
  estimateCost(context: ConversationContext): Promise<number>;
  validateApiKey(): Promise<boolean>;
  
  // Provider-specific functions (optional)
  getUsageStats?(): Promise<{
    requestsToday: number;
    tokensUsedToday: number;
    costToday: number;
    rateLimitRemaining?: number;
  }>;
}

// Provider Registration Interface
export interface ProviderRegistry {
  register(provider: IAIProvider): void;
  unregister(providerName: string): void;
  getProvider(providerName: string): IAIProvider | undefined;
  getAllProviders(): IAIProvider[];
  getEnabledProviders(): IAIProvider[];
  getPrimaryProvider(): IAIProvider | undefined;
  getFallbackProviders(): IAIProvider[];
}

// Error Types
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class RateLimitError extends AIProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT', true);
    this.retryAfter = retryAfter;
  }
  
  public retryAfter?: number;
}

export class AuthenticationError extends AIProviderError {
  constructor(provider: string) {
    super(`Authentication failed for ${provider}`, provider, 'AUTH_ERROR', false);
  }
}

export class ModelNotAvailableError extends AIProviderError {
  constructor(provider: string, model: string) {
    super(`Model ${model} not available for ${provider}`, provider, 'MODEL_UNAVAILABLE', false);
  }
}

// Provider Types Enum
export enum ProviderType {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini',
  LOCAL_LLM = 'local_llm',
  CUSTOM = 'custom'
}

// Model Categories
export enum ModelCategory {
  FAST = 'fast',         // Quick responses, lower cost
  BALANCED = 'balanced', // Good balance of speed/quality
  PREMIUM = 'premium',   // Highest quality, higher cost
  SPECIALIZED = 'specialized' // Task-specific models
}