export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  agentId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
  metadata?: {
    messageIndex?: number;
    totalMessages?: number;
    confidence?: number;
    read?: boolean;
  };
}

export interface Chat {
  id: string;
  userId: string;
  agentId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
}

export interface ChatSession {
  chatId: string;
  messages: Message[];
  isLoading: boolean;
  hasNewMessages: boolean;
  pollCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  messages?: Message[];
  hasMore?: boolean;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface ChatContextType {
  currentChat: ChatSession | null;
  chats: Chat[];
  sendMessage: (content: string, agentId: string, chatId?: string) => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  createNewChat: (agentId: string) => Promise<string>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  isTyping: boolean;
  isLoading: boolean;
  error: string | null;
  loadChats: () => Promise<void>;
  isConnected: boolean;
}
