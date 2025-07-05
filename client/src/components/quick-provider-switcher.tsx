import React, { useState, useEffect } from 'react';
import { useProvider, useProviderSuggestion } from '@/contexts/ProviderContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Brain,
  Globe,
  Search,
  Sparkles,
  Settings,
  ArrowRight
} from 'lucide-react';

interface QuickProviderSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  taskType?: 'image' | 'audio' | 'text' | 'analysis';
}

const providerIcons: Record<string, React.ReactNode> = {
  openai: <Zap className="h-4 w-4" />,
  claude: <Brain className="h-4 w-4" />,
  gemini: <Globe className="h-4 w-4" />,
  local_llm: <Bot className="h-4 w-4" />,
};

const providerDescriptions: Record<string, string> = {
  openai: "Great for general tasks, coding, and audio processing",
  claude: "Excellent for analysis, writing, and complex reasoning",
  gemini: "Powerful for image analysis and large context tasks",
  local_llm: "Private and free, runs on your device",
};

export function QuickProviderSwitcher({ 
  isOpen, 
  onClose, 
  taskType 
}: QuickProviderSwitcherProps) {
  const [searchValue, setSearchValue] = useState('');
  const { 
    selectedProvider, 
    setSelectedProvider, 
    getEnabledProviders, 
    getProviderHealth,
    healthLoading 
  } = useProvider();
  
  const { suggestedProvider, availableForTask } = useProviderSuggestion(taskType);
  const enabledProviders = getEnabledProviders();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Handle provider selection
  const handleProviderSelect = (providerName: string) => {
    setSelectedProvider(providerName);
    onClose();
  };

  const renderProviderIcon = (providerName: string) => {
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

  const getProviderStatusBadge = (providerName: string) => {
    const isSelected = providerName === selectedProvider;
    const isHealthy = getProviderHealth(providerName);
    const isSuggested = suggestedProvider?.name === providerName;

    if (isSelected) {
      return <Badge variant="default" className="text-xs">Current</Badge>;
    }
    if (isSuggested && taskType) {
      return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Suggested</Badge>;
    }
    if (!isHealthy) {
      return <Badge variant="destructive" className="text-xs">Offline</Badge>;
    }
    return null;
  };

  // Filter providers based on search
  const filteredProviders = enabledProviders.filter(provider =>
    provider.displayName.toLowerCase().includes(searchValue.toLowerCase()) ||
    provider.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Switch AI Provider
            {taskType && (
              <Badge variant="outline" className="text-xs">
                {taskType}
              </Badge>
            )}
          </DialogTitle>
          {taskType && (
            <DialogDescription>
              Choose the best AI provider for {taskType} tasks
            </DialogDescription>
          )}
        </DialogHeader>

        <Command>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <CommandInput
                placeholder="Search providers..."
                value={searchValue}
                onValueChange={setSearchValue}
                className="pl-8"
              />
            </div>
          </div>

          <CommandList className="max-h-96">
            {/* Suggested Provider */}
            {suggestedProvider && taskType && (
              <>
                <CommandGroup heading="Recommended">
                  <CommandItem
                    key={suggestedProvider.name}
                    onSelect={() => handleProviderSelect(suggestedProvider.name)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {renderProviderIcon(suggestedProvider.name)}
                      {renderHealthIndicator(suggestedProvider.name)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{suggestedProvider.displayName}</span>
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-blue-500" />
                          {getProviderStatusBadge(suggestedProvider.name)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {providerDescriptions[suggestedProvider.name] || 'AI provider'}
                      </div>
                    </div>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* All Providers */}
            <CommandGroup heading="All Providers">
              {filteredProviders.length === 0 ? (
                <CommandEmpty>No providers found.</CommandEmpty>
              ) : (
                filteredProviders
                  .filter(provider => !suggestedProvider || provider.name !== suggestedProvider.name)
                  .map((provider) => (
                    <CommandItem
                      key={provider.name}
                      onSelect={() => handleProviderSelect(provider.name)}
                      className="flex items-center gap-3 p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {renderProviderIcon(provider.name)}
                        {renderHealthIndicator(provider.name)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{provider.displayName}</span>
                          {getProviderStatusBadge(provider.name)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {provider.models?.length || 0} models • Priority {provider.priority}
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

                      {provider.name === selectedProvider && (
                        <ArrowRight className="h-4 w-4 text-blue-500" />
                      )}
                    </CommandItem>
                  ))
              )}
            </CommandGroup>

            <CommandSeparator />
            
            {/* Settings Link */}
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  window.location.href = '/preferences';
                  onClose();
                }}
                className="flex items-center gap-3 p-3 cursor-pointer text-gray-600"
              >
                <Settings className="h-4 w-4" />
                <span>Provider Settings</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Keyboard shortcuts help */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">↑↓</span>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</span>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</span>
              <span>Close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}