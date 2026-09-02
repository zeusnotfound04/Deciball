'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';

export interface ChatMessage {
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
  messages?: ChatMessage[];
  onClose?: () => void;
}

export const Chat: React.FC<ChatProps> = ({ spaceId, className = '', messages: externalMessages, onClose }) => {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useSocket();
  const { user, isAdmin } = useUserStore();

  const messages = externalMessages || localMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    if (externalMessages) return;
    const handleChatMessage = (event: CustomEvent) => {
      const { userId, username, message, timestamp, userImage, isAdmin } = event.detail;
      setLocalMessages(prev => [...prev, {
        id: `${userId}-${timestamp}`,
        userId, username, message, timestamp, userImage, isAdmin
      }]);
    };
    window.addEventListener('chat-message', handleChatMessage as EventListener);
    return () => window.removeEventListener('chat-message', handleChatMessage as EventListener);
  }, [externalMessages]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !user) return;
    sendMessage('send-chat-message', {
      spaceId,
      userId: user.id,
      username: user.username || user.name,
      message: newMessage.trim(),
      userImage: user.imageUrl,
      isAdmin,
      timestamp: Date.now()
    });
    setNewMessage('');
  }, [newMessage, user, spaceId, sendMessage, isAdmin]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-8 h-8 text-steel-gray/20 mb-3" />
            <p className="font-satoshi text-sm text-steel-gray/50">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.userId === user?.id;
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    {msg.userImage && (
                      <AvatarImage src={msg.userImage} alt={msg.username} referrerPolicy="no-referrer" className="object-cover" />
                    )}
                    <AvatarFallback className="text-[10px] font-bold bg-graphite text-ghost-gray font-mono">
                      {msg.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex-1 min-w-0 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="font-satoshi text-[11px] font-medium text-ghost-gray truncate">
                        {isMe ? 'You' : msg.username}
                      </span>
                      {msg.isAdmin && (
                        <span className="font-mono text-[8px] text-electric-cyan border border-electric-cyan/20 rounded-full px-1.5 py-0">
                          Host
                        </span>
                      )}
                      <span className="font-mono text-[9px] text-steel-gray/40">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div className={`${isMe ? 'flex justify-end' : ''}`}>
                      <p className={`text-[13px] font-satoshi break-words px-3 py-2 rounded-2xl max-w-[85%] ${
                        isMe
                          ? 'bg-paper-white/10 text-paper-white rounded-br-md'
                          : 'bg-paper-white/[0.04] text-ghost-gray rounded-bl-md'
                      }`}>
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-paper-white/[0.04]">
        <div className="flex items-center gap-2 bg-paper-white/[0.04] border border-paper-white/[0.06] rounded-full px-4 py-1 focus-within:border-paper-white/[0.12] transition-colors">
          <input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Say something..."
            maxLength={500}
            className="flex-1 bg-transparent border-none text-[13px] text-paper-white placeholder:text-steel-gray/40 focus:outline-none py-2 font-satoshi"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-paper-white/10 hover:bg-paper-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-paper-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
