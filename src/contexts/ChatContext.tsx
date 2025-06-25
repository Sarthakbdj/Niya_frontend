'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { ChatContextType, ChatSession, Chat, Message } from '@/lib/types';
import { CHAT_CONFIG } from '@/lib/constants';
import { useAuth } from './AuthContext';
import { chatApi, ApiError } from '@/lib/api';
import { socketService, TypingEvent, ReadReceipt, MessageData, ChatUpdate, ErrorData } from '@/lib/socket';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const { user } = useAuth();
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs for managing state
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentChatIdRef = useRef<string | null>(null);

  // Initialize WebSocket connection when user changes
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('authToken');
      if (token) {
        initializeWebSocket(token);
      }
    } else {
      socketService.disconnect();
      setIsConnected(false);
      setChats([]);
      setCurrentChat(null);
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketService.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const initializeWebSocket = async (token: string) => {
    try {
      await socketService.connect(token);
      setIsConnected(true);
      setupWebSocketListeners();
      loadChats();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      console.log('Falling back to REST API only');
      setIsConnected(false);
      setError(null); // Don't show error for WebSocket failures
      // Fallback to REST API
      loadChats();
    }
  };

  const setupWebSocketListeners = () => {
    // Listen for new messages
    socketService.on('message', handleNewMessage);
    
    // Listen for typing events
    socketService.on('typing', handleTypingEvent);
    
    // Listen for read receipts
    socketService.on('read_receipt', handleReadReceipt);
    
    // Listen for chat updates
    socketService.on('chat_update', handleChatUpdate);
    
    // Listen for connection events
    socketService.on('error', handleSocketError);
    socketService.on('disconnect', handleSocketDisconnect);
  };

  const handleNewMessage = (data: MessageData) => {
    if (data.message) {
      setCurrentChat(prev => {
        if (prev && prev.chatId === data.chatId) {
          // Check if message already exists to prevent duplicates
          const existingMessage = prev.messages.find(msg => msg.id === data.message!.id);
          if (existingMessage) {
            return prev; // Don't add duplicate
          }
          
          // Replace temporary message if it exists
          const messages = prev.messages.map(msg => 
            msg.id === data.messageId ? data.message! : msg
          );
          
          // Add new message if it doesn't exist after replacement
          if (!messages.find(msg => msg.id === data.message!.id)) {
            messages.push(data.message!);
          }
          
          return {
            ...prev,
            messages,
            hasNewMessages: true
          };
        }
        return prev;
      });

      // Update chat list
      setChats(prev => prev.map(chat => 
        chat.id === data.chatId 
          ? { 
              ...chat, 
              updatedAt: new Date(),
              messageCount: chat.messageCount + 1,
              lastMessage: data.message!.content
            }
          : chat
      ));
    }
  };

  const handleTypingEvent = (data: TypingEvent) => {
    if (data.chatId === currentChatIdRef.current && data.userId === 'assistant') {
      setIsTyping(data.isTyping);
    }
  };

  const handleReadReceipt = (data: ReadReceipt) => {
    // Update message read status
    setCurrentChat(prev => {
      if (prev && prev.chatId === data.chatId) {
        const messages = prev.messages.map(msg => 
          data.messageIds.includes(msg.id) 
            ? { ...msg, metadata: { ...msg.metadata, read: true } }
            : msg
        );
        return { ...prev, messages };
      }
      return prev;
    });
  };

  const handleChatUpdate = (data: ChatUpdate) => {
    // Handle chat updates from other users or system
    if (data.updates) {
      setChats(prev => prev.map(chat => 
        chat.id === data.chatId 
          ? { ...chat, ...data.updates }
          : chat
      ));
    }
  };

  const handleSocketError = (data: ErrorData) => {
    console.error('WebSocket error:', data);
    setError('Real-time connection error. Messages may be delayed.');
  };

  const handleSocketDisconnect = (data: ErrorData) => {
    console.log('WebSocket disconnected:', data);
    setIsConnected(false);
    setError('Connection lost. Attempting to reconnect...');
  };

  const loadChats = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const fetchedChats = await chatApi.getChats();
      setChats(fetchedChats);
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? `Failed to load chats: ${err.message}` 
        : 'Failed to load chats';
      setError(errorMessage);
      console.error('Load chats error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createNewChat = useCallback(async (agentId: string): Promise<string> => {
    try {
      const newChat = await chatApi.createChat(agentId);
      
      const newChatSession: ChatSession = {
        chatId: newChat.id,
        messages: [],
        isLoading: false,
        hasNewMessages: false,
        pollCount: 0
      };

      setCurrentChat(newChatSession);
      setChats(prev => [newChat, ...prev]);
      
      // Join the chat room via WebSocket
      if (isConnected) {
        socketService.joinChat(newChat.id);
      }
      
      return newChat.id;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? `Failed to create new chat: ${err.message}` 
        : 'Failed to create new chat';
      setError(errorMessage);
      console.error('Create chat error:', err);
      throw err;
    }
  }, [isConnected]);

  const sendMessage = useCallback(async (content: string, agentId: string, chatId?: string) => {
    if (!user) {
      setError('Please log in to send messages');
      return;
    }

    try {
      setError(null);
      setIsTyping(true);
      
      const finalChatId = chatId || currentChat?.chatId || await createNewChat(agentId);
      currentChatIdRef.current = finalChatId;
      
      // Add user message immediately for optimistic UI
      const userMessage: Message = {
        id: `temp-${Date.now()}-user`,
        chatId: finalChatId,
        userId: user.id,
        agentId,
        content,
        role: 'user',
        timestamp: new Date()
      };

      setCurrentChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, userMessage]
      } : null);

      // Send via WebSocket if connected, otherwise fallback to REST API
      if (isConnected) {
        socketService.sendMessage(finalChatId, content, agentId);
        
        // Send typing indicator
        socketService.sendTyping(finalChatId, user.id, agentId, true);
        
        // Clear typing indicator after delay
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          socketService.sendTyping(finalChatId, user.id, agentId, false);
        }, 3000);
        
      } else {
        // Fallback to REST API
        const sentMessage = await chatApi.sendMessage(finalChatId, content, agentId);
        
        // Replace temporary message with real one
        setCurrentChat(prev => prev ? {
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === userMessage.id ? sentMessage : msg
          )
        } : null);

        // Update chat list with new message
        setChats(prev => prev.map(chat => 
          chat.id === finalChatId 
            ? { 
                ...chat, 
                updatedAt: new Date(),
                messageCount: chat.messageCount + 1,
                lastMessage: content
              }
            : chat
        ));
      }

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? `Failed to send message: ${err.message}` 
        : 'Failed to send message. Please try again.';
      setError(errorMessage);
      console.error('Send message error:', err);
      
      // Remove temporary message on error
      setCurrentChat(prev => prev ? {
        ...prev,
        messages: prev.messages.filter(msg => !msg.id.startsWith('temp-'))
      } : null);
    } finally {
      setIsTyping(false);
    }
  }, [user, currentChat, createNewChat, isConnected]);

  const loadChat = useCallback(async (chatId: string) => {
    try {
      setError(null);
      setIsLoading(true);
      currentChatIdRef.current = chatId;
      
      const chatSession = await chatApi.getChat(chatId);
      setCurrentChat(chatSession);

      // Join the chat room via WebSocket
      if (isConnected) {
        socketService.joinChat(chatId);
      }

      // Mark messages as read
      const unreadMessages = chatSession.messages.filter(msg => 
        msg.role === 'assistant' && !msg.metadata?.read
      );
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(m => m.id);
        if (isConnected) {
          socketService.sendReadReceipt(chatId, messageIds, user?.id || '');
        } else {
          await chatApi.markAsRead(chatId, messageIds);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? `Failed to load chat: ${err.message}` 
        : 'Failed to load chat';
      setError(errorMessage);
      console.error('Load chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      await chatApi.updateChatTitle(chatId, title);
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? { ...chat, title } : chat
      ));
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? `Failed to update chat title: ${err.message}` 
        : 'Failed to update chat title';
      setError(errorMessage);
      console.error('Update chat title error:', err);
    }
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await chatApi.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      // Leave the chat room via WebSocket
      if (isConnected) {
        socketService.leaveChat(chatId);
      }
      
      // If deleted chat is current chat, clear it
      if (currentChat?.chatId === chatId) {
        setCurrentChat(null);
        currentChatIdRef.current = null;
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? `Failed to delete chat: ${err.message}` 
        : 'Failed to delete chat';
      setError(errorMessage);
      console.error('Delete chat error:', err);
    }
  }, [currentChat, isConnected]);

  const value: ChatContextType = {
    currentChat,
    chats,
    sendMessage,
    loadChat,
    createNewChat,
    updateChatTitle,
    deleteChat,
    isTyping,
    isLoading,
    error,
    loadChats,
    isConnected
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
