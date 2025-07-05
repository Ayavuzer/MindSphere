import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  Palette, 
  Volume2, 
  Brain, 
  Globe, 
  Clock,
  Save
} from 'lucide-react';

const generalSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('dark'),
  voiceEnabled: z.boolean().default(true),
  aiPersonality: z.enum(['helpful', 'creative', 'analytical', 'friendly']).default('helpful'),
  timezone: z.string().default('UTC'),
  language: z.enum(['en', 'tr', 'es', 'fr', 'de']).default('en'),
});

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>;

const timeZones = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/Istanbul', label: 'Istanbul (GMT+3)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
];

const aiPersonalities = [
  { value: 'helpful', label: 'Helpful', description: 'Focus on providing practical assistance' },
  { value: 'creative', label: 'Creative', description: 'Encourage innovative thinking and ideas' },
  { value: 'analytical', label: 'Analytical', description: 'Provide detailed analysis and insights' },
  { value: 'friendly', label: 'Friendly', description: 'Conversational and supportive approach' },
];

export function GeneralSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['/api/preferences'],
  });

  const form = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      theme: 'dark',
      voiceEnabled: true,
      aiPersonality: 'helpful',
      timezone: 'UTC',
      language: 'en',
    },
  });

  // Update form with fetched preferences
  React.useEffect(() => {
    if (preferences) {
      form.reset({
        theme: preferences.theme || 'dark',
        voiceEnabled: preferences.voiceEnabled ?? true,
        aiPersonality: preferences.aiPersonality || 'helpful',
        timezone: preferences.timezone || 'UTC',
        language: preferences.language || 'en',
      });
    }
  }, [preferences, form]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: GeneralSettingsForm) => {
      const response = await apiRequest('POST', '/api/preferences', {
        ...data,
        notifications: preferences?.notifications || {}
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      toast({
        title: "Settings updated",
        description: "Your general settings have been saved successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) return;
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GeneralSettingsForm) => {
    updatePreferencesMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-300 rounded"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeZones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* AI Assistant Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="aiPersonality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Personality</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI personality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {aiPersonalities.map((personality) => (
                        <SelectItem key={personality.value} value={personality.value}>
                          <div>
                            <div className="font-medium">{personality.label}</div>
                            <div className="text-sm text-gray-500">{personality.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="voiceEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Voice Features
                    </FormLabel>
                    <div className="text-sm text-gray-600">
                      Enable voice recognition and text-to-speech
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
            {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </Form>
  );
}