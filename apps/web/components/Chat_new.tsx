'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageCircle, X, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { inter, outfit, jetBrainsMono } from '@/lib/font';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  userImage?: string;
  isAdmin?: boolean;
}

interface ChatProps {
  spaceId: string;
  className?: string;
  isOverlay?: boolean;
  onClose?: () => void;
}

export const Chat: React.FC<ChatProps> = ({ spaceId, className = '', isOverlay = false, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useSocket();
  const { user, isAdmin } = useUserStore();

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen || isOverlay) {
      scrollToBottom();
    }
  }, [messages, isOpen, isOverlay, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if ((isOpen || isOverlay) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isOverlay]);

  // Handle incoming chat messages
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent) => {
      const { userId, username, message, timestamp, userImage, isAdmin } = event.detail;
      
      const newChatMessage: ChatMessage = {
        id: `${userId}-${timestamp}`,
        userId,
        username,
        message,
        timestamp,
        userImage,
        isAdmin
      };

      setMessages(prev => [...prev, newChatMessage]);
      
      // Only increment unread count if chat is closed and not in overlay mode
      if (!isOpen && !isOverlay) {
        setUnreadCount(prev => prev + 1);
      }
    };

    window.addEventListener('chat-message', handleChatMessage as EventListener);
    return () => window.removeEventListener('chat-message', handleChatMessage as EventListener);
  }, [isOpen, isOverlay]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !user) return;

    const messageData = {
      spaceId,
      userId: user.id,
      username: user.username || user.name,
      message: newMessage.trim(),
      userImage: user.imageUrl,
      isAdmin
    };

    sendMessage('chat-message', messageData);
    setNewMessage('');
  }, [newMessage, user, spaceId, sendMessage, isAdmin]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const toggleChat = useCallback(() => {
    if (isOverlay && onClose) {
      onClose();
    } else {
      setIsOpen(prev => !prev);
      if (!isOpen) {
        setUnreadCount(0);
      }
    }
  }, [isOpen, isOverlay, onClose]);

  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getUserInitials = useCallback((username: string) => {
    return username.charAt(0).toUpperCase();
  }, []);

  // Render overlay mode
  if (isOverlay) {
    return (
      <div className={`w-full h-full bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col ${className}`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className={`font-semibold text-white ${outfit.className}`}>
              Room Chat
            </h3>
            <Badge variant="secondary" className="text-xs bg-white/10 text-gray-300">
              {messages.length}
            </Badge>
          </div>
          <Button
            onClick={toggleChat}
            variant="ghost"
            size="sm"
            className="p-1 h-auto text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className={`text-sm ${inter.className}`}>
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  {/* Avatar */}
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage 
                      src={message.userImage} 
                      alt={message.username}
                      className="object-cover"
                    />
                    <AvatarFallback className={`
                      text-xs font-medium bg-gradient-to-br from-cyan-500 to-purple-500 text-white
                      ${outfit.className}
                    `}>
                      {getUserInitials(message.username)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium text-white truncate ${outfit.className}`}>
                        {message.username}
                      </span>
                      {message.isAdmin && (
                        <Badge className="text-xs bg-gradient-to-r from-cyan-500 to-purple-500 border-0 px-1.5 py-0">
                          Admin
                        </Badge>
                      )}
                      <span className={`text-xs text-gray-400 flex-shrink-0 ${jetBrainsMono.className}`}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className={`text-sm text-gray-200 break-words ${inter.className}`}>
                      {message.message}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className={`
                flex-1 bg-white/10 border-white/20 focus:border-cyan-400/50 
                text-white placeholder:text-gray-400 rounded-full px-4
                ${inter.className}
              `}
              maxLength={500}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className={`
                px-3 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500
                hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50
                disabled:cursor-not-allowed transition-all duration-300
              `}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render normal mode with toggle button
  return (
    <div className={`relative ${className}`}>
      {/* Chat Toggle Button */}
      <Button
        onClick={toggleChat}
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-full
          bg-black/40 hover:bg-black/50 border border-white/20 hover:border-white/30
          backdrop-blur-xl transition-all duration-300 text-gray-200 hover:text-white
          ${inter.className}
        `}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline text-sm font-medium">Chat</span>
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 rounded-full p-0 flex items-center justify-center border-2 border-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={toggleChat} />
          
          {/* Chat Container */}
          <div className={`
            fixed md:absolute bottom-0 right-0 md:bottom-full md:right-0 md:mb-2
            w-full md:w-80 lg:w-96 h-[70vh] md:h-96
            bg-black/90 backdrop-blur-xl border border-white/20 rounded-t-2xl md:rounded-2xl
            shadow-2xl z-50 flex flex-col
          `}>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className={`font-semibold text-white ${outfit.className}`}>
                  Room Chat
                </h3>
                <Badge variant="secondary" className="text-xs bg-white/10 text-gray-300">
                  {messages.length}
                </Badge>
              </div>
              <Button
                onClick={toggleChat}
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className={`text-sm ${inter.className}`}>
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      {/* Avatar */}
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage 
                          src={message.userImage} 
                          alt={message.username}
                          className="object-cover"
                        />
                        <AvatarFallback className={`
                          text-xs font-medium bg-gradient-to-br from-cyan-500 to-purple-500 text-white
                          ${outfit.className}
                        `}>
                          {getUserInitials(message.username)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium text-white truncate ${outfit.className}`}>
                            {message.username}
                          </span>
                          {message.isAdmin && (
                            <Badge className="text-xs bg-gradient-to-r from-cyan-500 to-purple-500 border-0 px-1.5 py-0">
                              Admin
                            </Badge>
                          )}
                          <span className={`text-xs text-gray-400 flex-shrink-0 ${jetBrainsMono.className}`}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className={`text-sm text-gray-200 break-words ${inter.className}`}>
                          {message.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className={`
                    flex-1 bg-white/10 border-white/20 focus:border-cyan-400/50 
                    text-white placeholder:text-gray-400 rounded-full px-4
                    ${inter.className}
                  `}
                  maxLength={500}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className={`
                    px-3 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500
                    hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50
                    disabled:cursor-not-allowed transition-all duration-300
                  `}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
