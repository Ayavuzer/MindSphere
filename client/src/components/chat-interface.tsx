import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  User, 
  Mic, 
  Send, 
  Camera, 
  Calendar, 
  BarChart3,
  Paperclip,
  MoreVertical,
  Eye,
  TrendingUp,
  Heart,
  Star,
  Shield,
  Bot
} from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useVoice } from '@/hooks/useVoice';
import { useAuth } from '@/hooks/useAuth';
import { useProvider } from '@/contexts/ProviderContext';
import { ProviderSelector } from '@/components/provider-selector';
import { ProviderStatusBar } from '@/components/provider-status-bar';
import { QuickProviderSwitcher } from '@/components/quick-provider-switcher';
import { Message } from '@/types';

interface ChatInterfaceProps {
  conversationId?: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState(conversationId);
  const [isProviderSwitcherOpen, setIsProviderSwitcherOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { messages, sendMessage, isTyping, isLoading } = useChat(currentConversationId);
  const { startListening, stopListening, isListening, transcript, synthesizeSpeech } = useVoice();
  const { selectedProvider, selectedModel, setSelectedProvider, setSelectedModel } = useProvider();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (transcript) {
      setInputMessage(transcript);
    }
  }, [transcript]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+P or Cmd+P to open provider switcher
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        setIsProviderSwitcherOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const messageContent = inputMessage;
    setInputMessage('');
    
    try {
      const newConversationId = await sendMessage(
        messageContent, 
        currentConversationId, 
        selectedProvider || undefined,
        selectedModel || undefined
      );
      if (!currentConversationId) {
        setCurrentConversationId(newConversationId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Speak the latest AI message
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role === 'assistant' && latestMessage.content) {
        synthesizeSpeech(latestMessage.content);
      }
    }
  }, [messages, synthesizeSpeech]);

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
        {!isUser && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
              <Brain className="text-white" size={16} />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex-1">
          <div className={`chat-bubble ${isUser ? 'user' : 'assistant'}`}>
            {message.content}
            
            {/* Sample task prioritization display */}
            {message.role === 'assistant' && message.content.includes('prioritized tasks') && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-4 gap-4">
                  <div className="stat-card">
                    <div className="text-2xl font-bold text-indigo-400">7</div>
                    <div className="text-xs text-[var(--text-secondary)]">Tasks Today</div>
                  </div>
                  <div className="stat-card">
                    <div className="text-2xl font-bold text-green-400">3</div>
                    <div className="text-xs text-[var(--text-secondary)]">Meetings</div>
                  </div>
                  <div className="stat-card">
                    <div className="text-2xl font-bold text-yellow-400">12</div>
                    <div className="text-xs text-[var(--text-secondary)]">Unread</div>
                  </div>
                  <div className="stat-card">
                    <div className="text-2xl font-bold text-purple-400">85%</div>
                    <div className="text-xs text-[var(--text-secondary)]">Energy</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-white flex items-center">
                    <Star className="text-yellow-400 mr-2" size={16} />
                    High Priority Tasks
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                      <div className="w-3 h-3 priority-high rounded-full"></div>
                      <span className="flex-1 text-[var(--text-primary)]">Complete project proposal draft</span>
                      <span className="text-xs text-[var(--text-secondary)]">Due: 2 PM</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                      <div className="w-3 h-3 priority-medium rounded-full"></div>
                      <span className="flex-1 text-[var(--text-primary)]">Client meeting preparation</span>
                      <span className="text-xs text-[var(--text-secondary)]">Due: 10 AM</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                      <div className="w-3 h-3 priority-low rounded-full"></div>
                      <span className="flex-1 text-[var(--text-primary)]">Review quarterly reports</span>
                      <span className="text-xs text-[var(--text-secondary)]">Due: 5 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : 'Just now'}
          </p>
        </div>
        
        {isUser && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={user?.profileImageUrl || ''} alt="User" />
            <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500">
              <User className="text-white" size={16} />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-[var(--card-dark)] border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Brain className="text-white" size={20} />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold text-white">MindSphere AI</h2>
                <p className="text-sm text-green-400 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Online & Learning
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Desktop Provider Selector */}
            <div className="hidden sm:block">
              <ProviderSelector
                selectedProvider={selectedProvider || undefined}
                selectedModel={selectedModel || undefined}
                onProviderChange={setSelectedProvider}
                onModelChange={setSelectedModel}
                size="sm"
                variant="model-select"
              />
            </div>
            
            {/* Mobile Provider Switcher Button */}
            <div className="sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProviderSwitcherOpen(true)}
                className="flex items-center gap-1"
              >
                <Bot className="h-3 w-3" />
                <span className="text-xs">AI</span>
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleVoiceToggle}>
              <Mic className="mr-1" size={14} />
              {isListening ? 'Stop' : 'Voice Mode'}
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="mr-1" size={14} />
              Vision
            </Button>
            <Button variant="outline" size="sm">
              <MoreVertical size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-start space-x-4">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                <Brain className="text-white" size={16} />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="chat-bubble assistant">
                <p className="text-[var(--text-primary)] mb-3">
                  Good morning! I'm MindSphere, your AI personal assistant. I'm here to help you manage your life, work, and personal growth. I can:
                </p>
                <ul className="space-y-2 text-[var(--text-secondary)]">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Manage your schedule and tasks</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Track your health and wellness</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Analyze your communications</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Provide insights and recommendations</span>
                  </li>
                </ul>
                <p className="text-[var(--text-primary)] mt-3">
                  What would you like to focus on today?
                </p>
              </div>
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        
        {isTyping && (
          <div className="flex items-start space-x-4">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                <Brain className="text-white" size={16} />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="chat-bubble assistant max-w-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[var(--text-secondary)] text-sm">MindSphere is thinking</span>
                  <div className="flex space-x-1">
                    <div className="typing-indicator"></div>
                    <div className="typing-indicator"></div>
                    <div className="typing-indicator"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-[var(--card-dark)] border-t border-gray-800 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask MindSphere anything..."
                className="pr-12 bg-gray-800 border-gray-700 text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                disabled={isLoading}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-2"
              >
                <Paperclip size={14} />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleVoiceToggle}
              className={`${isListening ? 'voice-pulse bg-red-600' : 'bg-gray-800'}`}
            >
              <Mic size={16} />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="icon"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="text-xs">
              <Camera className="mr-1" size={12} />
              Vision
            </Button>
            <Button variant="ghost" size="sm" className="text-xs">
              <Calendar className="mr-1" size={12} />
              Schedule
            </Button>
            <Button variant="ghost" size="sm" className="text-xs">
              <BarChart3 className="mr-1" size={12} />
              Analytics
            </Button>
          </div>
          <div className="text-xs text-[var(--text-secondary)] flex items-center">
            <Shield className="text-green-400 mr-1" size={12} />
            End-to-end encrypted
          </div>
        </div>
      </div>
      
      {/* Provider Status Bar */}
      <div className="hidden sm:block">
        <ProviderStatusBar variant="compact" />
      </div>
      
      {/* Quick Provider Switcher Modal */}
      <QuickProviderSwitcher
        isOpen={isProviderSwitcherOpen}
        onClose={() => setIsProviderSwitcherOpen(false)}
      />
    </div>
  );
}
