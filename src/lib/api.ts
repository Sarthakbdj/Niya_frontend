import { Message, Chat, ChatSession, ApiResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken');
  console.log('Retrieved token:', token ? `${token.substring(0, 20)}...` : 'No token found');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('No auth token found in localStorage');
  }
  
  return headers;
};

export const chatApi = {
  // Get all chats for a user
  getChats: async (): Promise<Chat[]> => {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result: ApiResponse<Chat[]> = await handleResponse(response);
    return result.data || [];
  },

  // Get a specific chat with messages
  getChat: async (chatId: string): Promise<ChatSession> => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result: ApiResponse<ChatSession> = await handleResponse(response);
    if (!result.data) {
      throw new Error('Chat not found');
    }
    return result.data;
  },

  // Create a new chat
  createChat: async (agentId: string): Promise<Chat> => {
    const token = localStorage.getItem('authToken');
    
    // Demo mode for development
    if (token?.startsWith('demo-token-')) {
      console.log('Demo mode: Creating demo chat for agent:', agentId);
      const demoChat: Chat = {
        id: `demo-chat-${Date.now()}`,
        userId: 'demo-user',
        agentId,
        title: `Chat with ${agentId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
        lastMessage: ''
      };
      return demoChat;
    }

    // Real API call
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ agentId }),
    });
    const result: ApiResponse<Chat> = await handleResponse(response);
    if (!result.data) {
      throw new Error('Failed to create chat');
    }
    return result.data;
  },

  // Send a message
  sendMessage: async (chatId: string, content: string, agentId: string): Promise<Message> => {
    console.log('API sendMessage called:', { chatId, content, agentId, API_BASE_URL });
    const token = localStorage.getItem('authToken');
    
    // Demo mode for development
    if (token?.startsWith('demo-token-') || chatId?.startsWith('demo-chat-')) {
      console.log('Demo mode: Simulating message send');
      
      // Simulate user message
      const userMessage: Message = {
        id: `demo-msg-${Date.now()}`,
        chatId,
        userId: 'demo-user',
        agentId,
        content,
        role: 'user',
        timestamp: new Date()
      };
      
      // Simulate AI response after delay
      setTimeout(() => {
        const responses = [
          "That's a great question! Let me help you with that.",
          "I understand your concern. Here's what I think...",
          "Thank you for sharing that with me. I appreciate your openness.",
          "That's an interesting perspective. Let's explore this further.",
          "I hear what you're saying. Let's work through this together."
        ];
        
        const aiResponse: Message = {
          id: `demo-ai-${Date.now()}`,
          chatId,
          userId: 'ai',
          agentId,
          content: responses[Math.floor(Math.random() * responses.length)],
          role: 'assistant',
          timestamp: new Date()
        };
        
        // Dispatch a custom event to update the chat
        window.dispatchEvent(new CustomEvent('demoMessage', { detail: aiResponse }));
      }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
      
      return userMessage;
    }

    // Real API call
    const headers = getAuthHeaders();
    console.log('Request headers:', headers);
    
    const requestBody = { content, agentId };
    console.log('Request body:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new ApiError(response.status, errorText || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('API Response:', result);
    
    // Handle different response formats
    if (result.data) {
      return result.data;
    } else if (result.id || result.content) {
      // Direct message format
      return result;
    } else {
      throw new Error('Invalid response format');
    }
  },

  // Get messages for a chat (with pagination)
  getMessages: async (chatId: string, page: number = 1, limit: number = 50): Promise<{
    messages: Message[];
    hasMore: boolean;
    total: number;
  }> => {
    const response = await fetch(
      `${API_BASE_URL}/chats/${chatId}/messages?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );
    const result: ApiResponse<{
      messages: Message[];
      hasMore: boolean;
      total: number;
    }> = await handleResponse(response);
    return result.data || { messages: [], hasMore: false, total: 0 };
  },

  // Poll for new messages (for real-time updates)
  pollMessages: async (chatId: string, lastMessageId?: string): Promise<Message[]> => {
    const params = new URLSearchParams();
    if (lastMessageId) {
      params.append('lastMessageId', lastMessageId);
    }
    
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/poll?${params}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result: ApiResponse<Message[]> = await handleResponse(response);
    return result.data || [];
  },

  // Update chat title
  updateChatTitle: async (chatId: string, title: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    });
    await handleResponse(response);
  },

  // Delete a chat
  deleteChat: async (chatId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  },

  // Mark messages as read
  markAsRead: async (chatId: string, messageIds: string[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ messageIds }),
    });
    await handleResponse(response);
  },
};

export { ApiError }; 