"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/app/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/app/components/ui/avatar";

interface UserDetail {
  userId: string;
  isCreator: boolean;
  name?: string;
  imageUrl?: string;
}

interface ListenerSidebarProps {
  listeners: UserDetail[];
}

const ListenerSidebar: React.FC<ListenerSidebarProps> = ({ listeners }) => {
  const { state } = useSidebar(); 
  
  // Debug effect to track when listeners prop changes
  useEffect(() => {
   
  }, [listeners, state]);
  
  console.log('🎧 ListenerSidebar - rendering with state:', listeners);

  // Simplified animation approach using direct motion values
  const isExpanded = state === "expanded";
  
  const sidebarWidth = isExpanded ? 280 : 90; // Increased from 85 to 100
  const animationConfig = {
    duration: 0.4,
    ease: [0.25, 0.46, 0.45, 0.94] as const
  };

  // Add missing itemVariants
  const itemVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] as const }
    },
    collapsed: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] as const }
    }
  };

  // Memoize the listeners count to prevent unnecessary re-calculations
  const listenersCount = useMemo(() => listeners.length, [listeners.length]);

  // Enhanced empty listeners content with better collapsed state
  const emptyListenersContent = useMemo(() => {
    if (listenersCount > 0) return null;
    
    return (
      <motion.div 
        className="flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      >
        <AnimatePresence mode="wait">
          {state === "expanded" ? (
            <motion.div
              key="no-listeners-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="text-center space-y-3"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#1C1E1F] flex items-center justify-center shadow-lg border border-[#424244]/50">
                <span className="text-lg">👤</span>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-gray-300 font-medium block">
                  No listeners yet
                </span>
                <p className="text-xs text-gray-500">
                  Share your space to get started
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="no-listeners-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1C1E1F] text-sm font-bold border border-[#424244]/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 mx-1" // Adjusted size and added margin
            >
              <span className="text-gray-300">0</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [listenersCount, state]);

  const ListenerItem = React.memo(({ listener, index }: { listener: UserDetail; index: number }) => {
    const avatarFallback = useMemo(() => {
      return listener.name
        ? listener.name.charAt(0).toUpperCase()
        : listener.userId.slice(0, 2).toUpperCase();
    }, [listener.name, listener.userId]);

    // Memoize display name
    const displayName = useMemo(() => {
      return listener.name || `User ${listener.userId.slice(0, 8)}`;
    }, [listener.name, listener.userId]);

    return (
      <motion.div
        key={listener.userId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94] as const,
          delay: index * 0.05
        }}
        className="w-full"
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
      >
        <SidebarMenuItem>
          <motion.div 
            className={`sidebar-item flex items-center transition-all duration-300 backdrop-blur-sm border border-gray-700/20 hover:border-gray-600/40 hover:shadow-lg group ${
              !isExpanded 
                ? "justify-center p-2 rounded-xl mx-1 mb-2" // Reduced padding and margin
                : "gap-3 p-3 rounded-xl hover:bg-gray-700/30"
            }`}
            whileHover={{ 
              backgroundColor: "rgba(55, 65, 81, 0.15)",
              transition: { duration: 0.2 }
            }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <Avatar className={`transition-all duration-300 flex-shrink-0 ring-2 ring-gray-600/20 group-hover:ring-blue-500/30 ${
                !isExpanded ? "h-9 w-9" : "h-9 w-9" // Slightly reduced size for collapsed
              }`}>
                {listener.imageUrl && (
                  <AvatarImage
                    src={listener.imageUrl}
                    alt={displayName}
                  />
                )}
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white transition-all duration-200 group-hover:from-blue-500 group-hover:to-blue-700 font-semibold shadow-lg">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            
            {/* Animated name and creator badge */}
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.div
                  key={`listener-info-${listener.userId}`}
                  initial={{ opacity: 0, x: -15, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: "auto" }}
                  exit={{ opacity: 0, x: -15, width: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  className="flex flex-col min-w-0 flex-1 overflow-hidden"
                >
                  <motion.span 
                    className="truncate font-medium text-white text-sm"
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                  >
                    {displayName}
                  </motion.span>
                  {listener.isCreator && (
                    <motion.span
                      initial={{ opacity: 0, y: 5, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.15, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                      className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full font-medium w-fit border border-blue-700/20"
                    >
                      Creator
                    </motion.span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </SidebarMenuItem>
      </motion.div>
    );
  });

  // Memoize the entire listeners list
  const listenersContent = useMemo(() => {
    if (listenersCount === 0) {
      return emptyListenersContent;
    }

    return listeners.map((listener, index) => (
      <ListenerItem
        key={listener.userId}
        listener={listener}
        index={index}
      />
    ));
  }, [listeners, listenersCount, emptyListenersContent]);

  // Memoize the main sidebar content with stable dependencies
  const sidebarContent = useMemo(() => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className={!isExpanded ? "pt-3 px-2" : "p-4 space-y-2"} // Adjusted padding for collapsed state
    >
      <SidebarMenu className={!isExpanded ? "space-y-1" : "space-y-2"}> {/* Reduced spacing in collapsed */}
        {listenersContent}
      </SidebarMenu>
    </motion.div>
  ), [isExpanded, listenersContent]);

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-50"
      style={{ 
        padding: '5px',
      }}
    >
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: sidebarWidth }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="h-full"
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px`, maxWidth: `${sidebarWidth}px` }} // Enforce width constraints
      >
        <Sidebar
          side="left"
          className="dark bg-transparent text-white border-none h-full transition-all duration-500 ease-out overflow-hidden"
          collapsible="icon"
          style={{ width: `${sidebarWidth}px` }} // Force the width override
        >
          <SidebarHeader className="flex flex-col p-4 relative h-auto min-h-16 bg-[#1C1E1F] backdrop-blur-md rounded-t-2xl border-b border-[#424244]/50 shadow-lg">
            {/* Enhanced trigger button - positioned at top right */}
            <motion.div 
              className="absolute right-3 top-3 z-10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SidebarTrigger className="transition-all duration-300 hover:bg-gray-700/50 rounded-xl p-2 w-12 h- flex items-center justify-center backdrop-blur-sm border border-gray-600/20 hover:border-gray-500/40 shadow-sm hover:shadow-md" />
            </motion.div>
            
            {/* Premium Header */}
            <div className="flex-1 pr-12 flex flex-col justify-center h-full">
              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.div
                    key="header-content"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                    className="space-y-3"
                  >
                    <motion.h2 
                      className="text-xl font-bold text-white tracking-tight"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                    >
                      Listeners
                    </motion.h2>
                    <motion.div 
                      className="text-sm text-gray-400 font-medium"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                    >
                      {listenersCount} Connected
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Crisply-style line separator - always visible */}
            <motion.div 
              className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-500/40 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            />
            <motion.div 
              className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-gray-400/60 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            />
          </SidebarHeader>
          
          <SidebarContent className="bg-[#101010] backdrop-blur-md rounded-b-2xl overflow-hidden shadow-lg">
            {sidebarContent}
          </SidebarContent>
        </Sidebar>
      </motion.div>
    </div>
  );
};

export default ListenerSidebar;