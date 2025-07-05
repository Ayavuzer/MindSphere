import React from 'react';
import { useProvider } from '@/contexts/ProviderContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bot,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Brain,
  Globe,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ProviderStatusBarProps {
  showDetails?: boolean;
  variant?: 'compact' | 'full';
  position?: 'top' | 'bottom';
}

const providerIcons: Record<string, React.ReactNode> = {
  openai: <Zap className="h-3 w-3" />,
  claude: <Brain className="h-3 w-3" />,
  gemini: <Globe className="h-3 w-3" />,
  local_llm: <Bot className="h-3 w-3" />,
};

const providerColors: Record<string, string> = {
  openai: 'text-green-500',
  claude: 'text-orange-500',
  gemini: 'text-blue-500',
  local_llm: 'text-purple-500',
};

export function ProviderStatusBar({ 
  showDetails = false, 
  variant = 'compact',
  position = 'bottom'
}: ProviderStatusBarProps) {
  const { 
    selectedProvider, 
    availableProviders, 
    providerHealth, 
    healthLoading,
    getProviderHealth,
    getEnabledProviders 
  } = useProvider();

  const currentProvider = availableProviders.find(p => p.name === selectedProvider);
  const enabledProviders = getEnabledProviders();
  const healthyProviders = enabledProviders.filter(p => getProviderHealth(p.name));
  
  if (!currentProvider && enabledProviders.length === 0) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 px-4 py-2 ${
        position === 'top' ? 'border-b border-t-0' : ''
      }`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">No AI providers configured</span>
        </div>
      </div>
    );
  }

  const renderProviderIcon = (providerName: string) => {
    return providerIcons[providerName] || <Bot className="h-3 w-3" />;
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

  // Compact variant - minimal status
  if (variant === 'compact') {
    return (
      <div className={`bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 px-4 py-2 ${
        position === 'top' ? 'border-b border-t-0' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentProvider && (
              <>
                <div className={`flex items-center gap-1 ${providerColors[currentProvider.name] || 'text-gray-500'}`}>
                  {renderProviderIcon(currentProvider.name)}
                  {renderHealthIndicator(currentProvider.name)}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {currentProvider.displayName}
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{healthyProviders.length}/{enabledProviders.length} providers online</span>
          </div>
        </div>
      </div>
    );
  }

  // Full variant - detailed status
  return (
    <div className={`bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 px-4 py-3 ${
      position === 'top' ? 'border-b border-t-0' : ''
    }`}>
      <div className="flex items-center justify-between">
        {/* Current Provider */}
        <div className="flex items-center gap-3">
          {currentProvider ? (
            <>
              <div className={`flex items-center gap-1 ${providerColors[currentProvider.name] || 'text-gray-500'}`}>
                {renderProviderIcon(currentProvider.name)}
                {renderHealthIndicator(currentProvider.name)}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {currentProvider.displayName}
                </div>
                {showDetails && (
                  <div className="text-xs text-gray-500">
                    {currentProvider.models?.length || 0} models • Priority {currentProvider.priority}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">No provider selected</span>
            </div>
          )}
        </div>

        {/* Provider Summary */}
        <div className="flex items-center gap-4">
          {showDetails && (
            <div className="flex items-center gap-3">
              {enabledProviders.slice(0, 3).map((provider) => (
                <div 
                  key={provider.name}
                  className="flex items-center gap-1"
                  title={`${provider.displayName} - ${getProviderHealth(provider.name) ? 'Online' : 'Offline'}`}
                >
                  <div className={providerColors[provider.name] || 'text-gray-500'}>
                    {renderProviderIcon(provider.name)}
                  </div>
                  {renderHealthIndicator(provider.name)}
                </div>
              ))}
              {enabledProviders.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{enabledProviders.length - 3} more
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={healthyProviders.length > 0 ? "default" : "destructive"}
              className="text-xs"
            >
              {healthyProviders.length}/{enabledProviders.length} online
            </Badge>
            
            {currentProvider && getProviderHealth(currentProvider.name) && (
              <Badge variant="secondary" className="text-xs">
                Ready
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Warning messages */}
      {healthyProviders.length === 0 && enabledProviders.length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-orange-600 text-xs">
          <AlertTriangle className="h-3 w-3" />
          <span>All AI providers are offline. Check your API keys and network connection.</span>
        </div>
      )}
      
      {currentProvider && !getProviderHealth(currentProvider.name) && healthyProviders.length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-blue-600 text-xs">
          <Info className="h-3 w-3" />
          <span>Current provider is offline. Consider switching to an available provider.</span>
        </div>
      )}
    </div>
  );
}