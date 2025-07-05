import { 
  aiProviderFactory, 
  providerManager 
} from './AIProviderFactory';
import {
  ConversationContext,
  AIResponse,
  StreamResponse,
  HealthData,
  MoodData,
  TaskData,
  AIProviderConfig,
  ProviderType
} from './base/IAIProvider';

// Unified AI Service that provides backward compatibility
export class UnifiedAIService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🤖 AI Service already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Unified AI Service...');
      
      // Load provider configurations from environment and user preferences
      const providerConfigs = await this.loadProviderConfigurations();
      console.log('🔧 Loaded provider configurations:', providerConfigs.map(c => ({ name: c.name, enabled: c.isEnabled })));
      
      // Initialize all available providers
      await providerManager.initializeProviders(providerConfigs);
      
      // Check what providers are actually available after initialization
      const enabledProviders = aiProviderFactory.getEnabledProviders();
      console.log('✅ Enabled providers after initialization:', enabledProviders.map(p => p.name));
      
      this.initialized = true;
      console.log('🚀 Unified AI Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Unified AI Service:', error);
      throw error;
    }
  }

  // Main conversation method - maintains backward compatibility
  async generateResponse(context: ConversationContext, preferredProvider?: string): Promise<AIResponse> {
    console.log('🤖 UnifiedAIService.generateResponse called:', {
      userId: context.userId,
      messageCount: context.messages?.length || 0,
      preferredProvider,
      initialized: this.initialized
    });
    
    await this.ensureInitialized();
    
    console.log('🤖 AI Service initialized, delegating to factory...');
    const response = await aiProviderFactory.generateResponse(context, preferredProvider);
    
    console.log('🤖 Factory response received:', {
      hasContent: !!response?.content,
      contentLength: response?.content?.length || 0,
      provider: response?.metadata?.provider || 'unknown'
    });
    
    return response;
  }

  // Streaming response
  async generateStreamResponse(
    context: ConversationContext,
    onChunk: (chunk: StreamResponse) => void,
    preferredProvider?: string
  ): Promise<AIResponse> {
    await this.ensureInitialized();
    
    const providers = preferredProvider 
      ? [aiProviderFactory.getProvider(preferredProvider)].filter(Boolean)
      : [aiProviderFactory.getPrimaryProvider()].filter(Boolean);

    if (providers.length === 0) {
      throw new Error('No available providers for streaming');
    }

    const provider = providers[0];
    return await provider.generateStreamResponse(context, onChunk);
  }

  // Specialized AI functions with automatic provider selection
  async generateJournalInsights(content: string, preferredProvider?: string): Promise<string> {
    await this.ensureInitialized();
    
    const provider = this.getProviderForTask('journal', preferredProvider);
    return await provider.generateJournalInsights(content);
  }

  async generateHealthInsights(healthData: HealthData[], preferredProvider?: string): Promise<string> {
    await this.ensureInitialized();
    
    const provider = this.getProviderForTask('health', preferredProvider);
    return await provider.generateHealthInsights(healthData);
  }

  async generateMoodInsights(moodData: MoodData[], preferredProvider?: string): Promise<string> {
    await this.ensureInitialized();
    
    const provider = this.getProviderForTask('mood', preferredProvider);
    return await provider.generateMoodInsights(moodData);
  }

  async generateTaskPrioritization(
    tasks: TaskData[], 
    preferredProvider?: string
  ): Promise<{ insights: string; prioritizedTasks: TaskData[] }> {
    await this.ensureInitialized();
    
    const provider = this.getProviderForTask('tasks', preferredProvider);
    return await provider.generateTaskPrioritization(tasks);
  }

  // Voice functions - delegated to appropriate provider
  async transcribeAudio(audioBuffer: Buffer, preferredProvider?: string): Promise<string> {
    await this.ensureInitialized();
    
    // Prefer OpenAI for audio transcription (Whisper)
    const provider = this.getProviderForTask('audio', preferredProvider || ProviderType.OPENAI);
    
    if (!provider.transcribeAudio) {
      throw new Error(`Provider ${provider.name} does not support audio transcription`);
    }
    
    return await provider.transcribeAudio(audioBuffer);
  }

  async generateSpeech(text: string, voice?: string, preferredProvider?: string): Promise<Buffer> {
    await this.ensureInitialized();
    
    // Prefer OpenAI for TTS
    const provider = this.getProviderForTask('tts', preferredProvider || ProviderType.OPENAI);
    
    if (!provider.generateSpeech) {
      throw new Error(`Provider ${provider.name} does not support speech generation`);
    }
    
    return await provider.generateSpeech(text, voice);
  }

  // Image analysis - delegated to appropriate provider
  async analyzeImage(imageBuffer: Buffer, prompt?: string, preferredProvider?: string): Promise<string> {
    await this.ensureInitialized();
    
    // Prefer Gemini for image analysis
    const provider = this.getProviderForTask('image', preferredProvider || ProviderType.GEMINI);
    
    if (!provider.analyzeImage) {
      throw new Error(`Provider ${provider.name} does not support image analysis`);
    }
    
    return await provider.analyzeImage(imageBuffer, prompt);
  }

  // Provider management methods
  async getAvailableProviders(): Promise<any[]> {
    await this.ensureInitialized();
    
    // Return ALL providers (both enabled and disabled)
    const allProviders = aiProviderFactory.getAllProviders();
    
    return allProviders.map(provider => ({
      name: provider.name,
      displayName: provider.config.displayName,
      models: provider.config.models,
      capabilities: provider.config.capabilities,
      isEnabled: provider.config.isEnabled,
      priority: provider.config.priority
    }));
  }

  async getProviderModels(providerName: string): Promise<any[]> {
    await this.ensureInitialized();
    
    const provider = aiProviderFactory.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    // Return models with enhanced information
    return provider.config.models.map(model => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      maxTokens: model.maxTokens,
      contextWindow: model.contextWindow,
      supportsStreaming: model.supportsStreaming,
      supportsImages: model.supportsImages,
      supportsAudio: model.supportsAudio,
      costMultiplier: model.costMultiplier || 1.0,
      providerName: provider.name,
      providerDisplayName: provider.config.displayName,
      isAvailable: provider.config.isEnabled
    }));
  }

  async getProviderHealth(): Promise<Map<string, boolean>> {
    await this.ensureInitialized();
    return await aiProviderFactory.checkProvidersHealth();
  }

  async getProviderStats(): Promise<Map<string, any>> {
    await this.ensureInitialized();
    return await aiProviderFactory.getProviderStats();
  }

  async estimateCosts(context: ConversationContext): Promise<Map<string, number>> {
    await this.ensureInitialized();
    return await aiProviderFactory.estimateCosts(context);
  }

  // Configuration management
  async updateProviderConfig(providerName: string, config: Partial<AIProviderConfig>): Promise<void> {
    await this.ensureInitialized();
    
    const provider = aiProviderFactory.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    // Update configuration
    Object.assign(provider.config, config);
    
    // Reload provider if necessary
    if (config.apiKey || config.baseUrl) {
      await providerManager.reloadProvider(providerName, provider.config);
    }
  }

  async setProviderPriority(providerName: string, priority: number): Promise<void> {
    await this.ensureInitialized();
    await providerManager.updateProviderPriority(providerName, priority);
  }

  // Backward compatibility methods (match original AIService interface)
  public systemPrompt = `You are MindSphere, an AI-powered personal assistant created to help users manage their life, work, and personal growth. You are knowledgeable, empathetic, and proactive.

Your capabilities include:
- Managing schedules, tasks, and priorities
- Tracking health, mood, and wellness
- Providing insights and recommendations
- Helping with decision-making
- Offering emotional support and motivation

Always be helpful, concise, and actionable in your responses. Adapt your communication style to be warm and supportive while maintaining professionalism.`;

  // Legacy method compatibility
  async generateResponse_Legacy(context: any): Promise<string> {
    const convertedContext: ConversationContext = {
      userId: context.userId || 'unknown',
      messages: context.messages || [],
      userProfile: context.userProfile,
      systemPrompt: this.systemPrompt
    };

    const response = await this.generateResponse(convertedContext);
    return response.content;
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private getProviderForTask(taskType: string, preferredProvider?: string): any {
    // If preferred provider is specified, use it
    if (preferredProvider) {
      const provider = aiProviderFactory.getProvider(preferredProvider);
      if (provider && provider.config.isEnabled) {
        return provider;
      }
    }

    // Smart provider selection based on task type
    const enabledProviders = aiProviderFactory.getEnabledProviders();
    
    switch (taskType) {
      case 'audio':
      case 'tts':
        // Prefer OpenAI for audio tasks
        return enabledProviders.find(p => p.name === ProviderType.OPENAI) || enabledProviders[0];
        
      case 'image':
        // Prefer Gemini for image analysis
        return enabledProviders.find(p => p.name === ProviderType.GEMINI) || enabledProviders[0];
        
      case 'journal':
        // Prefer Claude for nuanced analysis
        return enabledProviders.find(p => p.name === ProviderType.CLAUDE) || enabledProviders[0];
        
      case 'health':
      case 'mood':
        // Prefer Claude or Gemini for analytical tasks
        return enabledProviders.find(p => [ProviderType.CLAUDE, ProviderType.GEMINI].includes(p.name as ProviderType)) || enabledProviders[0];
        
      case 'tasks':
        // Any provider can handle task prioritization
        return enabledProviders[0];
        
      default:
        // Default to primary provider
        return aiProviderFactory.getPrimaryProvider() || enabledProviders[0];
    }
  }

  private async loadProviderConfigurations(): Promise<AIProviderConfig[]> {
    const configs: AIProviderConfig[] = [];
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.log('🔧 Loading provider configurations, isDevelopment:', isDevelopment);
    console.log('🔧 Environment variables check:', {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      CLAUDE_API_KEY: !!process.env.CLAUDE_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      NODE_ENV: process.env.NODE_ENV
    });

    // OpenAI Configuration
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' && !process.env.OPENAI_API_KEY.startsWith('sk-ant-') && !process.env.OPENAI_API_KEY.startsWith('AIzaSy')) {
      configs.push({
        name: ProviderType.OPENAI,
        displayName: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY,
        models: [],
        capabilities: [],
        isEnabled: true,
        priority: 1
      });
    }

    // Claude Configuration
    if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_API_KEY !== 'your_claude_api_key_here' && !process.env.CLAUDE_API_KEY.startsWith('sk-ant-api03-placeholder')) {
      configs.push({
        name: ProviderType.CLAUDE,
        displayName: 'Claude (Anthropic)',
        apiKey: process.env.CLAUDE_API_KEY,
        models: [],
        capabilities: [],
        isEnabled: true,
        priority: 2
      });
    }

    // Gemini Configuration
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' && !process.env.GEMINI_API_KEY.startsWith('AIzaSyD-placeholder')) {
      configs.push({
        name: ProviderType.GEMINI,
        displayName: 'Google Gemini',
        apiKey: process.env.GEMINI_API_KEY,
        models: [],
        capabilities: [],
        isEnabled: true,
        priority: 3
      });
    }

    // Local LLM Configuration (always try to enable if Ollama is running)
    configs.push({
      name: ProviderType.LOCAL_LLM,
      displayName: 'Local LLM (Ollama)',
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      models: [],
      capabilities: [],
      isEnabled: true, // Will be disabled during initialization if not available
      priority: 4
    });

    // Add mock provider for development when no real providers are configured
    const realProvidersCount = configs.filter(c => c.name !== ProviderType.LOCAL_LLM).length;
    
    if (isDevelopment && realProvidersCount === 0) {
      configs.unshift({
        name: 'mock' as ProviderType,
        displayName: 'Mock AI (Development)',
        apiKey: 'mock-key',
        models: [],
        capabilities: [],
        isEnabled: true,
        priority: 0 // Highest priority for development
      });
      console.log('🎭 Added Mock Provider for development (no valid API keys found)');
    } else if (isDevelopment) {
      console.log('🔍 Development mode detected, but real providers configured:', realProvidersCount);
    }

    // Always add disabled providers for UI configuration
    if (!configs.some(c => c.name === ProviderType.OPENAI)) {
      configs.push({
        name: ProviderType.OPENAI,
        displayName: 'OpenAI',
        apiKey: process.env.OPENAI_API_KEY || '',
        models: [],
        capabilities: [],
        isEnabled: false,
        priority: 1
      });
    }

    if (!configs.some(c => c.name === ProviderType.CLAUDE)) {
      configs.push({
        name: ProviderType.CLAUDE,
        displayName: 'Claude (Anthropic)',
        apiKey: process.env.CLAUDE_API_KEY || '',
        models: [],
        capabilities: [],
        isEnabled: false,
        priority: 2
      });
    }

    if (!configs.some(c => c.name === ProviderType.GEMINI)) {
      configs.push({
        name: ProviderType.GEMINI,
        displayName: 'Google Gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        models: [],
        capabilities: [],
        isEnabled: false,
        priority: 3
      });
    }

    return configs;
  }
}

// Singleton instance for backward compatibility
export const unifiedAIService = new UnifiedAIService();

// Export for external use
export { unifiedAIService as aiService };