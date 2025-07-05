import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AIProvider {
  name: string;
  displayName: string;
  models: any[];
  capabilities: any[];
  isEnabled: boolean;
  priority: number;
}

interface ProviderHealth {
  provider: string;
  healthy: boolean;
}

interface ProviderContextType {
  // Current state
  selectedProvider: string | null;
  selectedModel: string | null;
  availableProviders: AIProvider[];
  providerHealth: ProviderHealth[];
  
  // Loading states
  providersLoading: boolean;
  healthLoading: boolean;
  
  // Error states
  providersError: Error | null;
  healthError: Error | null;
  hasValidProviders: boolean;
  
  // Actions
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  getProviderHealth: (provider: string) => boolean;
  getEnabledProviders: () => AIProvider[];
  getPrimaryProvider: () => AIProvider | null;
  refreshProviders: () => void;
  
  // Provider capabilities
  canHandleImages: (provider?: string) => boolean;
  canHandleAudio: (provider?: string) => boolean;
  canStream: (provider?: string) => boolean;
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

interface ProviderProviderProps {
  children: ReactNode;
  defaultProvider?: string;
}

export function ProviderProvider({ children, defaultProvider }: ProviderProviderProps) {
  const [selectedProvider, setSelectedProviderState] = useState<string | null>(null);
  const [selectedModel, setSelectedModelState] = useState<string | null>(null);

  // Fetch AI providers
  const { 
    data: availableProviders = [], 
    isLoading: providersLoading,
    error: providersError,
    refetch: refetchProviders
  } = useQuery<AIProvider[]>({
    queryKey: ['/api/ai/providers'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Fetch provider health
  const { 
    data: providerHealth = [], 
    isLoading: healthLoading,
    error: healthError 
  } = useQuery<ProviderHealth[]>({
    queryKey: ['/api/ai/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
  });

  // Debug logging
  useEffect(() => {
    console.log('ProviderContext Debug:', {
      availableProviders: availableProviders.length,
      providers: availableProviders.map(p => ({ name: p.name, enabled: p.isEnabled })),
      providersLoading,
      providersError: providersError?.message,
      selectedProvider
    });
  }, [availableProviders, providersLoading, providersError, selectedProvider]);

  // Initialize selected provider
  useEffect(() => {
    if (!selectedProvider && availableProviders.length > 0) {
      const enabledProviders = availableProviders.filter(p => p.isEnabled);
      
      if (enabledProviders.length > 0) {
        // Use default provider if specified and available
        const defaultProviderObj = enabledProviders.find(p => p.name === defaultProvider);
        if (defaultProviderObj) {
          setSelectedProviderState(defaultProvider!);
          return;
        }
        
        // Otherwise use the provider with highest priority (lowest number)
        const primaryProvider = enabledProviders.sort((a, b) => a.priority - b.priority)[0];
        setSelectedProviderState(primaryProvider.name);
      }
    }
  }, [availableProviders, defaultProvider, selectedProvider]);

  // Persist selected provider to localStorage
  useEffect(() => {
    if (selectedProvider) {
      localStorage.setItem('selectedAIProvider', selectedProvider);
    }
  }, [selectedProvider]);

  // Persist selected model to localStorage
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem('selectedAIModel', selectedModel);
    }
  }, [selectedModel]);

  // Load selected provider from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedAIProvider');
    if (saved && !selectedProvider) {
      setSelectedProviderState(saved);
    }
  }, []);

