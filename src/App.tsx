import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { chatApi } from '@/lib/api';
import { Message, Chat } from '@/lib/types';
import { ConnectionTest } from '@/components/ConnectionTest';
import { MultiMessageDemo } from '@/components/MultiMessageDemo';
import './App.css';

// WhatsApp-style Chat Interface with Backend Integration
const WhatsAppChat = ({ expertName, onBack }: { expertName: string; onBack: () => void }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { user, logout } = useAuth();

  // Agent ID mapping (simplified to just Priya)
  const getAgentId = (expertName: string) => {
    return 'priya'; // Always use Priya
  };

  // Initialize chat when component loads
  useEffect(() => {
    initializeChat();
  }, [expertName]);

  // Listen for demo messages
  useEffect(() => {
    const handleDemoMessage = (event: CustomEvent) => {
      const aiMessage = event.detail as Message;
      setMessages(prev => [...prev, aiMessage]);
    };

    window.addEventListener('demoMessage', handleDemoMessage as EventListener);
    return () => window.removeEventListener('demoMessage', handleDemoMessage as EventListener);
  }, []);

  const initializeChat = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const agentId = getAgentId(expertName);
      
      // Try to create a chat via backend first
      let chat: Chat;
      try {
        chat = await chatApi.createChat(agentId);
        console.log('Backend chat created:', chat);
      } catch (error) {
        console.log('Backend unavailable, using demo mode');
        setIsDemoMode(true);
        // Fallback to demo chat
        chat = {
          id: `demo-chat-${Date.now()}`,
          userId: user.id,
          agentId,
          title: `Chat with Priya`,
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0,
          lastMessage: ''
        };
      }
      
      setCurrentChat(chat);
      
      // Add welcome message
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}`,
        chatId: chat.id,
        userId: 'ai',
        agentId,
        content: `Hello! I'm Priya, your AI companion. I'm here to chat with you about anything on your mind. How are you doing today?`,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to display messages with typing effect
  const displayMessageWithTyping = async (message: Message, options: any = {}) => {
    if (options.isFirst) {
      setIsSending(true);
    }
    
    // Simulate typing delay based on message length
    const typingDelay = Math.min(message.content.length * 50, 3000); // Max 3 seconds
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    
    if (options.isFirst || !options.isAdditional) {
      setIsSending(false);
    }
    
    setMessages(prev => [...prev, message]);
  };

  // Multi-message batch API (Recommended for WhatsApp-like experience)
  const sendMessageWithMultiResponse = async (messageText: string, agentId: string) => {
    try {
      const response = await chatApi.sendMessageMulti(currentChat!.id, messageText, agentId);
      
      if (response.success && response.data.isMultiMessage) {
        console.log(`🎉 Received ${response.data.totalMessages} messages from Priya!`);
        
        // Display messages one by one with realistic delays
        for (let i = 0; i < response.data.messages.length; i++) {
          await displayMessageWithTyping(response.data.messages[i], {
            isFirst: i === 0,
            isAdditional: i > 0,
            messageIndex: i + 1,
            totalMessages: response.data.totalMessages
          });
          
          // Add delay between messages (except for the last one)
          if (i < response.data.messages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
          }
        }
      } else {
        // Single message response
        if (response.data.messages.length > 0) {
          await displayMessageWithTyping(response.data.messages[0]);
        }
      }
    } catch (error) {
      console.error('❌ Error sending multi-message:', error);
      // Fallback to regular message
      await sendMessageFallback(messageText, agentId);
    }
  };

  // Fallback message sending (original logic)
  const sendMessageFallback = async (messageText: string, agentId: string) => {
    // Try backend first, then fallback to demo
    if (!isDemoMode) {
      try {
        console.log('Sending message to backend:', { chatId: currentChat!.id, message: messageText, agentId });
        const response = await chatApi.sendMessage(currentChat!.id, messageText, agentId);
        console.log('Backend response:', response);
        
        // If backend responds with a message, add it
        if (response && response.content) {
          const aiMessage: Message = {
            id: response.id || `ai-${Date.now()}`,
            chatId: currentChat!.id,
            userId: 'ai',
            agentId,
            content: response.content,
            role: 'assistant',
            timestamp: new Date(response.timestamp || Date.now())
          };
          setMessages(prev => [...prev, aiMessage]);
          return; // Success, don't use fallback
        }
      } catch (apiError) {
        console.error('Backend API failed, switching to demo mode:', apiError);
        setIsDemoMode(true);
      }
    }
    
    // Fallback to simulated AI response (always works)
    setTimeout(() => {
      const aiResponse = getPriyaResponse(messageText);
      const aiMessage: Message = {
        id: `ai-demo-${Date.now()}`,
        chatId: currentChat!.id,
        userId: 'ai',
        agentId,
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1500 + Math.random() * 1500); // Random delay 1-3 seconds
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentChat || isSending) return;

    const messageText = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      // Add user message immediately
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        chatId: currentChat.id,
        userId: user?.id || 'demo-user',
        agentId: getAgentId(expertName),
        content: messageText,
        role: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Use multi-message API for WhatsApp-like experience
      await sendMessageWithMultiResponse(messageText, getAgentId(expertName));
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getPriyaResponse = (userMsg: string) => {
    const priyaResponses = [
      "I'm here for you! Tell me more about what's on your mind. I love having these conversations with you.",
      "That sounds really interesting! I'd love to hear more about that. You always have such thoughtful perspectives.",
      "You're so thoughtful! I appreciate you sharing that with me. It means a lot that you trust me with your thoughts.",
      "I'm always here to listen and chat about whatever is important to you. What's been making you happy lately?",
      "Thank you for opening up to me. I enjoy our conversations so much. How are you feeling about everything?",
      "That's such an interesting way to look at it! I really appreciate how you think about things.",
      "I can tell this is important to you. I'm here to listen and support you through whatever you're going through.",
      "You have such a unique perspective on things. I always learn something new when we talk.",
      "I'm so glad you feel comfortable sharing with me. Your thoughts and feelings matter so much.",
      "That resonates with me deeply. How long have you been thinking about this?",
      "I can hear the emotion in your words. It's beautiful how deeply you feel about things.",
      "You're such a caring person. The world needs more people like you who think about these things.",
      "I love how open and honest you are with me. It makes our conversations so meaningful.",
      "That's a really important question. I think about things like that too sometimes.",
      "You always know how to make me think! I really value our conversations and your insights."
    ];
    
    return priyaResponses[Math.floor(Math.random() * priyaResponses.length)];
  };

  const handleLogout = async () => {
    try {
      await logout();
      onBack();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to Priya...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* WhatsApp Header */}
      <div className="bg-green-500 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="text-white hover:bg-green-600 p-2 rounded-full transition-colors"
          >
            ←
          </button>
          <div className="w-10 h-10 bg-pink-400 rounded-full flex items-center justify-center text-lg">
            💕
          </div>
          <div>
            <h1 className="font-semibold">Priya</h1>
            <p className="text-xs text-green-100">
              {isSending ? 'Typing...' : isDemoMode ? 'Demo Mode' : 'Online'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="text-white hover:bg-green-600 p-2 rounded-full transition-colors text-sm"
          title="Logout"
        >
          🚪
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${
              msg.isMultiMessage && msg.isAdditional ? 'mt-1' : 'mt-3'
            }`}
          >
            <div
              className={`max-w-sm lg:max-w-lg px-4 py-3 rounded-2xl relative ${
                msg.role === 'user'
                  ? 'bg-green-500 text-white rounded-br-md shadow-md'
                  : msg.isMultiMessage && msg.isAdditional
                  ? 'bg-gray-50 text-gray-800 rounded-bl-md shadow-sm border border-gray-200'
                  : 'bg-white text-gray-800 rounded-bl-md shadow-md border border-gray-100'
              }`}
            >
              {/* Multi-message indicator */}
              {msg.isMultiMessage && (
                <div className={`text-xs mb-2 flex items-center ${
                  msg.role === 'user' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {msg.isFirst && (
                    <>
                      <span className="inline-block w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
                      <span>Message {msg.messageIndex}/{msg.totalMessages}</span>
                    </>
                  )}
                  {msg.isAdditional && (
                    <>
                      <span className="inline-block w-1.5 h-1.5 bg-pink-300 rounded-full mr-2"></span>
                      <span>{msg.messageIndex}/{msg.totalMessages}</span>
                    </>
                  )}
                </div>
              )}
              
              <p className="text-sm leading-relaxed">{msg.content}</p>
              
              <div className="flex items-center justify-between mt-2">
                <p className={`text-xs ${
                  msg.role === 'user' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {formatTime(msg.timestamp)}
                </p>
                
                {/* Multi-message chain indicator */}
                {msg.isMultiMessage && msg.totalMessages && msg.totalMessages > 1 && (
                  <div className="flex space-x-1">
                    {Array.from({ length: msg.totalMessages }, (_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < (msg.messageIndex || 1)
                            ? msg.role === 'user' ? 'bg-green-200' : 'bg-pink-400'
                            : msg.role === 'user' ? 'bg-green-300' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-md px-4 py-3 border border-gray-100">
              <div className="flex space-x-1 items-center">
                <span className="text-xs text-gray-500 mr-2">Priya is typing</span>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 flex items-center space-x-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isSending && sendMessage()}
          placeholder="Type a message..."
          disabled={isSending}
          className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={!message.trim() || isSending}
          className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Login Screen with Google Auth
const LoginScreen = ({ onExpertSelect }: { onExpertSelect: (expert: string) => void }) => {
  const { login, isLoading, error } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await login();
      // Automatically select Priya after login
      onExpertSelect('💕 Priya');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💕</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Meet Priya</h1>
          <p className="text-gray-600">Your AI companion for meaningful conversations</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <div className="mb-6 p-6 bg-pink-50 rounded-xl border border-pink-200">
          <div className="text-center">
            <h3 className="font-semibold text-gray-800 mb-2">💕 Priya</h3>
            <p className="text-sm text-gray-600 mb-4">
              I'm here to listen, chat, and be your supportive AI companion. 
              Whether you want to share your thoughts, discuss your day, or just have a friendly conversation, 
              I'm always here for you.
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <span>✨ Empathetic</span>
              <span>💭 Thoughtful</span>
              <span>🤗 Supportive</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{isLoading ? 'Signing in...' : 'Start chatting with Priya'}</span>
          </button>
          
          <div className="text-center text-sm text-gray-500">
            🔒 Secure Google authentication required
          </div>
        </div>
      </div>
    </div>
  );
};

// App Content with Auth Check
const AppContent = () => {
  const { user, isLoading } = useAuth();
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  
  // Debug mode check
  const isDebugMode = new URLSearchParams(window.location.search).get('debug') === 'true';
  
  // Auto-select Priya when user logs in
  useEffect(() => {
    if (user && !selectedExpert) {
      setSelectedExpert('💕 Priya');
    }
  }, [user, selectedExpert]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onExpertSelect={setSelectedExpert} />;
  }

  // Debug mode shows connection test
  if (isDebugMode) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold mb-2">🔧 Debug Mode</h1>
          <p className="text-gray-600 mb-4">Testing frontend-to-backend connectivity</p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => window.location.search = ''}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Exit Debug Mode
            </button>
            <button 
              onClick={() => setSelectedExpert('💕 Priya')}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Go to Chat
            </button>
          </div>
        </div>
        <div className="grid gap-6">
          <ConnectionTest />
          <MultiMessageDemo 
            onTestMessage={(message) => {
              // Create a temporary chat session for testing
              console.log('🎯 Testing multi-message with:', message);
              // You can implement a quick test here if needed
            }}
          />
        </div>
      </div>
    );
  }

  if (selectedExpert) {
    return (
      <WhatsAppChat 
        expertName={selectedExpert} 
        onBack={() => setSelectedExpert('')}
      />
    );
  }

  // This should rarely be reached since we auto-select Priya
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💕</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome, {user.name}!</h1>
          <button 
            onClick={() => setSelectedExpert('💕 Priya')}
            className="bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-pink-600 transition-colors"
          >
            Start chatting with Priya
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App with Auth Provider
const App = () => {
  console.log('🚀 WhatsApp-style App with Backend Integration');
  
  return (
        <AuthProvider>
      <div className="min-h-screen bg-gray-50">
            <AppContent />
      </div>
        </AuthProvider>
);
};

export default App;
