import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface MultiMessageDemoProps {
  onTestMessage: (message: string) => void;
}

export const MultiMessageDemo = ({ onTestMessage }: MultiMessageDemoProps) => {
  const [selectedMessage, setSelectedMessage] = useState<string>('');

  const testMessages = [
    {
      category: "🌟 Personal Introduction",
      messages: [
        "Tell me about yourself and what you enjoy doing",
        "What are your hobbies and interests?", 
        "Describe your personality and what makes you unique",
        "What do you love most about helping people?"
      ]
    },
    {
      category: "💭 Deep Conversations", 
      messages: [
        "What's your philosophy on life and happiness?",
        "Tell me about your thoughts on friendship and relationships",
        "What advice would you give someone feeling lost?",
        "How do you stay positive during difficult times?"
      ]
    },
    {
      category: "🎉 Fun & Creative",
      messages: [
        "If you could plan the perfect day, what would it include?",
        "What are some fun activities you'd recommend?",
        "Tell me about your favorite things to talk about",
        "What would make you really excited to discuss?"
      ]
    },
    {
      category: "🤗 Emotional Support",
      messages: [
        "I'm feeling a bit overwhelmed lately, can you help?",
        "How can I build more confidence in myself?",
        "What are some ways to manage stress and anxiety?",
        "Tell me something encouraging and uplifting"
      ]
    }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎯 Multi-Message Demo
          <Badge variant="secondary">WhatsApp Style</Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Try these messages to see Priya respond with multiple messages in sequence, just like WhatsApp!
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {testMessages.map((category, categoryIndex) => (
          <div key={categoryIndex} className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700">{category.category}</h3>
            <div className="grid gap-2">
              {category.messages.map((message, messageIndex) => (
                <div key={messageIndex} className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-left justify-start h-auto py-2 px-3"
                    onClick={() => {
                      setSelectedMessage(message);
                      onTestMessage(message);
                    }}
                  >
                    <span className="text-xs text-left">{message}</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {selectedMessage && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-medium text-blue-800 mb-1">Last Sent Message:</div>
            <div className="text-sm text-blue-700">"{selectedMessage}"</div>
          </div>
        )}

        <div className="mt-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
          <div className="text-sm font-medium text-pink-800 mb-2">✨ What to Expect:</div>
          <ul className="text-xs text-pink-700 space-y-1">
            <li>• Priya will send 2-4 messages in sequence</li>
            <li>• Each message appears with typing delay</li>
            <li>• Messages are visually connected with indicators</li>
            <li>• Creates natural conversation flow like WhatsApp</li>
            <li>• Works in both demo mode and with real backend</li>
          </ul>
        </div>

        <div className="flex gap-2 justify-center pt-2">
          <Button 
            onClick={() => onTestMessage("Tell me about yourself and what you love doing")}
            className="bg-pink-500 hover:bg-pink-600 text-white"
          >
            🚀 Try Multi-Message Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 