import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  Bot,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Zap,
  Brain,
  Globe,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Plus,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

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
  openai: <Zap className="h-5 w-5 text-green-500" />,
  claude: <Brain className="h-5 w-5 text-orange-500" />,
  gemini: <Globe className="h-5 w-5 text-blue-500" />,
  local_llm: <Bot className="h-5 w-5 text-purple-500" />,
  mock: <Bot className="h-5 w-5 text-purple-400" />,
};

const providerSetupInstructions: Record<string, {
  title: string;
  description: string;
  steps: string[];
  apiKeyUrl: string;
}> = {
  openai: {
    title: 'OpenAI Setup',
    description: 'Get your API key from OpenAI to use GPT models, DALL-E, and Whisper.',
    steps: [
      'Sign up or log in to OpenAI',
      'Go to API Keys section',
      'Create a new API key',
      'Copy and paste it below'
    ],
    apiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  claude: {
    title: 'Claude Setup',
    description: 'Get your API key from Anthropic to use Claude models.',
    steps: [
      'Sign up or log in to Anthropic Console',
      'Go to API Keys section',
      'Create a new API key',
      'Copy and paste it below'
    ],
    apiKeyUrl: 'https://console.anthropic.com/'
  },
  gemini: {
    title: 'Gemini Setup',
    description: 'Get your API key from Google AI Studio to use Gemini models.',
    steps: [
      'Sign up or log in to Google AI Studio',
      'Create a new API key',
      'Copy and paste it below'
    ],
    apiKeyUrl: 'https://aistudio.google.com/app/apikey'
  },
  local_llm: {
    title: 'Local LLM Setup',
    description: 'Run AI models locally using Ollama.',
    steps: [
      'Install Ollama from ollama.com',
      'Run "ollama serve" in terminal',
      'Download models with "ollama pull llama3"',
      'No API key required!'
    ],
    apiKeyUrl: 'https://ollama.com/'
  },
  mock: {
    title: 'Mock AI Provider',
    description: 'Development provider for testing without API keys.',
    steps: [
      'This is a mock provider for development',
      'No setup required - works out of the box',
      'Provides realistic responses for testing',
      'Add real API keys to use actual AI providers'
    ],
    apiKeyUrl: '#'
  }
};

export function AIProviderSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showSetupInstructions, setShowSetupInstructions] = useState<Record<string, boolean>>({});
  const [testCooldowns, setTestCooldowns] = useState<Record<string, number>>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Update cooldown timers every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTestCooldowns(prev => {
        const now = Date.now();
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.keys(updated).forEach(key => {
          if (updated[key] <= now) {
            delete updated[key];
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch AI providers
  const { data: aiProviders = [], isLoading: providersLoading } = useQuery<AIProvider[]>({
    queryKey: ['/api/ai/providers'],
  });

  // Fetch provider health
  const { data: providerHealth = [], isLoading: healthLoading } = useQuery<ProviderHealth[]>({
    queryKey: ['/api/ai/health'],
    refetchInterval: 30000,
  });

  // Update provider priority mutation
  const updateProviderPriorityMutation = useMutation({
    mutationFn: async ({ providerName, priority }: { providerName: string; priority: number }) => {
      const response = await fetch(`/api/ai/providers/${providerName}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/providers'] });
      toast({
        title: "Priority updated",
        description: "Provider priority has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update provider priority. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save API key mutation
  const saveApiKeyMutation = useMutation({
    mutationFn: async ({ providerName, apiKey }: { providerName: string; apiKey: string }) => {
      const response = await fetch(`/api/ai/providers/${providerName}/api-key`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save API key');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Clear the API key from state
      setApiKeys(prev => ({ ...prev, [variables.providerName]: '' }));
      
      // Invalidate queries to refresh provider status
      queryClient.invalidateQueries({ queryKey: ['/api/ai/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/health'] });
      
      toast({
        title: "API key saved",
        description: `${variables.providerName} API key has been configured successfully.`,
      });
    },
    onError: (error, variables) => {
      toast({
        title: "Error",
        description: `Failed to save API key for ${variables.providerName}. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // Test API key mutation
  const testApiKeyMutation = useMutation({
    mutationFn: async ({ providerName, apiKey, testType = 'connection' }: { 
      providerName: string; 
      apiKey: string; 
      testType?: string;
    }) => {
      // Client-side format validation first
      const validation = validateApiKeyFormat(providerName, apiKey);
      if (!validation.isValid) {
        throw new Error(validation.message || 'Invalid API key format');
      }

      const response = await fetch(`/api/ai/providers/${providerName}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, testType })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to test API key');
      }
      
      return result;
    },
    onSuccess: (data, variables) => {
      // Start cooldown after any test
      startTestCooldown(variables.providerName, 5);
      
      if (data.success) {
        const responseInfo = data.data?.response ? ` Sample response: "${data.data.response}"` : '';
        const retryInfo = data.retryCount > 0 ? ` (succeeded after ${data.retryCount} retries)` : '';
        
        // Cache successful result
        setTestResults(prev => ({
          ...prev,
          [variables.providerName]: { ...data, timestamp: Date.now() }
        }));
        
        toast({
          title: "Connection successful! ✅",
          description: `${variables.providerName} API key is working. Response time: ${data.responseTime}ms.${responseInfo}${retryInfo}`,
        });
      } else {
        // Enhanced error messages based on error type
        let errorDescription = data.errorMessage || 'Unknown error occurred';
        
        if (data.errorType === 'AUTHENTICATION_ERROR') {
          errorDescription = `API key is invalid. Please check your ${variables.providerName} API key and try again.`;
        } else if (data.errorType === 'RATE_LIMIT_ERROR') {
          // Longer cooldown for rate limit errors
          startTestCooldown(variables.providerName, 15);
          errorDescription = data.retryCount > 0 
            ? `Rate limit exceeded after ${data.retryCount + 1} attempts. Retries with exponential backoff failed. Please wait 15 seconds before testing again.`
            : `Rate limit exceeded. Please wait 15 seconds before testing again.`;
        } else if (data.errorType === 'NETWORK_ERROR') {
          errorDescription = `Network error. Please check your internet connection.`;
        } else if (data.errorType === 'SERVER_ERROR') {
          errorDescription = `${variables.providerName} server error. Please try again later.`;
        }

        toast({
          title: "Connection failed ❌",
          description: errorDescription,
          variant: "destructive",
        });
      }
    },
    onError: (error, variables) => {
      toast({
        title: "Test failed",
        description: `${error.message}`,
        variant: "destructive",
      });
    },
  });

  const getProviderHealth = (providerName: string): boolean => {
    const health = providerHealth.find(h => h.provider === providerName);
    return health?.healthy ?? false;
  };

  const renderHealthIndicator = (providerName: string) => {
    if (healthLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
    }
    
    const isHealthy = getProviderHealth(providerName);
    return isHealthy ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const toggleApiKeyVisibility = (providerName: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerName]: !prev[providerName]
    }));
  };

  const updateApiKey = (providerName: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [providerName]: value
    }));
  };

  // API Key format validation
  const validateApiKeyFormat = (providerName: string, apiKey: string): { isValid: boolean; message?: string } => {
    if (!apiKey) return { isValid: false, message: 'API key is required' };
    
    switch (providerName.toLowerCase()) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return { isValid: false, message: 'OpenAI API keys start with "sk-"' };
        }
        if (apiKey.length < 45) {
          return { isValid: false, message: 'OpenAI API key appears too short' };
        }
        break;
      
      case 'claude':
        if (!apiKey.startsWith('sk-ant-')) {
          return { isValid: false, message: 'Claude API keys start with "sk-ant-"' };
        }
        if (apiKey.length < 50) {
          return { isValid: false, message: 'Claude API key appears too short' };
        }
        break;
      
      case 'gemini':
        if (!apiKey.startsWith('AIzaSy')) {
          return { isValid: false, message: 'Gemini API keys start with "AIzaSy"' };
        }
        if (apiKey.length !== 39) {
          return { isValid: false, message: 'Gemini API keys should be exactly 39 characters' };
        }
        break;
    }
    
    return { isValid: true };
  };

  // Cooldown management
  const startTestCooldown = (providerName: string, seconds: number = 5) => {
    const endTime = Date.now() + (seconds * 1000);
    setTestCooldowns(prev => ({ ...prev, [providerName]: endTime }));
    
    // Clear cooldown when it expires
    setTimeout(() => {
      setTestCooldowns(prev => {
        const newCooldowns = { ...prev };
        delete newCooldowns[providerName];
        return newCooldowns;
      });
    }, seconds * 1000);
  };

  const isTestOnCooldown = (providerName: string): boolean => {
    const cooldownEnd = testCooldowns[providerName];
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  };

  const getCooldownTimeLeft = (providerName: string): number => {
    const cooldownEnd = testCooldowns[providerName];
    if (!cooldownEnd) return 0;
    return Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
  };

  const toggleSetupInstructions = (providerName: string) => {
    setShowSetupInstructions(prev => ({
      ...prev,
      [providerName]: !prev[providerName]
    }));
  };

  if (providersLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-300 rounded"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">AI Providers</h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Configure and manage your AI provider connections
          </p>
        </div>
        <Button variant="outline" size="sm" className="self-start sm:self-auto">
          <HelpCircle className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Need Help?</span>
          <span className="sm:hidden">Help</span>
        </Button>
      </div>

      {/* Provider Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {aiProviders.length}
              </div>
              <div className="text-sm text-gray-600">Total Providers</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {aiProviders.filter(p => p.isEnabled).length}
              </div>
              <div className="text-sm text-gray-600">Configured</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {providerHealth.filter(h => h.healthy).length}
              </div>
              <div className="text-sm text-gray-600">Online</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {aiProviders.reduce((sum, p) => sum + (p.models?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Models Available</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Configuration Cards */}
      <div className="space-y-4">
        {aiProviders.length === 0 ? (
          <Card>
            <CardContent className="text-center p-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No AI providers found</h3>
              <p className="text-gray-600">
                Please check your server configuration and restart the application.
              </p>
            </CardContent>
          </Card>
        ) : (
          aiProviders
            .sort((a, b) => a.priority - b.priority)
            .map((provider) => {
              const isHealthy = getProviderHealth(provider.name);
              const setupInfo = providerSetupInstructions[provider.name];
              
              return (
                <Card key={provider.name} className={`transition-all ${
                  provider.isEnabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
                }`}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {providerIcons[provider.name]}
                        <div className="flex-1">
                          <CardTitle className="text-base sm:text-lg">{provider.displayName}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {renderHealthIndicator(provider.name)}
                            <span className="text-xs sm:text-sm text-gray-600">
                              {isHealthy ? 'Online' : 'Offline'}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              Priority {provider.priority}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              {provider.models?.length || 0} models
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        <Badge variant={provider.isEnabled ? "default" : "secondary"} className="text-xs">
                          {provider.isEnabled ? "Configured" : "Not Configured"}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateProviderPriorityMutation.mutate({ 
                              providerName: provider.name, 
                              priority: Math.max(1, provider.priority - 1) 
                            })}
                            disabled={updateProviderPriorityMutation.isPending || provider.priority <= 1}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateProviderPriorityMutation.mutate({ 
                              providerName: provider.name, 
                              priority: provider.priority + 1 
                            })}
                            disabled={updateProviderPriorityMutation.isPending}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Provider Description - Collapsible */}
                    {setupInfo && (
                      <Collapsible 
                        open={showSetupInstructions[provider.name]} 
                        onOpenChange={() => toggleSetupInstructions(provider.name)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" className="w-full justify-between p-3 h-auto">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" />
                              <span className="font-medium">Setup Instructions</span>
                            </div>
                            {showSetupInstructions[provider.name] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">{setupInfo.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{setupInfo.description}</p>
                            <div className="text-sm">
                              <p className="font-medium mb-2">Setup Steps:</p>
                              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                                {setupInfo.steps.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ol>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-3"
                              onClick={() => window.open(setupInfo.apiKeyUrl, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 mr-2" />
                              Get API Key
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* API Key Configuration */}
                    {provider.name !== 'local_llm' && provider.name !== 'mock' && (
                      <div className="space-y-3">
                        <Label htmlFor={`api-key-${provider.name}`}>API Key</Label>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                id={`api-key-${provider.name}`}
                                type={showApiKeys[provider.name] ? "text" : "password"}
                                placeholder={provider.isEnabled ? "••••••••••••••••" : "Enter your API key"}
                                value={apiKeys[provider.name] || ''}
                                onChange={(e) => updateApiKey(provider.name, e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-2"
                                onClick={() => toggleApiKeyVisibility(provider.name)}
                              >
                                {showApiKeys[provider.name] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <Button 
                              variant={provider.isEnabled ? "secondary" : "default"}
                              disabled={!apiKeys[provider.name] || saveApiKeyMutation.isPending}
                              onClick={() => saveApiKeyMutation.mutate({ 
                                providerName: provider.name, 
                                apiKey: apiKeys[provider.name] 
                              })}
                            >
                              {saveApiKeyMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              {provider.isEnabled ? "Update" : "Save"}
                            </Button>
                          </div>
                          
                          {/* API Key Format Validation */}
                          {apiKeys[provider.name] && (
                            <div className="text-sm">
                              {(() => {
                                const validation = validateApiKeyFormat(provider.name, apiKeys[provider.name]);
                                if (validation.isValid) {
                                  return (
                                    <div className="flex items-center gap-2 text-green-600">
                                      <CheckCircle className="h-4 w-4" />
                                      <span>API key format looks correct</span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="flex items-center gap-2 text-amber-600">
                                      <AlertCircle className="h-4 w-4" />
                                      <span>{validation.message}</span>
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          )}
                          
                          {/* Test Connection Button */}
                          {apiKeys[provider.name] && (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline"
                                size="sm"
                                disabled={
                                  !apiKeys[provider.name] || 
                                  testApiKeyMutation.isPending || 
                                  !validateApiKeyFormat(provider.name, apiKeys[provider.name]).isValid ||
                                  isTestOnCooldown(provider.name)
                                }
                                onClick={() => testApiKeyMutation.mutate({ 
                                  providerName: provider.name, 
                                  apiKey: apiKeys[provider.name],
                                  testType: 'connection'
                                })}
                                className="flex-1"
                              >
                                {testApiKeyMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : isTestOnCooldown(provider.name) ? (
                                  <span className="text-xs">{getCooldownTimeLeft(provider.name)}s</span>
                                ) : (
                                  <Zap className="h-4 w-4 mr-2" />
                                )}
                                {isTestOnCooldown(provider.name) ? `Wait ${getCooldownTimeLeft(provider.name)}s` : 'Test Connection'}
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                disabled={
                                  !apiKeys[provider.name] || 
                                  testApiKeyMutation.isPending || 
                                  !validateApiKeyFormat(provider.name, apiKeys[provider.name]).isValid ||
                                  isTestOnCooldown(provider.name)
                                }
                                onClick={() => testApiKeyMutation.mutate({ 
                                  providerName: provider.name, 
                                  apiKey: apiKeys[provider.name],
                                  testType: 'model_list'
                                })}
                              >
                                {testApiKeyMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : isTestOnCooldown(provider.name) ? (
                                  <span className="text-xs">{getCooldownTimeLeft(provider.name)}s</span>
                                ) : (
                                  <Brain className="h-4 w-4 mr-2" />
                                )}
                                {isTestOnCooldown(provider.name) ? `Wait ${getCooldownTimeLeft(provider.name)}s` : 'Test Models'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Capabilities & Models - Compact Display */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Capabilities */}
                      {provider.capabilities && provider.capabilities.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Capabilities</Label>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {provider.capabilities
                              .filter((cap: any) => cap.supported)
                              .slice(0, 3)
                              .map((capability: any) => (
                                <Badge key={capability.type} variant="outline" className="text-xs">
                                  {capability.type}
                                </Badge>
                              ))}
                            {provider.capabilities.filter((cap: any) => cap.supported).length > 3 && (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                +{provider.capabilities.filter((cap: any) => cap.supported).length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Models */}
                      {provider.models && provider.models.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Models ({provider.models.length})</Label>
                          <div className="text-sm text-gray-600 mt-1">
                            {provider.models.slice(0, 2).map((model: any) => model.displayName || model.name).join(', ')}
                            {provider.models.length > 2 && ` +${provider.models.length - 2} more`}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
        )}
      </div>

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-800 mb-3">
                Having trouble setting up AI providers? Check out our documentation or contact support.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  View Documentation
                </Button>
                <Button variant="outline" size="sm">
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}