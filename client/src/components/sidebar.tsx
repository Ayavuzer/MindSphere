import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { TenantSwitcher } from '@/components/tenant/tenant-switcher';
import { UserProfileDropdown } from '@/components/user-profile-dropdown';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  MessageSquare, 
  LayoutDashboard, 
  Calendar, 
  CheckSquare, 
  BarChart3, 
  Heart, 
  Wallet, 
  Mail, 
  Home,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps = {}) {
  const { user } = useAuth();
  const [location] = useLocation();

  const navigationItems = [
    { path: '/', icon: MessageSquare, label: 'Chat Assistant', active: location === '/' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', active: location === '/dashboard' },
    { path: '/calendar', icon: Calendar, label: 'Calendar', active: location === '/calendar' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks', active: location === '/tasks' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', active: location === '/analytics' },
  ];

  const lifeModules = [
    { path: '/health', icon: Heart, label: 'Health', active: location === '/health' },
    { path: '/finance', icon: Wallet, label: 'Finance', active: location === '/finance' },
    { path: '/journal', icon: BookOpen, label: 'Journal', active: location === '/journal' },
    { path: '/communications', icon: Mail, label: 'Communications', active: location === '/communications' },
    { path: '/smart-home', icon: Home, label: 'Smart Home', active: location === '/smart-home' },
  ];

  return (
    <div className="w-64 bg-[var(--card-dark)] border-r border-gray-800 flex flex-col">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">MindSphere</h1>
            <p className="text-sm text-[var(--text-secondary)]">AI Personal Assistant</p>
          </div>
        </div>
      </div>

      {/* Tenant Switcher */}
      <div className="p-4 border-b border-gray-800">
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-secondary)] mb-2 px-1">WORKSPACE</p>
          <TenantSwitcher />
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          {navigationItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button 
                variant={item.active ? "default" : "ghost"}
                className={`w-full justify-start sidebar-nav-item ${
                  item.active ? 'active' : ''
                }`}
                onClick={() => onClose?.()}
              >
                <item.icon size={20} className="mr-3" />
                {item.label}
              </Button>
            </Link>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-4 mt-4">
          <p className="text-xs text-[var(--text-secondary)] mb-2 px-3">LIFE MODULES</p>
          <div className="space-y-1">
            {lifeModules.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button 
                  variant={item.active ? "default" : "ghost"}
                  className={`w-full justify-start sidebar-nav-item ${
                    item.active ? 'active' : ''
                  }`}
                  onClick={() => onClose?.()}
                >
                  <item.icon size={20} className="mr-3" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <UserProfileDropdown size="md" showLabel={true} />
      </div>
    </div>
  );
}
