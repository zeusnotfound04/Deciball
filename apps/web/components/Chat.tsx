'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageCircle, ArrowUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { useSession } from 'next-auth/react';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  userImage?: string;
  isAdmin?: boolean;
  type?: 'user' | 'system';
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useSocket();
  const { user, isAdmin } = useUserStore();
  const { data: session } = useSession();

  const messages = externalMessages || localMessages;

  const pfp = user?.imageUrl || session?.user?.pfpUrl || (session?.user as any)?.image || '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (externalMessages) return;
    const handleChatMessage = (event: CustomEvent) => {
      const d = event.detail;
      setLocalMessages(prev => {
        if (prev.some(m => m.id === d.id)) return prev;
        return [...prev, {
          id: d.id || `${d.userId}-${d.timestamp}`,
          userId: d.userId, username: d.username, message: d.message,
          timestamp: d.timestamp, userImage: d.userImage, isAdmin: d.isAdmin,
          type: d.type || 'user',
        }];
      });
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
      userImage: pfp,
      isAdmin,
      timestamp: Date.now()
    });
    setNewMessage('');
    inputRef.current?.focus();
  }, [newMessage, user, spaceId, sendMessage, isAdmin, pfp]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-3 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle className="w-8 h-8 text-steel-gray/20 mb-3" />
            <p className="font-satoshi text-sm text-steel-gray/50">No messages yet</p>
            <p className="font-mono text-[10px] text-steel-gray/30 mt-1">Be the first to say something</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {messages.map((msg) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center py-1.5">
                    <span className="font-mono text-[10px] text-steel-gray/50 bg-paper-white/[0.03] px-3 py-1 rounded-full">
                      {msg.message}
                    </span>
                  </div>
                );
              }

              const isMe = msg.userId === user?.id;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                    {msg.userImage && msg.userImage.length > 0 && (
                      <AvatarImage src={msg.userImage} alt={msg.username} referrerPolicy="no-referrer" className="object-cover" />
                    )}
                    <AvatarFallback className="text-[10px] font-bold bg-charcoal text-ghost-gray font-mono">
                      {msg.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`max-w-[80%] min-w-0 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="font-satoshi text-[11px] font-medium text-ghost-gray">
                        {isMe ? 'You' : msg.username}
                      </span>
                      {msg.isAdmin && (
                        <span className="font-mono text-[8px] text-electric-cyan border border-electric-cyan/20 rounded-full px-1.5 leading-[14px]">
                          Host
                        </span>
                      )}
                      <span className="font-mono text-[9px] text-steel-gray/30">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className={`text-[13px] font-satoshi leading-[1.4] break-words whitespace-pre-wrap px-3 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-paper-white/10 text-paper-white rounded-tr-sm'
                        : 'bg-paper-white/[0.04] text-ghost-gray rounded-tl-sm'
                    }`}>
                      {msg.message}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-paper-white/[0.04] border border-paper-white/[0.06] rounded-full px-4 focus-within:border-paper-white/[0.15] transition-colors">
            <input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Say something..."
              maxLength={500}
              className="w-full bg-transparent border-none text-[13px] text-paper-white placeholder:text-steel-gray/30 focus:outline-none py-2.5 font-satoshi"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className={`w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 ${
              newMessage.trim()
                ? 'bg-paper-white text-void-black hover:bg-ghost-gray scale-100'
                : 'bg-paper-white/[0.06] text-steel-gray/30 scale-95'
            }`}
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
