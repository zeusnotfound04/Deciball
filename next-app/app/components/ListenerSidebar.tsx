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
    console.log('🎧 ListenerSidebar - listeners prop updated:', listeners);
    console.log('🎧 ListenerSidebar - listeners count:', listeners.length);
    console.log('🎧 ListenerSidebar - sidebar state:', state);
  }, [listeners, state]);
  
  console.log('🎧 ListenerSidebar - rendering with state:', listeners);

  // Memoize animation variants to prevent recreation on every render
  const headerVariants = useMemo(() => ({
    expanded: {
      opacity: 1,
      width: "auto",
      transition: {
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1] as const
      }
    },
    collapsed: {
      opacity: 0,
      width: 0,
      transition: {
        duration: 0.2,
        ease: [0.4, 0.0, 0.2, 1] as const
      }
    }
  }), []);

  const contentVariants = useMemo(() => ({
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1] as const,
        staggerChildren: 0.03
      }
    },
    collapsed: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1] as const,
        staggerChildren: 0.03
      }
    }
  }), []);

  const itemVariants = useMemo(() => ({
    expanded: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1] as const
      }
    },
    collapsed: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1] as const
      }
    }
  }), []);

  // Memoize the listeners count to prevent unnecessary re-calculations
  const listenersCount = useMemo(() => listeners.length, [listeners.length]);

  // Memoize the header title to prevent string concatenation on every render
  const headerTitle = useMemo(() => `Listeners (${listenersCount})`, [listenersCount]);

  // Memoize the fallback content for empty listeners
  const emptyListenersContent = useMemo(() => {
    if (listenersCount > 0) return null;
    
    return (
      <motion.div 
        className="flex items-center justify-center p-4 text-gray-400"
        variants={itemVariants}
      >
        <AnimatePresence mode="wait">
          {state === "expanded" ? (
            <motion.span
              key="no-listeners-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm"
            >
              No listeners yet...
            </motion.span>
          ) : (
            <motion.div
              key="no-listeners-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-xs font-medium"
            >
              0
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [listenersCount, state, itemVariants]);

  // Memoize individual listener items
  const ListenerItem = useMemo(() => {
    return React.memo(({ listener, index }: { listener: UserDetail; index: number }) => {
      // Memoize avatar fallback text
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
          variants={itemVariants}
          animate={state}
          transition={{ delay: index * 0.03 }}
          className="w-full"
        >
          <SidebarMenuItem>
            <div className={`sidebar-item flex items-center p-2 hover:bg-gray-800 rounded-md transition-all duration-300 ${
              state === "collapsed" ? "justify-center px-1" : "gap-3"
            }`}>
              <Avatar className="h-8 w-8 transition-all duration-300 hover:scale-105 flex-shrink-0">
                {listener.imageUrl && (
                  <AvatarImage
                    src={listener.imageUrl}
                    alt={displayName}
                  />
                )}
                <AvatarFallback className="bg-purple-600 text-white transition-colors duration-200 hover:bg-purple-500">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
              {/* Animated name and creator badge - only show when expanded */}
              <AnimatePresence mode="wait">
                {state === "expanded" && (
                  <motion.div
                    key={`listener-info-${listener.userId}`}
                    initial={{ opacity: 0, x: -10, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: "auto" }}
                    exit={{ opacity: 0, x: -10, width: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
                    className="flex flex-col min-w-0 flex-1 overflow-hidden"
                  >
                    <span className="truncate font-medium">
                      {displayName}
                    </span>
                    {listener.isCreator && (
                      <motion.span
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="text-xs text-purple-400"
                      >
                        Creator
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SidebarMenuItem>
        </motion.div>
      );
    });
  }, [itemVariants, state]);

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
  }, [listeners, listenersCount, emptyListenersContent, ListenerItem]);

  // Memoize the main sidebar content
  const sidebarContent = useMemo(() => (
    <motion.div
      variants={contentVariants}
      animate={state}
      initial="collapsed"
    >
      <SidebarMenu>
        {listenersContent}
      </SidebarMenu>
    </motion.div>
  ), [contentVariants, state, listenersContent]);

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <Sidebar
        side="left"
        className="dark bg-gray-900 text-white border-r border-gray-800 h-screen transition-all duration-500 ease-in-out"
        collapsible="icon"
      >
        <SidebarHeader className="flex items-center p-2 relative h-14 min-h-14">
          {/* Fixed trigger button position - always centered */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10">
            <SidebarTrigger className="transition-all duration-300 hover:scale-110 hover:rotate-180 hover:bg-gray-800 rounded-md p-1 w-8 h-8 flex items-center justify-center" />
          </div>
          
          {/* Header text with proper spacing for the button */}
          <div className="flex-1 pr-10 flex items-center h-full">
            <AnimatePresence mode="wait">
              {state === "expanded" && (
                <motion.h2
                  key="header-text"
                  variants={headerVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="text-lg font-semibold overflow-hidden whitespace-nowrap"
                >
                  {headerTitle}
                </motion.h2>
              )}
            </AnimatePresence>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {sidebarContent}
        </SidebarContent>
      </Sidebar>
    </motion.div>
  );
};

export default ListenerSidebar;