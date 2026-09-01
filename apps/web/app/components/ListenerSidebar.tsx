"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
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
import { Trash2, Users, Crown, Headphones, Wifi } from "lucide-react";
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

// Generate a consistent color from userId for fallback avatars
const getUserColor = (userId: string) => {
  const colors = [
    "from-violet-600 to-indigo-600",
    "from-rose-600 to-pink-600",
    "from-amber-600 to-orange-600",
    "from-emerald-600 to-teal-600",
    "from-sky-600 to-blue-600",
    "from-fuchsia-600 to-purple-600",
    "from-lime-600 to-green-600",
    "from-cyan-600 to-sky-600",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const ListenerSidebar: React.FC<ListenerSidebarProps> = ({
  listeners,
  isAdmin = false,
  onKickListener
}) => {
  const { state } = useSidebar();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedListener, setDraggedListener] = useState<UserDetail | null>(null);
  const [isOverKickZone, setIsOverKickZone] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const uniqueListeners = useMemo(() => {
    const seen = new Set();
    return listeners.filter(listener => {
      if (seen.has(listener.userId)) return false;
      seen.add(listener.userId);
      return true;
    });
  }, [listeners]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (!isAdmin) return;
    const { active } = event;
    setActiveId(active.id as string);
    const listener = uniqueListeners.find(l => l.userId === active.id);
    if (listener && !listener.isCreator) {
      setDraggedListener(listener);
    } else {
      setActiveId(null);
      setDraggedListener(null);
    }
  }, [isAdmin, uniqueListeners]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { over } = event;
    if (over?.id === 'kick-zone' && draggedListener && !draggedListener.isCreator && onKickListener) {
      onKickListener(draggedListener.userId);
    }
    setActiveId(null);
    setDraggedListener(null);
    setIsOverKickZone(false);
  }, [isAdmin, onKickListener, draggedListener]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setIsOverKickZone(event.over?.id === 'kick-zone');
  }, []);

  const isExpanded = state === "expanded";
  const sidebarWidth = isExpanded ? 280 : 76;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar-resize', { detail: { width: sidebarWidth } }));
  }, [sidebarWidth]);

  const listenersCount = uniqueListeners.length;

  // --- Listener Item ---
  const ListenerItem = React.memo(({ listener, index }: { listener: UserDetail; index: number }) => {
    const initial = listener.name?.charAt(0).toUpperCase() || listener.userId.slice(0, 1).toUpperCase();
    const displayName = listener.name || `User ${listener.userId.slice(0, 6)}`;
    const canDrag = isAdmin && !listener.isCreator;
    const gradientColor = getUserColor(listener.userId);

    const { attributes, listeners: dndListeners, setNodeRef, transform, isDragging } = useDraggable({ id: listener.userId });

    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isDragging ? 0.4 : 1,
    };

    if (!isExpanded) {
      // Collapsed — bigger avatar, tooltip-style
      return (
        <motion.div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...(canDrag ? dndListeners : {})}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 20 }}
          className="flex justify-center py-1.5"
        >
          <div className={cn("relative group", canDrag && "cursor-grab active:cursor-grabbing")}>
            <Avatar className={cn(
              "h-11 w-11 transition-transform duration-200 group-hover:scale-110",
              listener.isCreator && "ring-2 ring-electric-cyan/60"
            )}>
              {listener.imageUrl && listener.imageUrl.length > 0 && (
                <AvatarImage src={listener.imageUrl} alt={displayName} className="object-cover" referrerPolicy="no-referrer" />
              )}
              <AvatarFallback className={cn("bg-gradient-to-br text-paper-white font-satoshi font-bold text-sm", gradientColor)}>
                {initial}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-void-black" />
            {/* Creator crown */}
            {listener.isCreator && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-electric-cyan rounded-full flex items-center justify-center">
                <Crown className="w-2.5 h-2.5 text-void-black" />
              </span>
            )}
            {/* Hover tooltip */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-midnight-surface border border-graphite/50 rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              <span className="font-satoshi text-xs text-paper-white">{displayName}</span>
            </div>
          </div>
        </motion.div>
      );
    }

    // Expanded — premium card row
    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...(canDrag ? dndListeners : {})}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          "group relative",
          isDragging && "z-50",
          canDrag && "cursor-grab active:cursor-grabbing"
        )}
      >
        <div className={cn(
          "flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-200",
          "bg-paper-white/[0.02] hover:bg-paper-white/[0.06]",
          "border border-transparent hover:border-paper-white/[0.06]",
          listener.isCreator && "bg-electric-cyan/[0.04] border-electric-cyan/[0.08]",
          isDragging && "ring-1 ring-red-500/40 bg-red-500/[0.04]"
        )}>
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className={cn(
              "h-10 w-10 transition-transform duration-200 group-hover:scale-105",
              listener.isCreator && "ring-2 ring-electric-cyan/50"
            )}>
              {listener.imageUrl && listener.imageUrl.length > 0 && (
                <AvatarImage src={listener.imageUrl} alt={displayName} className="object-cover" referrerPolicy="no-referrer" />
              )}
              <AvatarFallback className={cn("bg-gradient-to-br text-paper-white font-satoshi font-bold text-base", gradientColor)}>
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-midnight-surface" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-satoshi font-medium text-sm text-paper-white truncate">{displayName}</span>
              {listener.isCreator && (
                <span className="flex items-center gap-1 bg-electric-cyan/15 text-electric-cyan font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Crown className="w-2.5 h-2.5" />
                  Host
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Wifi className="w-2.5 h-2.5 text-green-500" />
              <span className="font-mono text-[10px] text-steel-gray">
                {listener.isCreator ? "Connected · Hosting" : "Connected · Listening"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  });

  // --- Kick Zone ---
  const KickZone: React.FC<{ isOver: boolean }> = ({ isOver }) => {
    const { setNodeRef } = useDroppable({ id: 'kick-zone' });
    return (
      <motion.div
        ref={setNodeRef}
        initial={{ opacity: 0, height: 0, marginTop: 0 }}
        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
        exit={{ opacity: 0, height: 0, marginTop: 0 }}
        className={cn(
          "mx-2 p-4 border-2 border-dashed rounded-2xl text-center transition-all duration-200",
          isOver
            ? "border-red-500/50 bg-red-500/10"
            : "border-graphite/50 bg-paper-white/[0.02]"
        )}
      >
        <Trash2 className={cn("w-5 h-5 mx-auto mb-1.5", isOver ? "text-red-400" : "text-steel-gray/40")} />
        <span className={cn("font-mono text-[10px]", isOver ? "text-red-400" : "text-steel-gray/40")}>
          {isOver ? "Release to remove" : "Drop to kick"}
        </span>
      </motion.div>
    );
  };

  return (
    <div
      className="fixed left-0 top-0 bottom-0 z-50 lg:relative lg:left-auto lg:top-auto lg:bottom-auto"
      style={{ padding: '5px', pointerEvents: isExpanded ? 'auto' : 'none' }}
    >
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1, width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="h-full lg:h-auto"
        style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
      >
        <Sidebar
          side="left"
          className="dark bg-transparent text-paper-white border-none h-full lg:h-auto transition-all duration-300 overflow-hidden"
          collapsible="icon"
          style={{ width: sidebarWidth }}
        >
          {/* Header */}
          <SidebarHeader className={cn(
            "flex relative bg-midnight-surface/80 backdrop-blur-sm rounded-t-2xl border-b border-paper-white/[0.05]",
            isExpanded ? "flex-row items-center justify-between p-4" : "flex-col items-center justify-center p-3 gap-2"
          )}>
            {isExpanded ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-paper-white/[0.06] flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-paper-white" />
                </div>
                <div>
                  <h2 className="font-satoshi font-bold text-sm text-paper-white leading-tight">Listeners</h2>
                  <span className="font-mono text-[10px] text-steel-gray">{listenersCount} connected</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-xl bg-paper-white/[0.06] flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-paper-white" />
                </div>
                <span className="font-mono text-[10px] text-electric-cyan font-bold">{listenersCount}</span>
              </div>
            )}

            <SidebarTrigger className="hover:bg-paper-white/[0.06] rounded-xl p-1.5 w-7 h-7 flex items-center justify-center transition-colors flex-shrink-0 text-steel-gray hover:text-paper-white" />
          </SidebarHeader>

          {/* Content */}
          <SidebarContent className="bg-midnight-surface/80 backdrop-blur-sm rounded-b-2xl overflow-hidden lg:max-h-none sm:max-h-[70vh] md:max-h-[75vh] max-h-[60vh] flex flex-col">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
            >
              <div className={cn(
                "flex-1 overflow-y-auto hide-scrollbar",
                isExpanded ? "p-2.5 space-y-1" : "py-3 px-1.5 space-y-1"
              )}>
                <SidebarMenu className="space-y-0">
                  {listenersCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4">
                      {isExpanded ? (
                        <>
                          <div className="w-14 h-14 rounded-2xl bg-paper-white/[0.04] border border-paper-white/[0.06] flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-steel-gray/50" />
                          </div>
                          <p className="font-satoshi font-medium text-sm text-ghost-gray mb-1">No one here yet</p>
                          <p className="font-mono text-[10px] text-steel-gray text-center leading-relaxed">Share the space link<br />to invite friends</p>
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-paper-white/[0.04] flex items-center justify-center">
                          <Users className="w-4 h-4 text-steel-gray/30" />
                        </div>
                      )}
                    </div>
                  ) : (
                    uniqueListeners.map((listener, index) => (
                      <SidebarMenuItem key={listener.userId}>
                        <ListenerItem listener={listener} index={index} />
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>

                <AnimatePresence>
                  {isAdmin && activeId && draggedListener && !draggedListener.isCreator && (
                    <KickZone isOver={isOverKickZone} />
                  )}
                </AnimatePresence>
              </div>

              <DragOverlay>
                {activeId && draggedListener ? (
                  <div className="bg-midnight-surface/95 backdrop-blur-sm border border-red-500/30 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
                    <Avatar className="h-9 w-9">
                      {draggedListener.imageUrl && draggedListener.imageUrl.length > 0 && (
                        <AvatarImage src={draggedListener.imageUrl} className="object-cover" referrerPolicy="no-referrer" />
                      )}
                      <AvatarFallback className={cn("bg-gradient-to-br text-paper-white font-satoshi font-bold", getUserColor(draggedListener.userId))}>
                        {draggedListener.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-satoshi text-sm text-paper-white font-medium">
                        {draggedListener.name || `User ${draggedListener.userId.slice(0, 6)}`}
                      </span>
                      <span className="block font-mono text-[9px] text-red-400">Removing...</span>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </SidebarContent>
        </Sidebar>
      </motion.div>
    </div>
  );
};

export default React.memo(ListenerSidebar);
