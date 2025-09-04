'use client';

import { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/app/hooks/use-mobile';
import ListenerSidebar from '@/app/components/ListenerSidebar';
import { SidebarProvider } from '@/app/components/ui/sidebar';
import { Button } from '@/app/components/ui/button';
import { Menu } from 'lucide-react';
import DarkGradientBackground from './Background';
import { DiscordPresence } from './DiscordPresence';
import { ElectronDetector } from './ElectronDetector';

interface MusicRoomLayoutProps {
  children: React.ReactNode;
  userDetails?: any[];
  connectedUsers?: number;
  showSidebar?: boolean;
  isAdmin?: boolean;
  onKickListener?: (userId: string) => void;
}

export default function MusicRoomLayout({ 
  children, 
  userDetails = [], 
  connectedUsers = 0, 
  showSidebar = true,
  isAdmin = false,
  onKickListener
}: MusicRoomLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(90); // Default collapsed width
  const isMobile = useIsMobile();

  // Generate listeners data for the sidebar
  const listeners = useMemo(() => {
    console.log('Raw userDetails:', userDetails);
    
    // If we have actual user details, use them
    if (userDetails && userDetails.length > 0) {
      const mapped = userDetails.map((user, index) => ({
        userId: user.userId || user.id || user._id || `user-${index}`,
        isCreator: user.isCreator || user.isAdmin || user.role === 'admin' || user.role === 'creator' || false,
        name: user.name || user.username || user.displayName || user.userName || null,
        imageUrl: user.imageUrl || user.image || user.pfpUrl || user.profilePicture || user.avatar || null
      }));
      
      console.log('Mapped listeners:', mapped);
      return mapped;
    }

    // Fallback: create placeholder users based on connected count
    if (connectedUsers > 0) {
      return Array.from({ length: connectedUsers }, (_, i) => ({
        userId: `user-${i}`,
        isCreator: i === 0,
        name: i === 0 ? 'Room Creator' : `Listener ${i + 1}`,
        imageUrl: null
      }));
    }

    // No users at all
    return [];
  }, [userDetails, connectedUsers]);

  // Listen for sidebar width changes
  useEffect(() => {
    const handleSidebarResize = (event: CustomEvent) => {
      setSidebarWidth(event.detail.width);
    };

    window.addEventListener('sidebar-resize' as any, handleSidebarResize);
    return () => window.removeEventListener('sidebar-resize' as any, handleSidebarResize);
  }, []);

  return (
    <DarkGradientBackground>
      <div className="h-screen w-screen text-white overflow-hidden">
        <DiscordPresence />
        <ElectronDetector />
        
        <div className="flex h-full w-full">
          {/* Sidebar - Fixed on desktop, slide-in on mobile */}
          {showSidebar && !isMobile && (
            <div 
              className="fixed inset-y-0 left-0 z-50 flex-shrink-0 transition-all duration-300 h-full"
              style={{ width: `${sidebarWidth}px` }}
            >
              <SidebarProvider defaultOpen={false}>
                <ListenerSidebar 
                  listeners={listeners} 
                  isAdmin={isAdmin}
                  onKickListener={onKickListener}
                />
              </SidebarProvider>
            </div>
          )}

          {/* Mobile Sidebar Overlay */}
          {showSidebar && isMobile && sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div 
                className="fixed inset-0 bg-black/50" 
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 w-64 bg-black/90 backdrop-blur-xl h-full">
                <SidebarProvider defaultOpen={true}>
                  <ListenerSidebar 
                    listeners={listeners} 
                    isAdmin={isAdmin}
                    onKickListener={onKickListener}
                  />
                </SidebarProvider>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main 
            className="flex-1 min-w-0 h-full w-full overflow-hidden transition-all duration-300"
            style={{ 
              marginLeft: showSidebar && !isMobile ? `${sidebarWidth}px` : '0px' 
            }}
          >
            {/* Mobile menu button */}
            {showSidebar && isMobile && (
              <div className="lg:hidden sticky top-0 z-40 bg-black/20 backdrop-blur-xl border-b border-white/10 flex-shrink-0">
                <div className="hidden lg:flex items-center justify-between h-12 px-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open sidebar</span>
                  </Button>
                  <div className="text-sm font-medium text-white/80">Music Room</div>
                  <div className="w-10"></div> {/* Spacer for centering */}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden h-full w-full min-h-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DarkGradientBackground>
  );
}

// Layout wrapper for music room pages
export function MusicRoomLayoutWrapper({ 
  children, 
  userDetails, 
  connectedUsers 
}: { 
  children: React.ReactNode;
  userDetails?: any[];
  connectedUsers?: number;
}) {
  return (
    <MusicRoomLayout 
      showSidebar={true}
      userDetails={userDetails}
      connectedUsers={connectedUsers}
    >
      {children}
    </MusicRoomLayout>
  );
}
