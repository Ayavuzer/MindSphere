import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export function useApiError() {
  const { toast } = useToast();

  const handleError = useCallback((error: any, context?: string) => {
    console.error('API Error:', error, context);

    let title = 'Error';
    let description = 'An unexpected error occurred';

    // Handle different error types
    if (error?.response) {
      // HTTP error response
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          title = 'Bad Request';
          description = data?.message || 'Invalid request data';
          break;
        case 401:
          title = 'Unauthorized';
          description = 'Please log in to continue';
          // Optionally redirect to login
          break;
        case 403:
          title = 'Access Denied';
          description = data?.message || 'You don\'t have permission to perform this action';
          break;
        case 404:
          title = 'Not Found';
          description = data?.message || 'The requested resource was not found';
          break;
        case 409:
          title = 'Conflict';
          description = data?.message || 'A conflict occurred with the current state';
          break;
        case 429:
          title = 'Too Many Requests';
          description = 'Please wait a moment before trying again';
          break;
        case 500:
          title = 'Server Error';
          description = 'Something went wrong on our end. Please try again later.';
          break;
        default:
          title = `Error ${status}`;
          description = data?.message || description;
      }
    } else if (error?.message) {
      // JavaScript error or custom error
      if (error.message.includes('fetch')) {
        title = 'Network Error';
        description = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        title = 'Request Timeout';
        description = 'The request took too long. Please try again.';
      } else {
        description = error.message;
      }
    } else if (typeof error === 'string') {
      description = error;
    }

    // Add context if provided
    if (context) {
      title = `${context}: ${title}`;
    }

    toast({
      title,
      description,
      variant: 'destructive',
    });
  }, [toast]);

  const handleSuccess = useCallback((message: string, title = 'Success') => {
    toast({
      title,
      description: message,
    });
  }, [toast]);

  return {
    handleError,
    handleSuccess,
  };
}

// Utility function to create error-aware fetch wrapper
export function createApiClient() {
  const baseURL = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '';

  return {
    async request<T>(
      endpoint: string, 
      options: RequestInit = {},
      errorContext?: string
    ): Promise<T> {
      const url = `${baseURL}${endpoint}`;
      
      const defaultOptions: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        ...options,
      };

      try {
        const response = await fetch(url, defaultOptions);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || `HTTP ${response.status}`);
          (error as any).response = {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
          };
          throw error;
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return response.text() as any;
        }
      } catch (error) {
        // Re-throw with context
        if (errorContext) {
          (error as any).context = errorContext;
        }
        throw error;
      }
    },

    get<T>(endpoint: string, errorContext?: string): Promise<T> {
      return this.request<T>(endpoint, { method: 'GET' }, errorContext);
    },

    post<T>(endpoint: string, data?: any, errorContext?: string): Promise<T> {
      return this.request<T>(
        endpoint, 
        { 
          method: 'POST', 
          body: data ? JSON.stringify(data) : undefined 
        }, 
        errorContext
      );
    },

    put<T>(endpoint: string, data?: any, errorContext?: string): Promise<T> {
      return this.request<T>(
        endpoint, 
        { 
          method: 'PUT', 
          body: data ? JSON.stringify(data) : undefined 
        }, 
        errorContext
      );
    },

    patch<T>(endpoint: string, data?: any, errorContext?: string): Promise<T> {
      return this.request<T>(
        endpoint, 
        { 
          method: 'PATCH', 
          body: data ? JSON.stringify(data) : undefined 
        }, 
        errorContext
      );
    },

    delete<T>(endpoint: string, errorContext?: string): Promise<T> {
      return this.request<T>(endpoint, { method: 'DELETE' }, errorContext);
    },
  };
}

// Global API client instance
export const apiClient = createApiClient();