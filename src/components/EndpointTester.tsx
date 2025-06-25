import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export const EndpointTester = () => {
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

  const testEndpoint = async (name: string, endpoint: string, method: string = 'POST') => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('authToken') || `demo-token-${Date.now()}`;
      localStorage.setItem('authToken', token); // Ensure token is set
      
      const requestBody = {
        content: 'Tell me about yourself and what you enjoy doing',
        agentId: 'priya'
      };

      console.log(`🧪 Testing ${name} endpoint:`, endpoint);
      console.log('📤 Request body:', requestBody);
      console.log('🔑 Auth token:', token);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📡 ${name} response status:`, response.status);
      
      let data;
      const responseText = await response.text();
      console.log(`📥 ${name} raw response:`, responseText);
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        data = { error: 'Failed to parse JSON', rawResponse: responseText };
      }

      setResults(prev => ({
        ...prev,
        [name]: {
          success: response.ok,
          status: response.status,
          data,
          endpoint,
          timestamp: new Date().toISOString()
        }
      }));

      console.log(`✅ ${name} test complete:`, data);

    } catch (error: any) {
      console.error(`❌ ${name} test failed:`, error);
      
      setResults(prev => ({
        ...prev,
        [name]: {
          success: false,
          error: error.message,
          endpoint,
          timestamp: new Date().toISOString()
        }
      }));
    }
    
    setIsLoading(false);
  };

  const endpoints = [
    { name: 'Old Messages', endpoint: '/chats/test-chat-123/messages', description: 'Original endpoint' },
    { name: 'New Multi-Message', endpoint: '/chats/test-chat-123/messages/multi', description: 'New multi-message endpoint' },
    { name: 'Streaming', endpoint: '/chats/test-chat-123/messages/stream', description: 'Streaming endpoint' },
    { name: 'Health Check', endpoint: '/health', method: 'GET', description: 'Backend health' },
    { name: 'Root', endpoint: '/', method: 'GET', description: 'Backend root' }
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Backend Endpoint Tester</CardTitle>
        <p className="text-sm text-gray-600">
          Test all endpoints to see which ones are working and returning multi-messages
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {endpoints.map((endpoint) => (
            <div key={endpoint.name} className="flex items-center justify-between p-3 border rounded">
              <div className="flex-1">
                <div className="font-medium text-sm">{endpoint.name}</div>
                <div className="text-xs text-gray-500">{endpoint.endpoint}</div>
                <div className="text-xs text-gray-400">{endpoint.description}</div>
              </div>
              
              <div className="flex items-center gap-2">
                {results[endpoint.name] && (
                  <div className={`w-3 h-3 rounded-full ${
                    results[endpoint.name].success ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testEndpoint(endpoint.name, endpoint.endpoint, endpoint.method)}
                  disabled={isLoading}
                >
                  Test
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => {
              endpoints.forEach(endpoint => {
                setTimeout(() => {
                  testEndpoint(endpoint.name, endpoint.endpoint, endpoint.method);
                }, Math.random() * 1000); // Stagger requests
              });
            }}
            disabled={isLoading}
          >
            🚀 Test All Endpoints
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setResults({})}
            disabled={isLoading}
          >
            Clear Results
          </Button>
        </div>

        {Object.keys(results).length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-3">📊 Test Results:</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(results).map(([name, result]: [string, any]) => (
                <div key={name} className="p-3 bg-gray-50 rounded text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                  
                  {result.data && (
                    <div className="mt-2">
                      <div className="font-medium mb-1">Response Data:</div>
                      <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {result.error && (
                    <div className="mt-2 text-red-600">
                      <div className="font-medium">Error:</div>
                      <div>{result.error}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <div className="text-sm font-medium text-blue-800 mb-1">🎯 What to Look For:</div>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>New Multi-Message</strong>: Should return `isMultiMessage: true` and multiple messages</li>
            <li>• <strong>Old Messages</strong>: Should now also support multi-message format</li>
            <li>• <strong>Streaming</strong>: Should return streaming response (harder to test here)</li>
            <li>• All endpoints should return 200 status when backend is running</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}; 