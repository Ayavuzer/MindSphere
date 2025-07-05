import { ReactNode, useState } from 'react';
import { Sidebar } from './sidebar';
import { RightSidebar } from './right-sidebar';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  showRightSidebar?: boolean;
}

export function Layout({ children, showRightSidebar = true }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--deep-dark)]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform lg:relative lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden bg-[var(--card-dark)] border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="text-white"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-white">MindSphere</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {children}
      </div>

      {/* Right Sidebar - Hidden on mobile */}
      {showRightSidebar && (
        <div className="hidden xl:block">
          <RightSidebar />
        </div>
      )}
    </div>
  );
}
