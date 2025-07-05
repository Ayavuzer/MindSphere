import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  ChevronDown,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Zap,
  Brain,
  Globe
} from 'lucide-react';

interface ProviderSelectorProps {
  selectedProvider?: string;
  selectedModel?: string;
  onProviderChange: (provider: string) => void;
  onModelChange?: (model: string) => void;
  showSettings?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'status-only' | 'model-select';
}

interface AIModel {
  id: string;
  name: string;
  displayName: string;
  maxTokens: number;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  costMultiplier: number;
  providerName: string;
  providerDisplayName: string;
  isAvailable: boolean;
}

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

const providerIcons: Record<string, React.ReactNode> = {
  openai: <Zap className="h-4 w-4" />,
  claude: <Brain className="h-4 w-4" />,
  gemini: <Globe className="h-4 w-4" />,
  local_llm: <Bot className="h-4 w-4" />,
  mock: <Bot className="h-4 w-4 text-purple-500" />,
};

export function ProviderSelector({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  showSettings = true,
  size = 'md',
  variant = 'default'
}: ProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch AI providers
  const { 
    data: providers, 
    isLoading: providersLoading,
    error: providersError
  } = useQuery<AIProvider[]>({
    queryKey: ['/api/ai/providers'],
  });

  // Fetch provider health
  const { 
    data: providerHealth, 
    isLoading: healthLoading,
    error: healthError
  } = useQuery<ProviderHealth[]>({
    queryKey: ['/api/ai/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch models for selected provider
  const { 
    data: providerModels = [], 
    isLoading: modelsLoading,
    error: modelsError
  } = useQuery<AIModel[]>({
    queryKey: ['/api/ai/providers', selectedProvider, 'models'],
    enabled: !!selectedProvider && variant === 'model-select',
  });

  const getProviderHealth = (providerName: string): boolean => {
    const health = providerHealth?.find(h => h.provider === providerName);
    return health?.healthy ?? false;
  };

  const getProviderIcon = (providerName: string) => {
    return providerIcons[providerName] || <Bot className="h-4 w-4" />;
  };

  const renderHealthIndicator = (providerName: string) => {
    if (healthLoading) {
      return <Loader2 className="h-3 w-3 animate-spin text-gray-500" />;
    }
    
    const isHealthy = getProviderHealth(providerName);
    return isHealthy ? (
      <CheckCircle className="h-3 w-3 text-green-500" />
    ) : (
      <XCircle className="h-3 w-3 text-red-500" />
    );
  };

  const currentProvider = providers?.find(p => p.name === selectedProvider);
  const enabledProviders = providers?.filter(p => p.isEnabled) || [];

  // Size variants
  const sizeClasses = {
    sm: 'h-8 text-xs px-2',
    md: 'h-9 text-sm px-3',
    lg: 'h-10 text-base px-4'
  };

  // Compact variant - only show status
  if (variant === 'status-only') {
    return (
      <div className="flex items-center gap-2">
        {currentProvider && (
          <>
            {getProviderIcon(currentProvider.name)}
            {renderHealthIndicator(currentProvider.name)}
            <span className="text-sm font-medium">
              {currentProvider.displayName}
            </span>
          </>
        )}
      </div>
    );
  }

  // Compact variant - minimal dropdown
  if (variant === 'compact') {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {currentProvider ? getProviderIcon(currentProvider.name) : <Bot className="h-4 w-4" />}
            {renderHealthIndicator(selectedProvider || 'unknown')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {enabledProviders.map((provider) => (
            <DropdownMenuItem
              key={provider.name}
              onClick={() => onProviderChange(provider.name)}
              className="flex items-center gap-2"
            >
              {getProviderIcon(provider.name)}
              {renderHealthIndicator(provider.name)}
              <span>{provider.displayName}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Model selection variant - hierarchical provider and model selection
  if (variant === 'model-select') {
    const currentModel = providerModels.find(m => m.id === selectedModel);
    
    return (
      <div className="space-y-2">
        {/* Provider Selection */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`flex items-center gap-2 w-full ${sizeClasses[size]}`}
            >
              {currentProvider ? (
                <>
                  {getProviderIcon(currentProvider.name)}
                  {renderHealthIndicator(currentProvider.name)}
                  <span className="font-medium">{currentProvider.displayName}</span>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" />
                  <span>Select AI Provider</span>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>AI Providers</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {enabledProviders.map((provider) => (
              <DropdownMenuItem
                key={provider.name}
                onClick={() => onProviderChange(provider.name)}
                className={`flex items-center gap-3 p-3 ${
                  provider.name === selectedProvider ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {getProviderIcon(provider.name)}
                  {renderHealthIndicator(provider.name)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{provider.displayName}</div>
                  <div className="text-xs text-gray-500">
                    {provider.models?.length || 0} models
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Model Selection */}
        {selectedProvider && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`flex items-center gap-2 w-full ${sizeClasses[size]}`}
                disabled={modelsLoading || !currentProvider?.isEnabled}
              >
                {modelsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : currentModel ? (
                  <>
                    <Brain className="h-4 w-4" />
                    <span className="font-medium">{currentModel.displayName}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {currentModel.costMultiplier}x
                    </Badge>
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    <span>Select Model</span>
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-96">
              <DropdownMenuLabel>Available Models</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {modelsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : providerModels.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No models available
                </div>
              ) : (
                providerModels.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => onModelChange?.(model.id)}
                    className={`flex items-center gap-3 p-3 ${
                      model.id === selectedModel ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <Brain className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{model.displayName}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {model.costMultiplier}x
                          </Badge>
                          {model.supportsImages && (
                            <Badge variant="outline" className="text-xs">
                              Images
                            </Badge>
                          )}
                          {model.supportsStreaming && (
                            <Badge variant="outline" className="text-xs">
                              Stream
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(model.contextWindow / 1000).toFixed(0)}K context • {model.maxTokens} max tokens
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  // Default variant - full dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${sizeClasses[size]}`}
        >
          {currentProvider ? (
            <>
              {getProviderIcon(currentProvider.name)}
              {renderHealthIndicator(currentProvider.name)}
              <span className="font-medium">
                {currentProvider.displayName}
              </span>
              <ChevronDown className="h-4 w-4 ml-auto" />
            </>
          ) : (
            <>
              <Bot className="h-4 w-4" />
              <span>Select AI Provider</span>
              <ChevronDown className="h-4 w-4 ml-auto" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI Providers
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {providersLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : providersError ? (
          <div className="p-4 text-center text-red-500">
            <Bot className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm">Failed to load providers</p>
            <p className="text-xs mt-1">{providersError.message}</p>
          </div>
        ) : enabledProviders.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Bot className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium">No AI providers configured</p>
            <p className="text-xs mt-1 mb-3">Add API keys to enable providers</p>
            {showSettings && (
              <button
                onClick={() => window.location.href = '/preferences'}
                className="text-xs text-blue-500 hover:text-blue-600 underline"
              >
                Configure Providers →
              </button>
            )}
          </div>
        ) : (
          enabledProviders
            .sort((a, b) => a.priority - b.priority)
            .map((provider) => {
              const isSelected = provider.name === selectedProvider;
              const isHealthy = getProviderHealth(provider.name);
              
              return (
                <DropdownMenuItem
                  key={provider.name}
                  onClick={() => onProviderChange(provider.name)}
                  className={`flex items-center gap-3 p-3 cursor-pointer ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getProviderIcon(provider.name)}
                    {renderHealthIndicator(provider.name)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{provider.displayName}</span>
                      {isSelected && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {provider.models?.length || 0} models
                      {!isHealthy && ' • Offline'}
                    </div>
                    {provider.capabilities && (
                      <div className="flex gap-1 mt-1">
                        {provider.capabilities
                          .filter((c: any) => c.supported)
                          .slice(0, 3)
                          .map((capability: any) => (
                            <Badge key={capability.type} variant="outline" className="text-xs">
                              {capability.type}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })
        )}

        {showSettings && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.location.href = '/preferences'}
              className="flex items-center gap-2 text-gray-600"
            >
              <Settings className="h-4 w-4" />
              Provider Settings
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}