import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { chatApi } from '@/lib/api';

export const ConnectionTest = () => {
  const [testResults, setTestResults] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsLoading(true);
    try {
      const result = await testFn();
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'success', data: result }
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'error', error: error.message }
      }));
    }
    setIsLoading(false);
  };

  const testBackendConnection = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  };

  const testAuthEndpoint = async () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
    const response = await fetch(`${API_BASE_URL}/auth/google/code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-code' })
    });
    // Expect 400 or 401, not a network error
    return { status: response.status, statusText: response.statusText };
  };

  const testChatEndpoint = async () => {
    return chatApi.getChats();
  };

  const testDemoLogin = async () => {
    // Set up demo credentials
    const demoToken = `demo-token-${Date.now()}`;
    localStorage.setItem('authToken', demoToken);
    
    const result = await chatApi.createChat('priya');
    return result;
  };

  const testMultiMessage = async () => {
    // Set up demo credentials
    const demoToken = `demo-token-${Date.now()}`;
    localStorage.setItem('authToken', demoToken);
    
    const result = await chatApi.sendMessageMulti('demo-chat-123', 'Tell me about yourself and what you enjoy doing', 'priya');
    return result;
  };

  const getStatus = (testName: string) => {
    const result = testResults[testName];
    if (!result) return 'pending';
    return result.status;
  };

  const getStatusBadge = (testName: string) => {
    const status = getStatus(testName);
    const colors = {
      pending: 'bg-gray-500',
      success: 'bg-green-500',
      error: 'bg-red-500'
    };
    return <Badge className={colors[status as keyof typeof colors]}>{status}</Badge>;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 Backend Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="text-sm font-medium">Environment Variables:</div>
          <div className="text-xs bg-gray-100 p-2 rounded">
            <div>VITE_API_BASE_URL: {import.meta.env.VITE_API_BASE_URL || 'NOT SET'}</div>
            <div>VITE_BACKEND_URL: {import.meta.env.VITE_BACKEND_URL || 'NOT SET'}</div>
            <div>VITE_WS_URL: {import.meta.env.VITE_WS_URL || 'NOT SET'}</div>
            <div>Auth Token: {localStorage.getItem('authToken') ? 'SET' : 'NOT SET'}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Backend Health Check</span>
            <div className="flex gap-2">
              {getStatusBadge('health')}
              <Button 
                size="sm" 
                onClick={() => runTest('health', testBackendConnection)}
                disabled={isLoading}
              >
                Test
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Auth Endpoint</span>
            <div className="flex gap-2">
              {getStatusBadge('auth')}
              <Button 
                size="sm" 
                onClick={() => runTest('auth', testAuthEndpoint)}
                disabled={isLoading}
              >
                Test
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Chat Endpoint (requires auth)</span>
            <div className="flex gap-2">
              {getStatusBadge('chat')}
              <Button 
                size="sm" 
                onClick={() => runTest('chat', testChatEndpoint)}
                disabled={isLoading}
              >
                Test
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Demo Login & Chat</span>
            <div className="flex gap-2">
              {getStatusBadge('demo')}
              <Button 
                size="sm" 
                onClick={() => runTest('demo', testDemoLogin)}
                disabled={isLoading}
              >
                Test
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>🎉 Multi-Message Feature</span>
            <div className="flex gap-2">
              {getStatusBadge('multiMessage')}
              <Button 
                size="sm" 
                onClick={() => runTest('multiMessage', testMultiMessage)}
                disabled={isLoading}
              >
                Test Multi-Message
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Test Results:</div>
          <div className="text-xs bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setTestResults({});
              runTest('health', testBackendConnection);
              runTest('auth', testAuthEndpoint);
              runTest('chat', testChatEndpoint);
            }}
            disabled={isLoading}
          >
            Run All Tests
          </Button>
          <Button 
            variant="outline"
            onClick={() => setTestResults({})}
            disabled={isLoading}
          >
            Clear Results
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 