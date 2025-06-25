import { Message, Chat } from './types';

export interface SocketMessage {
  type: 'message' | 'typing' | 'read_receipt' | 'chat_update' | 'error' | 'ping' | 'pong';
  data: SocketMessageData;
  timestamp: number;
  messageId?: string;
}

export type SocketMessageData = 
  | MessageData
  | TypingEvent
  | ReadReceipt
  | ChatUpdate
  | ErrorData
  | PingData
  | PongData;

export interface MessageData {
  chatId: string;
  content: string;
  agentId: string;
  messageId?: string;
  message?: Message;
}

export interface TypingEvent {
  chatId: string;
  userId: string;
  agentId: string;
  isTyping: boolean;
}

export interface ReadReceipt {
  chatId: string;
  messageIds: string[];
  userId: string;
}

export interface ChatUpdate {
  chatId: string;
  updates?: Partial<Chat>;
  action?: 'join' | 'leave';
}

export interface ErrorData {
  message: string;
  code?: number;
}

export interface PingData {
  timestamp: number;
}

export interface PongData {
  timestamp: number;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageQueue: SocketMessage[] = [];
  private isConnecting = false;
  private eventListeners: Map<string, Set<(data: SocketMessageData) => void>> = new Map();

  constructor() {
    this.setupPingInterval = this.setupPingInterval.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3002/ws';
      
      try {
        this.socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
        
        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setupPingInterval();
          this.flushMessageQueue();
          resolve();
        };

        this.socket.onmessage = this.handleMessage;
        this.socket.onerror = this.handleError;
        this.socket.onclose = this.handleClose;

        // Set connection timeout
        setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.eventListeners.clear();
    this.messageQueue = [];
  }

  private setupPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: SocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'pong':
          // Handle pong response
          break;
        case 'error':
          console.error('WebSocket error:', message.data);
          this.emit('error', message.data);
          break;
        default:
          this.emit(message.type, message.data);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.emit('error', { message: 'WebSocket connection error' });
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Attempt to reconnect if not a clean close
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.reconnect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }

    this.emit('disconnect', { message: `Disconnected: ${event.reason}`, code: event.code });
  }

  private async reconnect(): Promise<void> {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await this.connect(token);
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }
  }

  send(message: SocketMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      // Queue message for later if not connected
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      }
    }
  }

  // Event handling
  on(event: string, callback: (data: SocketMessageData) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: SocketMessageData) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data: SocketMessageData): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Chat-specific methods
  joinChat(chatId: string): void {
    this.send({
      type: 'chat_update',
      data: { action: 'join', chatId },
      timestamp: Date.now()
    });
  }

  leaveChat(chatId: string): void {
    this.send({
      type: 'chat_update',
      data: { action: 'leave', chatId },
      timestamp: Date.now()
    });
  }

  sendMessage(chatId: string, content: string, agentId: string): void {
    const messageId = `temp-${Date.now()}-${Math.random()}`;
    this.send({
      type: 'message',
      data: { chatId, content, agentId, messageId },
      timestamp: Date.now(),
      messageId
    });
  }

  sendTyping(chatId: string, userId: string, agentId: string, isTyping: boolean): void {
    this.send({
      type: 'typing',
      data: { chatId, userId, agentId, isTyping },
      timestamp: Date.now()
    });
  }

  sendReadReceipt(chatId: string, messageIds: string[], userId: string): void {
    this.send({
      type: 'read_receipt',
      data: { chatId, messageIds, userId },
      timestamp: Date.now()
    });
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): number {
    return this.socket?.readyState || WebSocket.CLOSED;
  }
}

// Export singleton instance
export const socketService = new WebSocketService(); 