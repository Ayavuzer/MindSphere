import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { RightSidebar } from './right-sidebar';

interface LayoutProps {
  children: ReactNode;
  showRightSidebar?: boolean;
}

export function Layout({ children, showRightSidebar = true }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--deep-dark)]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      {showRightSidebar && <RightSidebar />}
    </div>
  );
}
