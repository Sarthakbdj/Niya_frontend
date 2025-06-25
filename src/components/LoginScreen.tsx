import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { AI_AGENTS } from '@/lib/constants';

const LoginScreen = () => {
  const { login } = useAuth();
  const [selectedExpert, setSelectedExpert] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!selectedExpert) {
      alert('Please select an AI expert first');
      return;
    }
    
    setIsLoading(true);
    try {
      // Store selected expert for after login
      localStorage.setItem('selectedExpert', selectedExpert);
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl bg-white/95 backdrop-blur">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🧙‍♂️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Gurukul</h1>
          <p className="text-gray-600 text-sm">
            Your personal AI experts for life guidance and support
          </p>
        </div>

        {/* Expert Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose your AI Expert:
          </label>
          <Select value={selectedExpert} onValueChange={setSelectedExpert}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an expert..." />
            </SelectTrigger>
            <SelectContent>
              {Object.values(AI_AGENTS).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{agent.icon}</span>
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expert Preview */}
        {selectedExpert && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{AI_AGENTS[selectedExpert as keyof typeof AI_AGENTS].icon}</span>
              <div>
                <h3 className="font-semibold text-gray-800">
                  {AI_AGENTS[selectedExpert as keyof typeof AI_AGENTS].name}
                </h3>
                <p className="text-sm text-gray-600">
                  {AI_AGENTS[selectedExpert as keyof typeof AI_AGENTS].longDescription}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Login Button */}
        <Button
          onClick={handleLogin}
          disabled={!selectedExpert || isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-medium shadow-lg transform transition-all duration-200 hover:scale-105"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Connecting...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </div>
          )}
        </Button>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </div>
      </Card>
    </div>
  );
};

export default LoginScreen; 