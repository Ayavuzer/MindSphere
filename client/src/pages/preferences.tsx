import { Layout } from '@/components/layout';
import { PreferencesTabs } from '@/components/preferences/preferences-tabs';
import { ProviderProvider } from '@/contexts/ProviderContext';
import { 
  Settings
} from 'lucide-react';

export default function Preferences() {
  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        <div className="bg-gray-50/50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-6 py-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                  <p className="text-gray-600 mt-1">
                    Customize your MindSphere experience
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-16">
            <ProviderProvider>
              <PreferencesTabs />
            </ProviderProvider>
          </div>
        </div>
      </div>
    </Layout>
  );
}