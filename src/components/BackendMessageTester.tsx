import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { chatApi } from '@/lib/api';

export const BackendMessageTester = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('Tell me about yourself and what you enjoy doing');

  const testBackendMessage = async () => {
    setIsLoading(true);
    console.log('🧪 Starting backend message test...');
    
    try {
      // Ensure we have a demo token
      const demoToken = `demo-token-${Date.now()}`;
      localStorage.setItem('authToken', demoToken);
      
      const testChatId = 'test-chat-multi-message';
      
      console.log('📤 Sending to backend:', {
        chatId: testChatId,
        message: testMessage,
        agentId: 'priya'
      });
      
      // Call the enhanced sendMessage API
      const response = await chatApi.sendMessage(testChatId, testMessage, 'priya');
      
      console.log('📥 Received from backend:', response);
      
      setTestResult({
        success: true,
        response,
        timestamp: new Date().toISOString(),
        responseType: typeof response,
        hasMultiMessage: response && typeof response === 'object' && 'isMultiMessage' in response,
        messageCount: response && typeof response === 'object' && 'messages' in response 
          ? (response as any).messages.length 
          : 1
      });
      
    } catch (error: any) {
      console.error('❌ Backend test failed:', error);
      setTestResult({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    setIsLoading(false);
  };

  const testMessages = [
    'Tell me about yourself and what you enjoy doing',
    'What are your hobbies and interests?',
    'How are you feeling today?',
    'What makes you happy?',
    'Tell me about your day'
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Backend Multi-Message Tester</CardTitle>
        <p className="text-sm text-gray-600">
          Test what the backend actually sends when you request a message
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Test Message Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Message:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1 px-3 py-2 border rounded text-sm"
              placeholder="Enter message to test..."
            />
            <Button onClick={testBackendMessage} disabled={isLoading}>
              {isLoading ? '🧪 Testing...' : '🚀 Test Backend'}
            </Button>
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Quick Test Messages:</div>
          <div className="flex gap-2 flex-wrap">
            {testMessages.map((msg, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  setTestMessage(msg);
                  setTimeout(() => testBackendMessage(), 100);
                }}
                disabled={isLoading}
              >
                Test {index + 1}
              </Button>
            ))}
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">📊 Test Results</h3>
              <span className={`px-3 py-1 rounded text-sm ${
                testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {testResult.success ? '✅ Success' : '❌ Failed'}
              </span>
            </div>

            {testResult.success && (
              <div className="grid gap-4">
                {/* Summary */}
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">📋 Summary:</div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• Response Type: <code>{testResult.responseType}</code></div>
                    <div>• Has Multi-Message: <code>{testResult.hasMultiMessage ? 'YES' : 'NO'}</code></div>
                    <div>• Message Count: <code>{testResult.messageCount}</code></div>
                    <div>• Timestamp: <code>{testResult.timestamp}</code></div>
                  </div>
                </div>

                {/* Raw Response */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">🔍 Raw Backend Response:</div>
                  <pre className="bg-gray-50 p-3 rounded border text-xs overflow-x-auto max-h-96 overflow-y-auto">
                    {JSON.stringify(testResult.response, null, 2)}
                  </pre>
                </div>

                {/* Multi-Message Detection */}
                {testResult.hasMultiMessage && testResult.response.messages && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">🎉 Multi-Message Detected!</div>
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <div className="text-sm text-green-800 space-y-2">
                        <div>Total Messages: <strong>{testResult.response.totalMessages}</strong></div>
                        <div>Messages:</div>
                        <ol className="list-decimal list-inside space-y-1 ml-4">
                          {testResult.response.messages.map((msg: string, i: number) => (
                            <li key={i} className="text-xs">
                              <span className="bg-white px-2 py-1 rounded border ml-2">{msg}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!testResult.success && (
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <div className="text-sm font-medium text-red-800 mb-1">❌ Error:</div>
                <div className="text-sm text-red-700">{testResult.error}</div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
          <div className="text-sm font-medium text-yellow-800 mb-2">💡 What This Tests:</div>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Sends a message to your backend using the enhanced API</li>
            <li>• Shows the exact response format from your backend</li>
            <li>• Detects if multi-message format is returned</li>
            <li>• Displays all messages if multi-message is detected</li>
            <li>• Helps debug why frontend might not show all messages</li>
          </ul>
        </div>

        {/* Console Instructions */}
        <div className="bg-gray-50 p-3 rounded border">
          <div className="text-sm font-medium mb-2">🔍 Console Debugging:</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>1. Open DevTools (F12) → Console tab</div>
            <div>2. Click "Test Backend" button above</div>
            <div>3. Look for logs starting with 🔍, ✅, 🎉</div>
            <div>4. Check if backend returns multi-message format</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 