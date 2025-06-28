import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { CheckCircle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatus {
  webSocket: 'connecting' | 'connected' | 'disconnected' | 'error';
  redis: 'unknown' | 'connected' | 'disconnected' | 'error';
  lastPing?: Date;
  error?: string;
}

export const ConnectionDebugger: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    webSocket: 'disconnected',
    redis: 'unknown'
  });

  const testWebSocketConnection = async () => {
    setStatus(prev => ({ ...prev, webSocket: 'connecting' }));
    
    try {
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL as string);
      
      ws.onopen = () => {
        console.log('🔌 Test WebSocket connected');
        setStatus(prev => ({ 
          ...prev, 
          webSocket: 'connected',
          lastPing: new Date()
        }));
        
        // Send a test message
        ws.send(JSON.stringify({
          type: 'test-connection',
          data: { timestamp: Date.now() }
        }));
        
        // Close after test
        setTimeout(() => {
          ws.close();
        }, 2000);
      };
      
      ws.onerror = (error) => {
        console.error('🔌 Test WebSocket error:', error);
        setStatus(prev => ({ 
          ...prev, 
          webSocket: 'error',
          error: 'WebSocket connection failed'
        }));
      };
      
      ws.onclose = () => {
        console.log('🔌 Test WebSocket closed');
        if (status.webSocket === 'connected') {
          setStatus(prev => ({ ...prev, webSocket: 'disconnected' }));
        }
      };
      
    } catch (error) {
      console.error('🔌 WebSocket test failed:', error);
      setStatus(prev => ({ 
        ...prev, 
        webSocket: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const testRedisConnection = async () => {
    try {
      // Test Redis by sending a message that requires Redis interaction
      const response = await fetch('/api/test/redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'connection' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(prev => ({ 
          ...prev, 
          redis: data.redis ? 'connected' : 'error',
          error: data.error || undefined
        }));
      } else {
        setStatus(prev => ({ 
          ...prev, 
          redis: 'error',
          error: 'API test failed'
        }));
      }
    } catch (error) {
      console.error('Redis test failed:', error);
      setStatus(prev => ({ 
        ...prev, 
        redis: 'error',
        error: error instanceof Error ? error.message : 'Redis test failed'
      }));
    }
  };

  const getStatusIcon = (connectionStatus: string) => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (connectionStatus: string) => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (connectionStatus: string) => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Connection Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WebSocket Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(status.webSocket)}
            <div>
              <p className="font-medium">WebSocket</p>
              <p className={`text-sm ${getStatusColor(status.webSocket)}`}>
                {getStatusText(status.webSocket)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={testWebSocketConnection}
            disabled={status.webSocket === 'connecting'}
          >
            Test
          </Button>
        </div>

        {/* Redis Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(status.redis)}
            <div>
              <p className="font-medium">Redis</p>
              <p className={`text-sm ${getStatusColor(status.redis)}`}>
                {getStatusText(status.redis)}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={testRedisConnection}
            disabled={status.redis === 'connecting'}
          >
            Test
          </Button>
        </div>

        {/* Connection Info */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>WebSocket URL:</strong> {process.env.NEXT_PUBLIC_WSS_URL}
          </p>
          {status.lastPing && (
            <p className="text-sm text-blue-600 mt-1">
              <strong>Last Ping:</strong> {status.lastPing.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Error Display */}
        {status.error && (
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {status.error}
            </p>
          </div>
        )}

        {/* Debug Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => {
              console.log('🔍 Current connection status:', status);
              console.log('🔍 WebSocket URL:', process.env.NEXT_PUBLIC_WSS_URL);
            }}
            className="w-full"
          >
            Log Debug Info
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setStatus({
                webSocket: 'disconnected',
                redis: 'unknown'
              });
            }}
            className="w-full"
          >
            Reset Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionDebugger;
