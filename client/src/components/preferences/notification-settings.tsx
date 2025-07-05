import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  Bell,
  Save,
  Calendar,
  Heart,
  DollarSign,
  BookOpen
} from 'lucide-react';

const notificationSettingsSchema = z.object({
  notifications: z.object({
    tasks: z.boolean().default(true),
    health: z.boolean().default(true),
    finance: z.boolean().default(true),
    journal: z.boolean().default(true),
  }).default({}),
});

type NotificationSettingsForm = z.infer<typeof notificationSettingsSchema>;

const notificationTypes = [
  {
    key: 'tasks' as const,
    icon: <Calendar className="h-4 w-4" />,
    title: 'Task Reminders',
    description: 'Get notified about upcoming tasks and deadlines',
    color: 'text-blue-600'
  },
  {
    key: 'health' as const,
    icon: <Heart className="h-4 w-4" />,
    title: 'Health Check-ins',
    description: 'Reminders to log health data and activities',
    color: 'text-red-600'
  },
  {
    key: 'finance' as const,
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Financial Updates',
    description: 'Budget alerts and financial insights',
    color: 'text-green-600'
  },
  {
    key: 'journal' as const,
    icon: <BookOpen className="h-4 w-4" />,
    title: 'Journal Prompts',
    description: 'Daily reminders to write in your journal',
    color: 'text-purple-600'
  },
];

export function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['/api/preferences'],
  });

  const form = useForm<NotificationSettingsForm>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      notifications: {
        tasks: true,
        health: true,
        finance: true,
        journal: true,
      },
    },
  });

  // Update form with fetched preferences
  React.useEffect(() => {
    if (preferences) {
      form.reset({
        notifications: {
          tasks: preferences.notifications?.tasks ?? true,
          health: preferences.notifications?.health ?? true,
          finance: preferences.notifications?.finance ?? true,
          journal: preferences.notifications?.journal ?? true,
        },
      });
    }
  }, [preferences, form]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: NotificationSettingsForm) => {
      const response = await apiRequest('POST', '/api/preferences', {
        ...preferences,
        ...data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      toast({
        title: "Notifications updated",
        description: "Your notification preferences have been saved successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) return;
      toast({
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NotificationSettingsForm) => {
    updatePreferencesMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-300 rounded"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Notification Settings</h2>
          <p className="text-gray-600 mt-1">
            Choose which notifications you'd like to receive
          </p>
        </div>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              App Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {notificationTypes.map((notificationType) => (
              <FormField
                key={notificationType.key}
                control={form.control}
                name={`notifications.${notificationType.key}`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <span className={notificationType.color}>
                          {notificationType.icon}
                        </span>
                        {notificationType.title}
                      </FormLabel>
                      <div className="text-sm text-gray-600">
                        {notificationType.description}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* Email Notifications (Future) */}
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <Bell className="h-5 w-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-600">Coming Soon</h3>
              <p className="text-gray-500">
                Email notification preferences will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications (Future) */}
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8">
              <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-600">Coming Soon</h3>
              <p className="text-gray-500">
                Browser push notifications will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={updatePreferencesMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Notifications'}
          </Button>
        </div>
      </form>
    </Form>
  );
}