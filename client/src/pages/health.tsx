import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  Heart, 
  Plus, 
  Activity, 
  Moon, 
  Scale, 
  Footprints,
  Brain,
  TrendingUp,
  Calendar
} from 'lucide-react';

const healthSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  sleepHours: z.number().min(0).max(24).optional(),
  steps: z.number().min(0).optional(),
  weight: z.number().min(0).optional(),
  mood: z.number().min(1).max(10),
  energy: z.number().min(1).max(10),
  notes: z.string().optional(),
});

type HealthForm = z.infer<typeof healthSchema>;

export default function Health() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: healthEntries = [], isLoading } = useQuery({
    queryKey: ['/api/health'],
  });

  const { data: insights } = useQuery({
    queryKey: ['/api/analytics/insights', 'health'],
    queryFn: () => fetch('/api/analytics/insights?type=health').then(res => res.json()),
  });

  const form = useForm<HealthForm>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      mood: 5,
      energy: 5,
      notes: '',
    },
  });

  const createHealthEntryMutation = useMutation({
    mutationFn: async (data: HealthForm) => {
      const entryData = {
        ...data,
        date: new Date(data.date),
      };
      const response = await apiRequest('POST', '/api/health', entryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/health'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/insights', 'health'] });
      setIsDialogOpen(false);
      form.reset({
        date: new Date().toISOString().split('T')[0],
        mood: 5,
        energy: 5,
        notes: '',
      });
      toast({
        title: "Health entry created",
        description: "Your health data has been recorded successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create health entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HealthForm) => {
    createHealthEntryMutation.mutate(data);
  };

  const latestEntry = healthEntries[0];
  const averages = healthEntries.length > 0 ? {
    sleep: healthEntries.reduce((sum: number, entry: any) => sum + (entry.sleepHours || 0), 0) / healthEntries.length,
    steps: healthEntries.reduce((sum: number, entry: any) => sum + (entry.steps || 0), 0) / healthEntries.length,
    mood: healthEntries.reduce((sum: number, entry: any) => sum + entry.mood, 0) / healthEntries.length,
    energy: healthEntries.reduce((sum: number, entry: any) => sum + entry.energy, 0) / healthEntries.length,
  } : { sleep: 0, steps: 0, mood: 0, energy: 0 };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--card-dark)] border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Health Tracking</h1>
              <p className="text-[var(--text-secondary)]">Monitor your wellness and lifestyle</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-red-500 to-pink-600">
                  <Plus className="mr-2" size={16} />
                  Log Health Data
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[var(--card-dark)] border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Log Health Entry</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Date</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date"
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sleepHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Sleep Hours</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                placeholder="8"
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                className="bg-gray-800 border-gray-700 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="steps"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Steps</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="0"
                                placeholder="10000"
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="bg-gray-800 border-gray-700 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Weight (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="70"
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Mood (1-10)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="1"
                                max="10"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                className="bg-gray-800 border-gray-700 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="energy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Energy (1-10)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="1"
                                max="10"
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                className="bg-gray-800 border-gray-700 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="How are you feeling today?"
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createHealthEntryMutation.isPending}>
                        {createHealthEntryMutation.isPending ? 'Saving...' : 'Save Entry'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Sleep</p>
                    <p className="text-2xl font-bold text-white">
                      {latestEntry?.sleepHours || 0}h
                    </p>
                  </div>
                  <Moon className="text-blue-400" size={32} />
                </div>
                <Progress value={(latestEntry?.sleepHours || 0) / 8 * 100} className="mt-2 h-2" />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Avg: {averages.sleep.toFixed(1)}h
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Steps</p>
                    <p className="text-2xl font-bold text-white">
                      {latestEntry?.steps ? (latestEntry.steps / 1000).toFixed(1) + 'k' : '0'}
                    </p>
                  </div>
                  <Footprints className="text-green-400" size={32} />
                </div>
                <Progress value={(latestEntry?.steps || 0) / 10000 * 100} className="mt-2 h-2" />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Goal: 10k steps
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Mood</p>
                    <p className="text-2xl font-bold text-white">
                      {latestEntry?.mood || 0}/10
                    </p>
                  </div>
                  <Heart className="text-pink-400" size={32} />
                </div>
                <Progress value={(latestEntry?.mood || 0) * 10} className="mt-2 h-2" />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Avg: {averages.mood.toFixed(1)}/10
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Energy</p>
                    <p className="text-2xl font-bold text-white">
                      {latestEntry?.energy || 0}/10
                    </p>
                  </div>
                  <Activity className="text-orange-400" size={32} />
                </div>
                <Progress value={(latestEntry?.energy || 0) * 10} className="mt-2 h-2" />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Avg: {averages.energy.toFixed(1)}/10
                </p>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card className="bg-[var(--card-dark)] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Brain className="text-purple-400" size={20} />
                <span>AI Health Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-[var(--text-secondary)]">
                  {insights?.insights || "Start tracking your health metrics to receive personalized AI insights about your wellness patterns and recommendations for improvement."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Entries */}
          <Card className="bg-[var(--card-dark)] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Calendar className="text-indigo-400" size={20} />
                <span>Recent Entries</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : healthEntries.length > 0 ? (
                <div className="space-y-3">
                  {healthEntries.slice(0, 7).map((entry: any) => (
                    <div key={entry.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {new Date(entry.date).toLocaleDateString()}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            {entry.sleepHours && (
                              <div className="flex items-center space-x-1">
                                <Moon className="text-blue-400" size={14} />
                                <span className="text-xs text-[var(--text-secondary)]">
                                  {entry.sleepHours}h sleep
                                </span>
                              </div>
                            )}
                            {entry.steps && (
                              <div className="flex items-center space-x-1">
                                <Footprints className="text-green-400" size={14} />
                                <span className="text-xs text-[var(--text-secondary)]">
                                  {entry.steps.toLocaleString()} steps
                                </span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Heart className="text-pink-400" size={14} />
                              <span className="text-xs text-[var(--text-secondary)]">
                                Mood: {entry.mood}/10
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Activity className="text-orange-400" size={14} />
                              <span className="text-xs text-[var(--text-secondary)]">
                                Energy: {entry.energy}/10
                              </span>
                            </div>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-[var(--text-secondary)] mt-2">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Heart className="mx-auto text-gray-400 mb-4" size={48} />
                  <h3 className="text-lg font-semibold text-white mb-2">No health data yet</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Start tracking your health metrics to see patterns and receive insights
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2" size={16} />
                    Log First Entry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
