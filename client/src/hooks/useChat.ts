import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useApiError } from '@/hooks/useApiError';
import { useTenant } from '@/contexts/TenantContext';
import { Message, Conversation } from '@/types';

export function useChat(conversationId?: string) {
  const [isTyping, setIsTyping] = useState(false);
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();
  const { currentTenant } = useTenant();

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
      console.log('Creating conversation with tenant:', currentTenant?.id);
      const response = await apiRequest('POST', '/api/conversations', { title });
      const result = await response.json();
      console.log('Conversation created:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      handleSuccess('Conversation created successfully');
    },
    onError: (error) => {
      console.error('Failed to create conversation:', error);
      handleError(error, 'Create Conversation');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      content, 
      preferredProvider,
      preferredModel
    }: { 
      conversationId: string; 
      content: string; 
      preferredProvider?: string;
      preferredModel?: string;
    }) => {
      console.log('Sending message:', { conversationId, content, preferredProvider, preferredModel, tenant: currentTenant?.id });
      setIsTyping(true);
      
      const body: any = { content };
      if (preferredProvider) {
        body.preferredProvider = preferredProvider;
      }
      if (preferredModel) {
        body.preferredModel = preferredModel;
      }
      
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, body);
      const result = await response.json();
      console.log('Message sent, response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Message send successful:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'messages'] });
      setIsTyping(false);
      handleSuccess('Message sent successfully');
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      handleError(error, 'Send Message');
    },
  });

  const sendMessage = async (
    content: string, 
    currentConversationId?: string, 
    preferredProvider?: string,
    preferredModel?: string
  ) => {
    try {
      console.log('sendMessage called:', { content, currentConversationId, preferredProvider, preferredModel });
      
      if (!currentTenant) {
        throw new Error('No tenant context available');
      }
      
      let targetConversationId = currentConversationId;
      
      // Create new conversation if none exists
      if (!targetConversationId) {
        console.log('Creating new conversation...');
        const newConversation = await createConversationMutation.mutateAsync();
        targetConversationId = newConversation.id;
        console.log('New conversation created:', targetConversationId);
      }
      
      console.log('Sending message to conversation:', targetConversationId);
      await sendMessageMutation.mutateAsync({
        conversationId: targetConversationId,
        content,
        preferredProvider,
        preferredModel,
      });
      
      return targetConversationId;
    } catch (error) {
      console.error('sendMessage error:', error);
      throw error;
    }
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
