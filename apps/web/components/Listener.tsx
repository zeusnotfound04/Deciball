'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/context/socket-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Users, Eye, EyeOff, Crown, User, Music, Volume2 } from 'lucide-react';

interface ConnectedUser {
  userId: string;
  isCreator: boolean;
  username?: string;
  isListening?: boolean;
  volume?: number;
}

interface ListenerProps {
  spaceId: string;
  isAdmin?: boolean;
  userCount?: number;
  userDetails?: ConnectedUser[];
}

export const Listener: React.FC<ListenerProps> = ({ 
  spaceId, 
  isAdmin = false, 
  userCount = 0,
  userDetails = []
}) => {
  const [showListeners, setShowListeners] = useState(false);
  const [listeners, setListeners] = useState<ConnectedUser[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (userDetails.length > 0) {
      setListeners(userDetails);
    }
  }, [userDetails]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = JSON.parse(event.data);
      
      switch (type) {
        case 'user-update':
          if (data.userDetails) {
            setListeners(data.userDetails);
          }
          break;
        case 'user-joined':
          if (data.user) {
            setListeners(prev => {
              const exists = prev.find(listener => listener.userId === data.user.userId);
              if (!exists) {
                return [...prev, data.user];
              }
              return prev;
            });
          }
          break;
        case 'user-left':
          if (data.userId) {
            setListeners(prev => prev.filter(listener => listener.userId !== data.userId));
          }
          break;
        case 'listener-update':
          if (data.userId) {
            setListeners(prev => prev.map(listener => 
              listener.userId === data.userId 
                ? { ...listener, ...data.updates }
                : listener
            ));
          }
          break;
      }
    };

    socket.addEventListener('message', handleMessage);
    
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'get-listeners',
        data: { spaceId }
      }));
    }

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, spaceId]);

  const getUserInitials = (userId: string) => {
    return userId.slice(0, 2).toUpperCase();
  };

  const getUserDisplayName = (user: ConnectedUser) => {
    return user.username || `User ${user.userId.slice(0, 8)}`;
  };

  const getStatusColor = (user: ConnectedUser) => {
    if (user.isCreator) return 'bg-yellow-500';
    if (user.isListening) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getStatusText = (user: ConnectedUser) => {
    if (user.isCreator) return 'Creator';
    if (user.isListening) return 'Listening';
    return 'Connected';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connected Listeners
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {userCount} online
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowListeners(!showListeners)}
            >
              {showListeners ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {showListeners && (
        <CardContent>
          <div className="space-y-3">
            {listeners.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No listeners connected</p>
                <p className="text-sm">Share the room link to invite friends!</p>
              </div>
            ) : (
              listeners.map((user, index) => (
                <div 
                  key={user.userId} 
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium ${getStatusColor(user)}`}>
                      {user.isCreator ? (
                        <Crown className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                    </div>

                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {getUserDisplayName(user)}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getStatusText(user)}
                        </p>
                        {user.isListening && (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Music className="w-3 h-3" />
                            <span>Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.isListening && user.volume !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Volume2 className="w-3 h-3" />
                        <span>{Math.round(user.volume * 100)}%</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      {user.isCreator && (
                        <Badge variant="default" className="text-xs">
                          Creator
                        </Badge>
                      )}
                      {user.isListening && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Listening
                        </Badge>
                      )}
                    </div>

                    {isAdmin && !user.isCreator && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-red-500"
                        title="Kick user (Admin only)"
                      >
                        <User className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}

            {listeners.length > 0 && (
              <div className="border-t pt-3 mt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-300">
                      {listeners.length}
                    </p>
                    <p className="text-xs text-gray-500">Total Users</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {listeners.filter(u => u.isListening).length}
                    </p>
                    <p className="text-xs text-gray-500">Listening</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {listeners.filter(u => u.isCreator).length}
                    </p>
                    <p className="text-xs text-gray-500">Admins</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
