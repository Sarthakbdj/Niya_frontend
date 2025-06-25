import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { AI_AGENTS } from '@/lib/constants';
import { Message } from '@/lib/types';
import { Send, MoreVertical, ArrowLeft, Phone, Video } from 'lucide-react';

const ChatInterface = () => {
  const { user, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log('ChatInterface rendering with user:', user);

  // Get selected expert from localStorage
  useEffect(() => {
    const savedExpert = localStorage.getItem('selectedExpert') || 'therapist';
    console.log('Setting expert to:', savedExpert);
    setSelectedExpert(savedExpert);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedExpert) return;
    
    const messageText = message.trim();
    setMessage('');
    
    try {
      console.log('Sending message:', messageText);
      
      // Add user message immediately
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        chatId: 'demo-chat',
        userId: user?.id || 'demo-user',
        agentId: selectedExpert,
        content: messageText,
        role: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      
      // Simulate AI response
      setTimeout(() => {
        const responses = [
          "That's a great question! Let me help you with that.",
          "I understand your concern. Here's what I think...",
          "Thank you for sharing that with me. I appreciate your openness.",
          "That's an interesting perspective. Let's explore this further.",
          "I hear what you're saying. Let's work through this together.",
          "You're absolutely right to think about this. Let me offer some guidance.",
          "This is a common concern, and I'm here to support you through it.",
          "I can see why you might feel that way. Here's another way to look at it."
        ];
        
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          chatId: 'demo-chat',
          userId: 'ai',
          agentId: selectedExpert,
          content: responses[Math.floor(Math.random() * responses.length)],
          role: 'assistant',
          timestamp: new Date()
        };
        
        setIsTyping(false);
        setMessages(prev => [...prev, aiMessage]);
      }, 1500 + Math.random() * 2000); // 1.5-3.5 second delay
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(messageText); // Restore message on error
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Safety checks
  if (!user) {
    console.log('No user found, showing error');
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ User not found</div>
          <Button onClick={() => window.location.reload()} className="bg-blue-500 text-white">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedExpert) {
    console.log('No expert selected, showing error');
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ No expert selected</div>
          <Button onClick={() => window.location.reload()} className="bg-blue-500 text-white">
            Go Back to Selection
          </Button>
        </div>
      </div>
    );
  }

  const currentAgent = AI_AGENTS[selectedExpert as keyof typeof AI_AGENTS];

  if (!currentAgent) {
    console.log('Invalid expert:', selectedExpert);
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ Invalid expert: {selectedExpert}</div>
          <Button 
            onClick={() => {
              localStorage.removeItem('selectedExpert');
              window.location.reload();
            }} 
            className="bg-blue-500 text-white"
          >
            Select Different Expert
          </Button>
        </div>
      </div>
    );
  }

  console.log('Rendering chat interface for:', currentAgent.name);

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* WhatsApp-style Header */}
      <div className="bg-green-600 text-white p-3 flex items-center space-x-3 shadow-md">
        <Button
          variant="ghost"
          size="sm"
          className="p-1 hover:bg-green-700 text-white"
          onClick={() => {
            localStorage.removeItem('selectedExpert');
            logout();
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
          {currentAgent.icon}
        </div>
        
        <div className="flex-1">
          <h2 className="font-semibold text-base">{currentAgent.name}</h2>
          <p className="text-xs text-green-100">
            {isTyping ? 'typing...' : 'Online'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-2 hover:bg-green-700 text-white">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2 hover:bg-green-700 text-white">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2 hover:bg-green-700 text-white">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center text-2xl">
              {currentAgent.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Chat with {currentAgent.name}
            </h3>
            <p className="text-gray-600 text-sm max-w-sm mx-auto">
              {currentAgent.longDescription}
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg: Message) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-green-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm border'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              <div
                className={`text-xs mt-1 ${
                  msg.role === 'user' ? 'text-green-100' : 'text-gray-500'
                } flex items-center justify-end space-x-1`}
              >
                <span>{formatTime(msg.timestamp)}</span>
                {msg.role === 'user' && (
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 16 15">
                    <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg rounded-bl-sm px-4 py-3 shadow-sm border max-w-[70%]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-gray-100 p-3 flex items-center space-x-3">
        <div className="flex-1 flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border-none focus:ring-0 bg-transparent p-0"
            disabled={isTyping}
          />
        </div>
        
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || isTyping}
          className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 p-0 shadow-lg"
        >
          <Send className="w-5 h-5 text-white" />
        </Button>
      </div>
    </div>
  );
};

export default ChatInterface; 