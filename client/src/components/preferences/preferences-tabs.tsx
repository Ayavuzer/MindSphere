import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettings } from './general-settings';
import { AIProviderSettings } from './ai-provider-settings';
import { NotificationSettings } from './notification-settings';
import { TenantManagement } from './tenant-management';
import { 
  Settings, 
  Bot, 
  Bell,
  User,
  Palette,
  Building2
} from 'lucide-react';

export function PreferencesTabs() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-8">
          <TabsTrigger value="general" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="workspaces" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Workspaces</span>
            <span className="sm:hidden">Work</span>
          </TabsTrigger>
          <TabsTrigger value="ai-providers" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>AI</span>
            <span className="hidden sm:inline">Providers</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Notif</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Appearance</span>
            <span className="sm:hidden">Theme</span>
          </TabsTrigger>
        </TabsList>

        <div className="w-full">
          <TabsContent value="general" className="space-y-6">
            <GeneralSettings />
          </TabsContent>

          <TabsContent value="workspaces" className="space-y-6 pb-8">
            <TenantManagement />
          </TabsContent>

          <TabsContent value="ai-providers" className="space-y-6 pb-8">
            <AIProviderSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6 min-h-[400px]">
            <div className="text-center p-8">
              <Palette className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Appearance Settings</h3>
              <p className="text-gray-600">Theme and visual customization options coming soon.</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}