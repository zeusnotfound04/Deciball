'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageCircle, X, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';

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
      <div className={`w-full h-full bg-midnight-surface border border-graphite rounded-cards shadow-2xl flex flex-col ${className}`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-graphite">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-electric-cyan" />
            <h3 className="font-serif font-semibold text-paper-white">
              Room Chat
            </h3>
            <Badge variant="secondary" className="text-[10px] bg-graphite text-steel-gray font-mono">
              {messages.length}
            </Badge>
          </div>
          <Button
            onClick={toggleChat}
            variant="ghost"
            size="sm"
            className="p-1 h-auto text-steel-gray hover:text-paper-white hover:bg-charcoal"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-steel-gray py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-satoshi">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  {/* Avatar */}
                  <Avatar className="w-8 h-8 flex-shrink-0 rounded-full">
                    <AvatarImage
                      src={message.userImage}
                      alt={message.username}
                      className="object-cover rounded-full"
                    />
                    <AvatarFallback className="text-xs font-medium bg-electric-cyan text-void-black font-mono rounded-full">
                      {getUserInitials(message.username)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-steel-gray truncate">
                        {message.username}
                      </span>
                      {message.isAdmin && (
                        <Badge className="font-mono text-[10px] text-electric-cyan border border-electric-cyan/30 rounded-full bg-transparent px-1.5 py-0">
                          Admin
                        </Badge>
                      )}
                      <span className="font-mono text-[10px] text-slate-custom flex-shrink-0">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-paper-white break-words font-satoshi">
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
        <div className="p-4 border-t border-graphite">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-graphite border-slate-custom focus:border-electric-cyan text-paper-white placeholder:text-steel-gray rounded-full px-4 font-satoshi"
              maxLength={500}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-3 py-2 rounded-full bg-electric-cyan hover:bg-electric-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-void-black"
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
        className="relative flex items-center gap-2 px-3 py-2 rounded-full bg-graphite hover:bg-charcoal border border-slate-custom transition-all duration-300 text-steel-gray hover:text-paper-white font-satoshi"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline text-sm font-medium">Chat</span>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-electric-cyan text-void-black text-xs min-w-[20px] h-5 rounded-full p-0 flex items-center justify-center border-2 border-void-black font-mono">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div className="fixed inset-0 bg-void-black/60 z-40 md:hidden" onClick={toggleChat} />

          {/* Chat Container */}
          <div className={`
            fixed md:absolute bottom-0 right-0 md:bottom-full md:right-0 md:mb-2
            w-full md:w-80 lg:w-96 h-[70vh] md:h-96
            bg-midnight-surface border border-graphite rounded-t-cards md:rounded-cards
            shadow-2xl z-50 flex flex-col
          `}>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-graphite">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-electric-cyan" />
                <h3 className="font-serif font-semibold text-paper-white">
                  Room Chat
                </h3>
                <Badge variant="secondary" className="text-[10px] bg-graphite text-steel-gray font-mono">
                  {messages.length}
                </Badge>
              </div>
              <Button
                onClick={toggleChat}
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-steel-gray hover:text-paper-white hover:bg-charcoal"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-steel-gray py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-satoshi">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      {/* Avatar */}
                      <Avatar className="w-8 h-8 flex-shrink-0 rounded-full">
                        <AvatarImage
                          src={message.userImage}
                          alt={message.username}
                          className="object-cover rounded-full"
                        />
                        <AvatarFallback className="text-xs font-medium bg-electric-cyan text-void-black font-mono rounded-full">
                          {getUserInitials(message.username)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-steel-gray truncate">
                            {message.username}
                          </span>
                          {message.isAdmin && (
                            <Badge className="font-mono text-[10px] text-electric-cyan border border-electric-cyan/30 rounded-full bg-transparent px-1.5 py-0">
                              Admin
                            </Badge>
                          )}
                          <span className="font-mono text-[10px] text-slate-custom flex-shrink-0">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-paper-white break-words font-satoshi">
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
            <div className="p-4 border-t border-graphite">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 bg-graphite border-slate-custom focus:border-electric-cyan text-paper-white placeholder:text-steel-gray rounded-full px-4 font-satoshi"
                  maxLength={500}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-3 py-2 rounded-full bg-electric-cyan hover:bg-electric-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-void-black"
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
