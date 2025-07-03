import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Message, Conversation } from '@/types';

export function useChat(conversationId?: string) {
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: true,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    enabled: !!conversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (title?: string) => {
      const response = await apiRequest('POST', '/api/conversations', { title });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      setIsTyping(true);
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  const sendMessage = async (content: string, currentConversationId?: string) => {
    let targetConversationId = currentConversationId;
    
    // Create new conversation if none exists
    if (!targetConversationId) {
      const newConversation = await createConversationMutation.mutateAsync();
      targetConversationId = newConversation.id;
    }
    
    await sendMessageMutation.mutateAsync({
      conversationId: targetConversationId,
      content,
    });
    
    return targetConversationId;
  };

  return {
    conversations,
    messages,
    isTyping,
    sendMessage,
    isLoading: createConversationMutation.isPending || sendMessageMutation.isPending,
    error: createConversationMutation.error || sendMessageMutation.error,
  };
}