  // Load selected model from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedAIModel');
    if (saved && !selectedModel) {
      setSelectedModelState(saved);
    }
  }, []);

  const setSelectedProvider = (provider: string) => {
    const providerObj = availableProviders.find(p => p.name === provider);
    if (providerObj && providerObj.isEnabled) {
      setSelectedProviderState(provider);
      // Clear selected model when changing provider
      setSelectedModelState(null);
    }
  };

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
  };

  const getProviderHealth = (provider: string): boolean => {
    const health = providerHealth.find(h => h.provider === provider);
    return health?.healthy ?? false;
  };

  const getEnabledProviders = (): AIProvider[] => {
    return availableProviders.filter(p => p.isEnabled);
  };

  const getPrimaryProvider = (): AIProvider | null => {
    const enabled = getEnabledProviders();
    if (enabled.length === 0) return null;
    
    return enabled.sort((a, b) => a.priority - b.priority)[0];
  };

  const getProviderByName = (providerName?: string): AIProvider | null => {
    if (!providerName) {
      return availableProviders.find(p => p.name === selectedProvider) || getPrimaryProvider();
    }
    return availableProviders.find(p => p.name === providerName) || null;
  };

  const canHandleImages = (provider?: string): boolean => {
    const providerObj = getProviderByName(provider);
    if (!providerObj) return false;
    
    return providerObj.capabilities?.some(
      (cap: any) => cap.type === 'image' && cap.supported
    ) ?? false;
  };

  const canHandleAudio = (provider?: string): boolean => {
    const providerObj = getProviderByName(provider);
    if (!providerObj) return false;
    
    return providerObj.capabilities?.some(
      (cap: any) => cap.type === 'audio' && cap.supported
    ) ?? false;
  };

  const canStream = (provider?: string): boolean => {
    const providerObj = getProviderByName(provider);
    if (!providerObj) return false;
    
    // Check if any model supports streaming
    return providerObj.models?.some(
      (model: any) => model.supportsStreaming
    ) ?? false;
  };

  const hasValidProviders = availableProviders.some(p => p.isEnabled);
  
  const refreshProviders = () => {
    refetchProviders();
  };

  const contextValue: ProviderContextType = {
    // Current state
    selectedProvider,
    selectedModel,
    availableProviders,
    providerHealth,
    
    // Loading states
    providersLoading,
    healthLoading,
    
    // Error states
    providersError: providersError as Error | null,
    healthError: healthError as Error | null,
    hasValidProviders,
    
    // Actions
    setSelectedProvider,
    setSelectedModel,
    getProviderHealth,
    getEnabledProviders,
    getPrimaryProvider,
    refreshProviders,
    
    // Provider capabilities
    canHandleImages,
    canHandleAudio,
    canStream,
  };

  return (
    <ProviderContext.Provider value={contextValue}>
      {children}
    </ProviderContext.Provider>
  );
}

export function useProvider() {
  const context = useContext(ProviderContext);
  if (context === undefined) {
    throw new Error('useProvider must be used within a ProviderProvider');
  }
  return context;
}

// Hook for getting smart provider suggestions
export function useProviderSuggestion(taskType?: 'image' | 'audio' | 'text' | 'analysis') {
  const { availableProviders, getEnabledProviders, getProviderHealth } = useProvider();
  
  const getSuggestedProvider = (): AIProvider | null => {
    const enabled = getEnabledProviders().filter(p => getProviderHealth(p.name));
    
    if (enabled.length === 0) return null;
    
    switch (taskType) {
      case 'image':
        // Prefer Gemini for image analysis
        return enabled.find(p => p.name === 'gemini') || 
               enabled.find(p => p.capabilities?.some((c: any) => c.type === 'image' && c.supported)) ||
               enabled[0];
               
      case 'audio':
        // Prefer OpenAI for audio (Whisper)
        return enabled.find(p => p.name === 'openai') ||
               enabled.find(p => p.capabilities?.some((c: any) => c.type === 'audio' && c.supported)) ||
               enabled[0];
               
      case 'analysis':
        // Prefer Claude for analytical tasks
        return enabled.find(p => p.name === 'claude') ||
               enabled.find(p => p.name === 'gemini') ||
               enabled[0];
               
      default:
        // Default to priority order
        return enabled.sort((a, b) => a.priority - b.priority)[0];
    }
  };
  
  return {
    suggestedProvider: getSuggestedProvider(),
    availableForTask: getEnabledProviders().filter(p => {
      if (!taskType) return true;
      
      return p.capabilities?.some((cap: any) => 
        (taskType === 'image' && cap.type === 'image' && cap.supported) ||
        (taskType === 'audio' && cap.type === 'audio' && cap.supported) ||
        (taskType === 'text' && cap.type === 'text' && cap.supported) ||
        (taskType === 'analysis' && cap.type === 'text' && cap.supported)
      ) ?? (taskType === 'text'); // Text is default capability
    })
  };
}