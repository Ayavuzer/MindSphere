import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  BookOpen, 
  Plus, 
  Calendar,
  Brain,
  Lightbulb,
  Smile,
  Meh,
  Frown,
  Heart,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

const journalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  mood: z.number().min(1).max(10),
  date: z.string().min(1, 'Date is required'),
});

type JournalForm = z.infer<typeof journalSchema>;

const moodIcons = {
  1: Frown, 2: Frown, 3: Frown,
  4: Meh, 5: Meh, 6: Meh,
  7: Smile, 8: Smile, 9: Smile, 10: Heart
};

const moodColors = {
  1: 'bg-red-100 text-red-800', 2: 'bg-red-100 text-red-800', 3: 'bg-orange-100 text-orange-800',
  4: 'bg-yellow-100 text-yellow-800', 5: 'bg-yellow-100 text-yellow-800', 6: 'bg-blue-100 text-blue-800',
  7: 'bg-green-100 text-green-800', 8: 'bg-green-100 text-green-800', 9: 'bg-emerald-100 text-emerald-800', 10: 'bg-pink-100 text-pink-800'
};

export default function Journal() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<JournalForm>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      title: '',
      content: '',
      mood: 5,
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  // Fetch journal entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['/api/journal'],
    select: (data) => data?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  });

  // Create journal entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: JournalForm) => {
      const response = await apiRequest('POST', '/api/journal', {
        ...data,
        mood: Number(data.mood),
        date: new Date(data.date),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal'] });
      setIsDialogOpen(false);
      form.reset({
        title: '',
        content: '',
        mood: 5,
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      toast({
        title: "Journal entry created",
        description: "Your thoughts have been saved with AI insights.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) return;
      toast({
        title: "Error",
        description: "Failed to create journal entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JournalForm) => {
    createEntryMutation.mutate(data);
  };

  const getMoodIcon = (mood: number) => {
    const IconComponent = moodIcons[mood as keyof typeof moodIcons];
    return <IconComponent className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 rounded w-1/4"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
            <div className="h-32 bg-gray-300 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              Journal
            </h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">
              Reflect on your thoughts and get AI-powered insights
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Journal Entry</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="What's on your mind today?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Write your thoughts, experiences, and reflections..."
                            className="min-h-[150px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mood (1-10)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input 
                              type="range" 
                              min="1" 
                              max="10" 
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>1 (Very Low)</span>
                              <span className="font-medium">Current: {field.value}</span>
                              <span>10 (Excellent)</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createEntryMutation.isPending}
                    >
                      {createEntryMutation.isPending ? 'Creating...' : 'Create Entry'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Entries List */}
        {entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries yet</h3>
              <p className="text-gray-600 text-center mb-6">
                Start documenting your thoughts and experiences to get AI-powered insights.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Write Your First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {entries.map((entry: any) => (
              <Card key={entry.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{entry.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(entry.date), 'PPP')}
                        </div>
                        {entry.mood && (
                          <Badge className={moodColors[entry.mood as keyof typeof moodColors]}>
                            {getMoodIcon(entry.mood)}
                            <span className="ml-1">Mood: {entry.mood}/10</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700">{entry.content}</p>
                  </div>
                  
                  {entry.aiInsights && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">AI Insights</span>
                      </div>
                      <p className="text-blue-700 text-sm whitespace-pre-wrap">
                        {entry.aiInsights}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}