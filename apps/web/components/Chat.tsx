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
        className={`w-full h-full bg-midnight-surface border border-graphite rounded-cards shadow-2xl flex flex-col relative overflow-hidden ${className}`}
      >

        {/* Chat Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative flex items-center justify-between px-4 py-3 border-b border-graphite"
        >
          <div className="flex items-center gap-2">
            <h3 className="font-satoshi font-bold text-sm text-paper-white">
              Chat
            </h3>
            <span className="font-mono text-[10px] text-steel-gray">
              {messages.length}
            </span>
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-1.5 h-auto text-steel-gray hover:text-paper-white hover:bg-charcoal rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto relative">
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-steel-gray py-12"
                >
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-base font-satoshi">
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
                        <Avatar className="w-10 h-10 flex-shrink-0 rounded-full ring-2 ring-graphite">
                          <AvatarImage
                            src={message.userImage}
                            alt={message.username}
                            className="object-cover rounded-full"
                          />
                          <AvatarFallback className="text-sm font-bold bg-electric-cyan text-void-black font-mono rounded-full">
                            {getUserInitials(message.username)}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>

                      {/* Message Content */}
                      <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'flex-row-reverse justify-start' : ''}`}>
                          <span className="font-mono text-xs text-steel-gray truncate">
                            {isCurrentUser ? 'You' : message.username}
                          </span>
                          {message.isAdmin && (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Badge className="font-mono text-[10px] text-electric-cyan border border-electric-cyan/30 rounded-full bg-transparent px-2 py-0.5">
                                Admin
                              </Badge>
                            </motion.div>
                          )}
                          <span className="font-mono text-[10px] text-slate-custom flex-shrink-0">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className={`${isCurrentUser ? 'flex justify-end' : 'flex justify-start'}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                            className={`
                              text-sm break-words px-4 py-3 rounded-2xl max-w-[80%] relative overflow-hidden font-satoshi
                              ${isCurrentUser
                                ? 'bg-electric-cyan text-void-black'
                                : 'bg-graphite text-paper-white border border-slate-custom'
                              }
                            `}
                          >
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
          className="p-6 border-t border-graphite"
        >
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full bg-graphite border border-slate-custom focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan/30 text-paper-white placeholder:text-steel-gray rounded-full px-5 py-3 transition-all duration-300 font-satoshi"
                maxLength={500}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-steel-gray font-mono">
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
                className="px-4 py-3 rounded-full bg-electric-cyan hover:bg-electric-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-void-black"
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
          className="relative flex items-center gap-2 px-4 py-3 rounded-full bg-graphite hover:bg-charcoal border border-slate-custom hover:border-slate-custom transition-all duration-300 text-steel-gray hover:text-paper-white shadow-lg hover:shadow-xl font-satoshi"
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
                <Badge className="absolute -top-2 -right-2 bg-electric-cyan text-void-black text-xs min-w-[24px] h-6 rounded-full p-0 flex items-center justify-center border-2 border-void-black shadow-lg font-mono">
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
                className="absolute -top-20 -right-4 sm:-right-8 w-64 sm:w-72 bg-midnight-surface border border-slate-custom rounded-cards shadow-2xl p-4 z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewMessagePopup(false);
                  toggleChat();
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Popup Arrow */}
                <div className="absolute bottom-[-8px] right-8 w-4 h-4 bg-midnight-surface border-r border-b border-slate-custom transform rotate-45"></div>
                
                {/* Popup Header */}
                <div className="flex items-center gap-2 mb-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 bg-electric-cyan rounded-full"
                  />
                  <span className="font-mono text-xs font-bold text-electric-cyan">
                    New Message
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewMessagePopup(false);
                    }}
                    className="ml-auto text-steel-gray hover:text-paper-white transition-colors duration-200"
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                </div>

                {/* Message Preview */}
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0 rounded-full ring-1 ring-graphite">
                    <AvatarImage
                      src={latestMessage.userImage}
                      alt={latestMessage.username}
                      className="object-cover rounded-full"
                    />
                    <AvatarFallback className="text-xs font-bold bg-electric-cyan text-void-black font-mono rounded-full">
                      {getUserInitials(latestMessage.username)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-steel-gray truncate">
                        {latestMessage.username}
                      </span>
                      {latestMessage.isAdmin && (
                        <Badge className="font-mono text-[10px] text-electric-cyan border border-electric-cyan/30 rounded-full bg-transparent px-1.5 py-0.5">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-paper-white line-clamp-2 font-satoshi">
                      {latestMessage.message}
                    </p>
                    <span className="font-mono text-[10px] text-slate-custom">
                      {formatTime(latestMessage.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Click to view indicator */}
                <div className="mt-3 text-center">
                  <span className="text-xs text-electric-cyan font-satoshi">
                    Click to open chat
                  </span>
                </div>
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
              className="fixed inset-0 bg-void-black/60 z-40 md:hidden" 
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
                bg-midnight-surface border border-graphite
                rounded-t-cards sm:rounded-cards md:rounded-cards
                shadow-2xl z-50 flex flex-col overflow-hidden
                mx-auto sm:mx-4 md:mx-0
              `}
            >

              {/* Chat Header */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative flex items-center justify-between p-4 sm:p-5 md:p-4 border-b border-graphite"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-electric-cyan flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-void-black" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-electric-cyan">
                      Room Chat
                    </h3>
                    <p className="text-xs text-steel-gray font-satoshi">
                      {messages.length} messages
                    </p>
                  </div>
                  <Badge className="bg-graphite text-electric-cyan border border-slate-custom px-2 py-1 font-mono text-[10px]">
                    Live
                  </Badge>
                </div>
                <Button
                  onClick={toggleChat}
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-steel-gray hover:text-paper-white hover:bg-charcoal rounded-xl transition-all duration-300"
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
                      className="text-center text-steel-gray py-8 sm:py-12"
                    >
                      <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-30" />
                      <p className="text-sm sm:text-base font-satoshi">
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
                            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-full ring-2 ring-graphite">
                              <AvatarImage
                                src={message.userImage}
                                alt={message.username}
                                className="object-cover rounded-full"
                              />
                              <AvatarFallback className="text-xs sm:text-sm font-bold bg-electric-cyan text-void-black font-mono rounded-full">
                                {getUserInitials(message.username)}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>

                          {/* Message Content */}
                          <div className={`flex-1 min-w-0 max-w-[85%] sm:max-w-[80%] ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                            <div className={`flex items-center gap-1.5 sm:gap-2 mb-1.5 ${isCurrentUser ? 'flex-row-reverse justify-start' : ''}`}>
                              <span className="font-mono text-xs text-steel-gray truncate">
                                {isCurrentUser ? 'You' : message.username}
                              </span>
                              {message.isAdmin && (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Badge className="font-mono text-[10px] text-electric-cyan border border-electric-cyan/30 rounded-full bg-transparent px-1.5 py-0.5">
                                    Admin
                                  </Badge>
                                </motion.div>
                              )}
                              <span className="font-mono text-[10px] text-slate-custom flex-shrink-0">
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                            <div className={`${isCurrentUser ? 'flex justify-end' : 'flex justify-start'}`}>
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                                className={`
                                  text-sm break-words px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl relative overflow-hidden font-satoshi
                                  ${isCurrentUser
                                    ? 'bg-electric-cyan text-void-black'
                                    : 'bg-graphite text-paper-white border border-slate-custom'
                                  }
                                `}
                              >
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
                className="p-4 sm:p-5 md:p-4 border-t border-graphite"
              >
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="w-full bg-graphite border border-slate-custom focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan/30 text-paper-white placeholder:text-steel-gray rounded-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base transition-all duration-300 font-satoshi"
                      maxLength={500}
                    />
                    <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-xs text-steel-gray font-mono">
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
                      className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-full bg-electric-cyan hover:bg-electric-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-void-black"
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
