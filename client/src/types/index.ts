export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  globalRole?: 'user' | 'admin' | 'superadmin';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  createdAt?: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HealthEntry {
  id: string;
  userId: string;
  date: Date;
  sleepHours?: number;
  steps?: number;
  weight?: number;
  mood?: number;
  energy?: number;
  notes?: string;
  createdAt?: Date;
}

export interface FinancialEntry {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  date: Date;
  createdAt?: Date;
}

export interface MoodEntry {
  id: string;
  userId: string;
  mood: number;
  energy?: number;
  stress?: number;
  notes?: string;
  date: Date;
  createdAt?: Date;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title?: string;
  content: string;
  mood?: number;
  aiInsights?: string;
  date: Date;
  createdAt?: Date;
}

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  avgMood: number;
  avgEnergy: number;
  totalConversations: number;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error?: string;
}
