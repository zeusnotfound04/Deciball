"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
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
import { Trash2, UserX } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface UserDetail {
  userId: string;
  isCreator: boolean;
  name?: string;
  imageUrl?: string;
}

interface ListenerSidebarProps {
  listeners: UserDetail[];
  isAdmin?: boolean;
  onKickListener?: (userId: string) => void;
}

const ListenerSidebar: React.FC<ListenerSidebarProps> = ({ 
  listeners, 
  isAdmin = false, 
  onKickListener 
}) => {
  const { state } = useSidebar();
  
  // Simple debug to see what we get
  console.log('Listeners data:', listeners);
  
  // Drag and Drop State
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedListener, setDraggedListener] = useState<UserDetail | null>(null);
  const [isOverKickZone, setIsOverKickZone] = useState(false);
  
  // Drag and Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  ); 
  
  // Deduplicate listeners to prevent duplicate keys
  const uniqueListeners = useMemo(() => {
    const seen = new Set();
    return listeners.filter(listener => {
      if (seen.has(listener.userId)) {
        return false;
      }
      seen.add(listener.userId);
      return true;
    });
  }, [listeners]);

  // Drag and Drop Handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (!isAdmin) return;
    
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the dragged listener
    const listener = uniqueListeners.find(l => l.userId === active.id);
    if (listener && !listener.isCreator) { // Don't allow dragging creator
      setDraggedListener(listener);
      console.log(`🎯 Started dragging listener: ${listener.name || listener.userId}`);
    } else {
      // Cancel drag if trying to drag creator
      setActiveId(null);
      setDraggedListener(null);
    }
  }, [isAdmin, uniqueListeners]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    console.log(`🎯 Drag ended - active: ${active?.id}, over: ${over?.id}, isAdmin: ${isAdmin}, onKickListener: ${!!onKickListener}`);

    if (!over || !isAdmin || !onKickListener) {
      setActiveId(null);
      setDraggedListener(null);
      setIsOverKickZone(false);
      return;
    }

    // If dropped on kick zone, kick the listener
    if (over.id === 'kick-zone' && draggedListener && !draggedListener.isCreator) {
      console.log(`🚫 Kicking listener: ${draggedListener.name || draggedListener.userId}`);
      onKickListener(draggedListener.userId);
    }

    setActiveId(null);
    setDraggedListener(null);
    setIsOverKickZone(false);
  }, [isAdmin, onKickListener, draggedListener]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    const wasOverKickZone = isOverKickZone;
    const isNowOverKickZone = over?.id === 'kick-zone';
    
    if (wasOverKickZone !== isNowOverKickZone) {
      setIsOverKickZone(isNowOverKickZone);
      console.log(`🎯 Drag over kick zone: ${isNowOverKickZone}`);
    }
  }, [isOverKickZone]);
  
  const isExpanded = state === "expanded";
  
  const sidebarWidth = isExpanded ? 280 : 90;
  const animationConfig = {
    duration: 0.4,
    ease: [0.25, 0.46, 0.45, 0.94] as const
  };

  // Emit sidebar width changes to parent layout
  useEffect(() => {
    const event = new CustomEvent('sidebar-resize', { 
      detail: { width: sidebarWidth } 
    });
    window.dispatchEvent(event);
  }, [sidebarWidth]);

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

  const listenersCount = useMemo(() => uniqueListeners.length, [uniqueListeners.length]);

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
                <span className="text-lg">User</span>
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
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1C1E1F] text-sm font-bold border border-[#424244]/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 mx-1"
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

    const displayName = useMemo(() => {
      return listener.name || `User ${listener.userId.slice(0, 8)}`;
    }, [listener.name, listener.userId]);

    // Make item draggable only if admin and not creator
    const canDrag = isAdmin && !listener.isCreator;
    
    const {
      attributes,
      listeners: dndListeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: listener.userId,
    });

    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...(canDrag ? dndListeners : {})}
        key={listener.userId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94] as const,
          delay: index * 0.05
        }}
        className={cn(
          "w-full",
          isDragging && "shadow-lg ring-2 ring-red-500",
          canDrag && "cursor-grab active:cursor-grabbing"
        )}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
      >
        <SidebarMenuItem>
          <motion.div 
            className={`sidebar-item flex items-center transition-all duration-300 backdrop-blur-sm border border-gray-700/20 hover:border-gray-600/40 hover:shadow-lg group ${
              !isExpanded 
                ? "justify-center p-2 rounded-xl mx-1 mb-2"
                : "gap-3 p-4 rounded-xl hover:bg-gray-700/30"
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
                !isExpanded ? "h-8 w-8 lg:h-9 lg:w-9" : "h-8 w-8 lg:h-9 lg:w-9"
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
            
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden ml-3">
              <span className="truncate font-medium text-white text-xs lg:text-sm">
                {displayName}
              </span>
              {listener.isCreator && (
                <span className="text-xs text-yellow-400 bg-yellow-900/20 px-1.5 lg:px-2 py-0.5 rounded-full font-medium w-fit border border-yellow-700/20 mt-1">
                   Creator
                </span>
              )}
            </div>
          </motion.div>
        </SidebarMenuItem>
      </motion.div>
    );
  });

  // Kick Zone Component
  const KickZone: React.FC<{ isOverKickZone: boolean }> = ({ isOverKickZone }) => {
    const { setNodeRef } = useDroppable({
      id: 'kick-zone',
    });

    return (
      <motion.div
        ref={setNodeRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: isOverKickZone ? 1.05 : 1
        }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "p-4 m-2 border-2 border-dashed rounded-lg transition-all duration-200 select-none",
          isOverKickZone
            ? "border-red-500 bg-red-500/20 text-red-300 shadow-lg shadow-red-500/20"
            : "border-gray-600 bg-gray-800/30 text-gray-400 hover:border-gray-500 hover:bg-gray-700/30"
        )}
      >
        <div className="flex items-center justify-center space-x-2 text-sm font-medium">
          <motion.div
            animate={{ 
              rotate: isOverKickZone ? [0, -10, 10, -10, 0] : 0,
              scale: isOverKickZone ? 1.1 : 1
            }}
            transition={{ duration: 0.3 }}
          >
            <Trash2 className={cn(
              "w-4 h-4",
              isOverKickZone ? "text-red-400" : "text-gray-400"
            )} />
          </motion.div>
          <span className={cn(
            "font-medium",
            isOverKickZone ? "text-red-300" : "text-gray-400"
          )}>
            {isOverKickZone
              ? "Release to remove from room"
              : "Drop here to remove listener"
            }
          </span>
        </div>
      </motion.div>
    );
  };

  const listenersContent = useMemo(() => {
    if (listenersCount === 0) {
      return emptyListenersContent;
    }

    return (
      <>
        {uniqueListeners.map((listener, index) => (
          <ListenerItem
            key={listener.userId}
            listener={listener}
            index={index}
          />
        ))}
      </>
    );
  }, [uniqueListeners, listenersCount, emptyListenersContent]);

  const sidebarContent = useMemo(() => (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className={!isExpanded ? "pt-3 px-2" : "p-4 space-y-2"}
      >
        <SidebarMenu className={!isExpanded ? "space-y-1" : "space-y-2"}>
          {listenersContent}
        </SidebarMenu>
        
        {/* Kick Zone - Only visible to admin during drag */}
        {isAdmin && activeId && draggedListener && !draggedListener.isCreator && (
          <KickZone isOverKickZone={isOverKickZone} />
        )}
      </motion.div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && draggedListener ? (
          <div className="bg-[#1C1E1F] border border-red-500 rounded-xl p-3 shadow-xl opacity-90">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                {draggedListener.imageUrl && (
                  <AvatarImage
                    src={draggedListener.imageUrl}
                    alt={draggedListener.name || draggedListener.userId}
                  />
                )}
                <AvatarFallback className="bg-gradient-to-br from-red-600 to-red-800 text-white">
                  {draggedListener.name
                    ? draggedListener.name.charAt(0).toUpperCase()
                    : draggedListener.userId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-medium">
                {draggedListener.name || `User ${draggedListener.userId.slice(0, 8)}`}
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  ), [isExpanded, listenersContent, sensors, handleDragStart, handleDragEnd, handleDragOver, isAdmin, activeId, draggedListener, isOverKickZone]);

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-50 lg:relative lg:left-auto lg:top-auto lg:bottom-auto"
      style={{ 
        padding: '5px',
        pointerEvents: isExpanded ? 'auto' : 'none'
      }}
    >
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: sidebarWidth }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="h-full lg:h-auto"
        style={{ 
          width: `${sidebarWidth}px`, 
          minWidth: `${sidebarWidth}px`, 
          maxWidth: `${sidebarWidth}px`
        }}
      >
        <Sidebar
          side="left"
          className="dark bg-transparent text-white border-none h-full lg:h-auto transition-all duration-500 ease-out overflow-hidden"
          collapsible="icon"
          style={{ width: `${sidebarWidth}px` }}
        >
          <SidebarHeader className={`flex p-3 sm:p-4 relative bg-[#1C1E1F] backdrop-blur-md rounded-t-2xl border-b border-[#424244]/50 shadow-lg min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] ${isExpanded ? 'flex-row items-center justify-between' : 'flex-col gap-2 items-center justify-center'}`}>
            {isExpanded && (
              <div className="flex-1 flex items-center h-full">
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
                        className="text-lg lg:text-xl font-bold text-white tracking-tight"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                      >
                        Listeners
                      </motion.h2>
                     
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <motion.div 
              className="z-10 flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SidebarTrigger className="transition-all duration-300 hover:bg-gray-700/50 rounded-xl p-1.5 lg:p-2 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center backdrop-blur-sm border border-gray-600/20 hover:border-gray-500/40 shadow-sm hover:shadow-md" />
            </motion.div>
            
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
          
          <SidebarContent className="bg-[#101010] backdrop-blur-md rounded-b-2xl overflow-hidden shadow-lg lg:max-h-none sm:max-h-[70vh] md:max-h-[75vh] max-h-[60vh] flex flex-col">
            {sidebarContent}
          </SidebarContent>
        </Sidebar>
      </motion.div>
    </div>
  );
};

export default ListenerSidebar;