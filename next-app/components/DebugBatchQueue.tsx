import { useState, useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Play, Music, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface DebugTestProps {
  spaceId: string;
}

export const DebugBatchQueue: React.FC<DebugTestProps> = ({ spaceId }) => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testSummary, setTestSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [socketStatus, setSocketStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [queueLength, setQueueLength] = useState(0);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const { sendMessage, socket } = useSocket();
  const { user } = useUserStore();

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = JSON.parse(event.data);
      
      console.log('🔍 DebugBatchQueue received:', { type, data });
      
      switch (type) {
        case 'queue-update':
          setQueueLength(data.queue?.length || 0);
          addTestResult('queue-update', 'success', `Queue updated: ${data.queue?.length || 0} songs`);
          break;
        case 'current-song-update':
          setCurrentSong(data.song);
          addTestResult('current-song-update', 'success', `Current song: ${data.song?.title || 'None'}`);
          break;
        case 'song-added':
          addTestResult('song-added', 'success', `Song added: ${data.song?.title}`);
          break;
        case 'error':
          addTestResult('error', 'error', `Error: ${data.message || JSON.stringify(data)}`);
          break;
        case 'room-info':
          setSocketStatus('connected');
          addTestResult('room-info', 'success', `Connected as ${data.isAdmin ? 'Admin' : 'User'}`);
          break;
      }
    };

    socket.addEventListener('message', handleMessage);
    setSocketStatus(socket.readyState === WebSocket.OPEN ? 'connected' : 'disconnected');

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket]);

  const addTestResult = (test: string, status: 'success' | 'error' | 'warning', message: string) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runBatchTest = async () => {
    if (!user || !socket) {
      addTestResult('batch-test', 'error', 'User not logged in or socket not connected');
      return;
    }

    setIsRunning(true);
    addTestResult('batch-test', 'warning', 'Starting batch queue test...');

    try {
      // Test 1: Request queue status
      addTestResult('get-queue', 'warning', 'Requesting current queue...');
      sendMessage('get-queue', { spaceId });

      // Test 2: Add a single test song
      const testTrack = {
        id: 'test-1',
        name: 'Test Song 1',
        artists: [{ name: 'Test Artist' }],
        album: { 
          name: 'Test Album',
          images: [{ url: 'https://via.placeholder.com/300' }]
        },
        external_urls: { spotify: 'https://open.spotify.com/track/test1' }
      };

      setTimeout(() => {
        addTestResult('add-single', 'warning', 'Adding single test song...');
        sendMessage('add-to-queue', {
          spaceId,
          url: testTrack.external_urls.spotify,
          trackData: {
            id: testTrack.id,
            name: testTrack.name,
            artist: testTrack.artists.map(a => a.name).join(', '),
            smallImg: testTrack.album.images[0]?.url || '',
            bigImg: testTrack.album.images[0]?.url || '',
            url: 'test-url-1',
            type: 'Spotify',
            addedByUser: {
              id: user.id,
              username: user.username
            }
          },
          autoPlay: queueLength === 0
        });
      }, 1000);

      // Test 3: Add batch of songs (simulate what admin batch would do)
      const batchTracks = [
        {
          id: 'test-2',
          name: 'Test Song 2',
          artists: [{ name: 'Test Artist 2' }],
          album: { 
            name: 'Test Album 2',
            images: [{ url: 'https://via.placeholder.com/300' }]
          },
          external_urls: { spotify: 'https://open.spotify.com/track/test2' }
        },
        {
          id: 'test-3',
          name: 'Test Song 3',
          artists: [{ name: 'Test Artist 3' }],
          album: { 
            name: 'Test Album 3',
            images: [{ url: 'https://via.placeholder.com/300' }]
          },
          external_urls: { spotify: 'https://open.spotify.com/track/test3' }
        }
      ];

      setTimeout(() => {
        addTestResult('add-batch', 'warning', `Adding batch of ${batchTracks.length} test songs...`);
        
        batchTracks.forEach((track, index) => {
          setTimeout(() => {
            sendMessage('add-to-queue', {
              spaceId,
              url: track.external_urls.spotify,
              trackData: {
                id: track.id,
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                smallImg: track.album.images[0]?.url || '',
                bigImg: track.album.images[0]?.url || '',
                url: `test-url-${index + 2}`,
                type: 'Spotify',
                addedByUser: {
                  id: user.id,
                  username: user.username
                }
              },
              autoPlay: false // Only first song should auto-play
            });
          }, index * 200); // Stagger the requests
        });
      }, 2000);

      // Test 4: Request queue after batch add
      setTimeout(() => {
        addTestResult('final-queue', 'warning', 'Requesting final queue state...');
        sendMessage('get-queue', { spaceId });
      }, 4000);

      // Test 5: Complete test
      setTimeout(() => {
        finishTest();
      }, 5000);

    } catch (error) {
      addTestResult('batch-test', 'error', `Test failed: ${error}`);
      finishTest();
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setTestSummary(null);
  };

  const finishTest = () => {
    setIsRunning(false);
    const total = testResults.length;
    const passed = testResults.filter(r => r.status === 'success').length;
    const failed = testResults.filter(r => r.status === 'error').length;
    setTestSummary({ total, passed, failed });
    
    addTestResult('test-complete', 'warning', 
      `Test completed: ${passed}/${total} passed, ${failed} failed`);
  };

  const testWebSocketConnection = () => {
    if (!socket) {
      addTestResult('websocket', 'error', 'WebSocket not initialized');
      return;
    }
    
    const readyStateMap: { [key: number]: string } = {
      [WebSocket.CONNECTING]: 'connecting',
      [WebSocket.OPEN]: 'open',
      [WebSocket.CLOSING]: 'closing',
      [WebSocket.CLOSED]: 'closed'
    };
    
    const state = readyStateMap[socket.readyState] || 'unknown';
    addTestResult('websocket', socket.readyState === WebSocket.OPEN ? 'success' : 'error', 
      `WebSocket state: ${state}`);
    
    if (socket.readyState === WebSocket.OPEN) {
      sendMessage('ping', { spaceId, timestamp: Date.now() });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Batch Queue Debug Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Badge variant={socketStatus === 'connected' ? 'default' : 'destructive'}>
                  WebSocket: {socketStatus}
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant="secondary">
                  Queue: {queueLength} songs
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant={currentSong ? 'default' : 'outline'}>
                  Playing: {currentSong ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            {/* Test Controls */}
            <div className="flex gap-2">
              <Button
                onClick={runBatchTest}
                disabled={isRunning || !user}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? 'Running...' : 'Run Batch Test'}
              </Button>
              <Button
                onClick={testWebSocketConnection}
                variant="outline"
              >
                Test WebSocket
              </Button>
              <Button
                onClick={clearResults}
                variant="outline"
              >
                Clear Results
              </Button>
            </div>

            {/* User Info */}
            {user && (
              <div className="text-sm text-gray-600">
                <p>User: {user.username} ({user.id})</p>
                <p>Space: {spaceId}</p>
              </div>
            )}
            {/* Test Summary */}
            {testSummary && (
              <div className="p-4 bg-gray-100 rounded-lg">
                <h4 className="font-medium mb-2">Test Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <span className="block text-lg font-bold text-blue-600">{testSummary.total}</span>
                    <span className="text-gray-600">Total</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-lg font-bold text-green-600">{testSummary.passed}</span>
                    <span className="text-gray-600">Passed</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-lg font-bold text-red-600">{testSummary.failed}</span>
                    <span className="text-gray-600">Failed</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm"
                >
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.test}</span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    <p className="text-gray-700">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
