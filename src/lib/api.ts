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

  // Send a message (Enhanced with multi-message detection)
  sendMessage: async (chatId: string, content: string, agentId: string): Promise<Message | {
    isMultiMessage: boolean;
    messages: string[];
    totalMessages: number;
    primaryMessage: Message;
  }> => {
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
    console.log('🔍 FRONTEND RECEIVED FROM BACKEND:', result);
    
    // 🔍 Enhanced multi-message detection for backend responses
    let isMultiMessage = false;
    let messages: string[] = [];
    let totalMessages = 1;
    
    // Check for different multi-message formats from backend
    if (result.isMultiMessage || result.is_multi_message) {
      isMultiMessage = true;
      console.log('✅ Multi-message detected via isMultiMessage flag');
    }
    
    // Check for messages array (from Python bridge)
    if (result.messages && Array.isArray(result.messages) && result.messages.length > 1) {
      isMultiMessage = true;
      messages = result.messages;
      totalMessages = result.messages.length;
      console.log(`✅ Multi-message detected: ${totalMessages} messages in array`);
    }
    
    // Check nested data structure
    if (result.data && result.data.messages && Array.isArray(result.data.messages) && result.data.messages.length > 1) {
      isMultiMessage = true;
      messages = result.data.messages.map((msg: any) => typeof msg === 'string' ? msg : msg.content);
      totalMessages = result.data.messages.length;
      console.log(`✅ Multi-message detected in data.messages: ${totalMessages} messages`);
    }
    
    // Create primary message object
    let primaryMessage: Message;
    const primaryContent = result.data?.content || result.content || (messages.length > 0 ? messages[0] : 'No content');
    
    primaryMessage = {
      id: result.data?.id || result.id || `msg-${Date.now()}`,
      chatId,
      userId: 'ai',
      agentId,
      content: primaryContent,
      role: 'assistant',
      timestamp: new Date(result.data?.timestamp || result.timestamp || Date.now())
    };
    
    // If multi-message detected, return special format
    if (isMultiMessage && messages.length > 1) {
      console.log(`🎉 RETURNING MULTI-MESSAGE FORMAT: ${totalMessages} messages`);
      console.log('📝 Messages:', messages);
      
      return {
        isMultiMessage: true,
        messages,
        totalMessages,
        primaryMessage
      };
    }
    
    // Single message format
    console.log('📄 Returning single message format');
    return primaryMessage;
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

  // Multi-message batch API (WhatsApp-style)
  sendMessageMulti: async (chatId: string, content: string, agentId: string): Promise<{
    success: boolean;
    data: {
      isMultiMessage: boolean;
      totalMessages: number;
      messages: Message[];
    };
  }> => {
    const token = localStorage.getItem('authToken');
    
    // Demo mode for development
    if (token?.startsWith('demo-token-') || chatId?.startsWith('demo-chat-')) {
      console.log('Demo mode: Simulating multi-message send');
      
      // Simulate multiple AI responses
      const demoResponses = [
        "That's such an interesting question! I'm really glad you asked me that.",
        "You know, I've been thinking about this topic a lot lately, and I have quite a few thoughts to share.",
        "First, let me tell you what I find most fascinating about this...",
        "And another thing that really excites me is how we can explore this together!",
        "I hope this gives you some good insights to think about! 😊"
      ];
      
      // Randomly choose 2-4 messages for demo
      const numMessages = Math.floor(Math.random() * 3) + 2; // 2-4 messages
      const selectedResponses = demoResponses.slice(0, numMessages);
      
      const messages: Message[] = selectedResponses.map((response, index) => ({
        id: `demo-multi-${Date.now()}-${index}`,
        chatId,
        userId: 'ai',
        agentId,
        content: response,
        role: 'assistant',
        timestamp: new Date(Date.now() + index * 100), // Slight time offset
        isMultiMessage: true,
        isFirst: index === 0,
        isAdditional: index > 0,
        messageIndex: index + 1,
        totalMessages: numMessages
      } as Message));
      
      return {
        success: true,
        data: {
          isMultiMessage: true,
          totalMessages: numMessages,
          messages
        }
      };
    }

    // Real API call
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/multi`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content, agentId }),
    });
    
    const result: {
      success: boolean;
      data: {
        isMultiMessage: boolean;
        totalMessages: number;
        messages: Message[];
      };
    } = await handleResponse(response);
    return result;
  },

  // Real-time streaming API
  sendMessageStream: async (
    chatId: string, 
    content: string, 
    agentId: string,
    onMessage: (data: any) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> => {
    const token = localStorage.getItem('authToken');
    
    // Demo mode for development
    if (token?.startsWith('demo-token-') || chatId?.startsWith('demo-chat-')) {
      console.log('Demo mode: Simulating streaming');
      
      const demoMessages = [
        "That's such a thoughtful question!",
        "Let me share some ideas with you...",
        "I think you'll find this perspective interesting.",
        "Thanks for giving me the chance to explore this with you! 😊"
      ];
      
      const numMessages = Math.floor(Math.random() * 3) + 2;
      const messages = demoMessages.slice(0, numMessages);
      
      onMessage({ type: 'connected' });
      
      for (let i = 0; i < messages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        
        onMessage({
          type: 'message',
          data: {
            content: messages[i],
            messageIndex: i + 1,
            totalMessages: messages.length,
            isFirst: i === 0,
            isAdditional: i > 0
          }
        });
      }
      
      onComplete();
      return;
    }

    // Real streaming API call
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages/stream`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content, agentId }),
      });

      if (!response.body) {
        throw new Error('Streaming not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'connected') {
                onMessage({ type: 'connected' });
              } else if (data.type === 'message') {
                onMessage({
                  type: 'message',
                  data: data.data
                });
              } else if (data.type === 'complete') {
                onComplete();
              } else if (data.type === 'error') {
                onError(data.error);
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse stream data:', line);
            }
          }
        }
      }
    } catch (error: any) {
      onError(error.message);
    }
  },
};

export { ApiError }; 