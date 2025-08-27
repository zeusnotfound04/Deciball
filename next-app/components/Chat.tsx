'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageCircle, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showNewMessagePopup, setShowNewMessagePopup] = useState(false);
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);
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
      
      // Only show notifications for messages from other users
      const isFromCurrentUser = userId === user?.id;
      
      // Only increment unread count and show popup if chat is closed and not in overlay mode
      if (!isOpen && !isOverlay && !isFromCurrentUser) {
        setUnreadCount(prev => prev + 1);
        setLatestMessage(newChatMessage);
        setShowNewMessagePopup(true);
        
        // Auto hide popup after 4 seconds
        setTimeout(() => {
          setShowNewMessagePopup(false);
        }, 4000);
      }
    };

    window.addEventListener('chat-message', handleChatMessage as EventListener);
    return () => window.removeEventListener('chat-message', handleChatMessage as EventListener);
  }, [isOpen, isOverlay, user?.id]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !user) return;

    const messageData = {
      spaceId,
      userId: user.id,
      username: user.username || user.name,
      message: newMessage.trim(),
      userImage: user.imageUrl,
      isAdmin,
      timestamp: Date.now()
    };

    sendMessage('send-chat-message', messageData);
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
        setShowNewMessagePopup(false); // Hide popup when opening chat
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`w-full h-full bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden ${className}`}
      >

        {/* Chat Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative flex items-center justify-between p-6 border-b border-white/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className={`font-bold text-xl bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent ${outfit.className}`}>
                Room Chat
              </h3>
              <p className={`text-sm text-white/70 ${inter.className}`}>
                Connect with your room
              </p>
            </div>
            <Badge className="bg-white/5 text-cyan-400 border border-white/20 px-3 py-1">
              {messages.length}
            </Badge>
          </div>
          <Button
            onClick={toggleChat}
            variant="ghost"
            size="sm"
            className="p-2 h-auto text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto relative">
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-white/50 py-12"
                >
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className={`text-base ${inter.className}`}>
                    No messages yet. Start the conversation!
                  </p>
                </motion.div>
              ) : (
                messages.map((message, index) => {
                  const isCurrentUser = message.userId === user?.id;
                  
                  return (
                    <motion.div 
                      key={message.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                      className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-white/10">
                          <AvatarImage 
                            src={message.userImage} 
                            alt={message.username}
                            className="object-cover"
                          />
                          <AvatarFallback className={`
                            text-sm font-bold bg-gradient-to-br from-cyan-400 to-teal-400 text-white
                            ${outfit.className}
                          `}>
                            {getUserInitials(message.username)}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>

                      {/* Message Content */}
                      <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'flex-row-reverse justify-start' : ''}`}>
                          <span className={`text-sm font-bold text-white truncate ${outfit.className}`}>
                            {isCurrentUser ? 'You' : message.username}
                          </span>
                          {message.isAdmin && (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 border-0 px-2 py-1 shadow-lg">
                                Admin
                              </Badge>
                            </motion.div>
                          )}
                          <span className={`text-xs text-gray-500 flex-shrink-0 ${jetBrainsMono.className}`}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className={`${isCurrentUser ? 'flex justify-end' : 'flex justify-start'}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                            className={`
                              text-sm break-words px-4 py-3 rounded-2xl max-w-[80%] relative overflow-hidden
                              ${isCurrentUser 
                                ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-white shadow-lg shadow-cyan-400/20' 
                                : 'bg-white/5 text-white border border-white/20'
                              }
                              ${inter.className}
                            `}
                          >
                            {isCurrentUser && (
                              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-teal-500/30 rounded-2xl" />
                            )}
                            <span className="relative z-10">{message.message}</span>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </AnimatePresence>
        </div>

        {/* Message Input */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 border-t border-white/20"
        >
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className={`
                  w-full bg-black/40 border border-white/30 
                  focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30
                  text-white placeholder:text-gray-300 rounded-2xl px-5 py-3
                  transition-all duration-300 backdrop-blur-sm ${inter.className}
                `}
                maxLength={500}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {newMessage.length}/500
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`
                  px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400
                  hover:from-cyan-300 hover:to-teal-300 disabled:opacity-50
                  disabled:cursor-not-allowed transition-all duration-300 text-white
                  shadow-lg shadow-cyan-400/25 hover:shadow-cyan-400/40
                `}
              >
                <Send className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Render normal mode with toggle button
  return (
    <div className={`relative ${className}`}>
      {/* Chat Toggle Button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          onClick={toggleChat}
          className={`
            relative flex items-center gap-2 px-4 py-3 rounded-2xl
            bg-black/60 hover:bg-black/70 backdrop-blur-xl 
            border border-white/20 hover:border-white/30
            transition-all duration-300 text-white/70 hover:text-white
            shadow-lg hover:shadow-xl ${inter.className}
          `}
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <MessageCircle className="w-5 h-5" />
          </motion.div>
          <span className="hidden sm:inline text-sm font-medium">Chat</span>
          
          {/* Unread Count Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-400 to-teal-400 text-white text-xs min-w-[24px] h-6 rounded-full p-0 flex items-center justify-center border-2 border-black shadow-lg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New Message Popup */}
          <AnimatePresence>
            {showNewMessagePopup && latestMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10, x: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10, x: 50 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25,
                  opacity: { duration: 0.3 }
                }}
                className="absolute -top-20 -right-4 sm:-right-8 w-64 sm:w-72 bg-black/95 backdrop-blur-xl border border-cyan-400/50 rounded-2xl shadow-2xl shadow-cyan-400/20 p-4 z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewMessagePopup(false);
                  toggleChat();
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Popup Arrow */}
                <div className="absolute bottom-[-8px] right-8 w-4 h-4 bg-black/95 border-r border-b border-cyan-400/50 transform rotate-45"></div>
                
                {/* Popup Header */}
                <div className="flex items-center gap-2 mb-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 bg-cyan-400 rounded-full"
                  />
                  <span className={`text-xs font-bold text-cyan-400 ${outfit.className}`}>
                    New Message
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewMessagePopup(false);
                    }}
                    className="ml-auto text-white/50 hover:text-white/80 transition-colors duration-200"
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                </div>

                {/* Message Preview */}
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-cyan-400/30">
                    <AvatarImage 
                      src={latestMessage.userImage} 
                      alt={latestMessage.username}
                      className="object-cover"
                    />
                    <AvatarFallback className={`
                      text-xs font-bold bg-gradient-to-br from-cyan-400 to-teal-400 text-white
                      ${outfit.className}
                    `}>
                      {getUserInitials(latestMessage.username)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold text-white truncate ${outfit.className}`}>
                        {latestMessage.username}
                      </span>
                      {latestMessage.isAdmin && (
                        <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 border-0 px-1.5 py-0.5">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className={`text-sm text-white/80 line-clamp-2 ${inter.className}`}>
                      {latestMessage.message}
                    </p>
                    <span className={`text-xs text-white/50 ${jetBrainsMono.className}`}>
                      {formatTime(latestMessage.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Click to view indicator */}
                <div className="mt-3 text-center">
                  <span className={`text-xs text-cyan-400/80 ${inter.className}`}>
                    Click to open chat
                  </span>
                </div>

                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/10 to-teal-400/10 pointer-events-none"></div>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
              onClick={toggleChat} 
            />
            
            {/* Chat Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`
                fixed md:absolute 
                bottom-0 md:bottom-full right-0 md:right-0 md:mb-4
                w-full sm:w-[90vw] md:w-80 lg:w-96 
                h-[85vh] sm:h-[80vh] md:h-[500px]
                bg-black/90 backdrop-blur-xl border border-white/20 
                rounded-t-2xl sm:rounded-2xl md:rounded-2xl
                shadow-2xl z-50 flex flex-col overflow-hidden
                mx-auto sm:mx-4 md:mx-0
              `}
            >

              {/* Chat Header */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative flex items-center justify-between p-4 sm:p-5 md:p-4 border-b border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-lg bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent ${outfit.className}`}>
                      Room Chat
                    </h3>
                    <p className={`text-xs text-white/70 ${inter.className}`}>
                      {messages.length} messages
                    </p>
                  </div>
                  <Badge className="bg-white/5 text-cyan-400 border border-white/20 px-2 py-1 text-xs">
                    Live
                  </Badge>
                </div>
                <Button
                  onClick={toggleChat}
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </Button>
              </motion.div>

              {/* Messages Area */}
              <div className="flex-1 p-4 sm:p-5 md:p-4 overflow-y-auto relative">
                <div className="space-y-3 sm:space-y-4">
                  {messages.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-white/50 py-8 sm:py-12"
                    >
                      <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-30" />
                      <p className={`text-sm sm:text-base ${inter.className}`}>
                        No messages yet. Start the conversation!
                      </p>
                    </motion.div>
                  ) : (
                    messages.map((message, index) => {
                      const isCurrentUser = message.userId === user?.id;
                      
                      return (
                        <motion.div 
                          key={message.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                          className={`flex gap-2 sm:gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                        >
                          {/* Avatar */}
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 ring-2 ring-white/10">
                              <AvatarImage 
                                src={message.userImage} 
                                alt={message.username}
                                className="object-cover"
                              />
                              <AvatarFallback className={`
                                text-xs sm:text-sm font-bold bg-gradient-to-br from-cyan-400 to-teal-400 text-white
                                ${outfit.className}
                              `}>
                                {getUserInitials(message.username)}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>

                          {/* Message Content */}
                          <div className={`flex-1 min-w-0 max-w-[85%] sm:max-w-[80%] ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                            <div className={`flex items-center gap-1.5 sm:gap-2 mb-1.5 ${isCurrentUser ? 'flex-row-reverse justify-start' : ''}`}>
                              <span className={`text-xs sm:text-sm font-bold text-white truncate ${outfit.className}`}>
                                {isCurrentUser ? 'You' : message.username}
                              </span>
                              {message.isAdmin && (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 border-0 px-1.5 py-0.5 shadow-sm">
                                    Admin
                                  </Badge>
                                </motion.div>
                              )}
                              <span className={`text-xs text-white/50 flex-shrink-0 ${jetBrainsMono.className}`}>
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                            <div className={`${isCurrentUser ? 'flex justify-end' : 'flex justify-start'}`}>
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                                className={`
                                  text-sm break-words px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl relative overflow-hidden
                                  ${isCurrentUser 
                                    ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-white shadow-md shadow-cyan-400/20' 
                                    : 'bg-white/5 text-white border border-white/20'
                                  }
                                  ${inter.className}
                                `}
                              >
                                {isCurrentUser && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-xl sm:rounded-2xl" />
                                )}
                                <span className="relative z-10">{message.message}</span>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 sm:p-5 md:p-4 border-t border-white/20"
              >
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className={`
                        w-full bg-black/40 border border-white/30 
                        focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30
                        text-white placeholder:text-gray-300 rounded-xl sm:rounded-2xl 
                        px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base
                        transition-all duration-300 backdrop-blur-sm ${inter.className}
                      `}
                      maxLength={500}
                    />
                    <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-xs text-white/50">
                      {newMessage.length}/500
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className={`
                        px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl 
                        bg-gradient-to-r from-cyan-400 to-teal-400
                        hover:from-cyan-300 hover:to-teal-300 disabled:opacity-50
                        disabled:cursor-not-allowed transition-all duration-300 text-white
                        shadow-lg shadow-cyan-400/25 hover:shadow-cyan-400/40
                      `}
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
