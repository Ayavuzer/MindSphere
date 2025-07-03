import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  Flag, 
  Clock, 
  Filter,
  Edit,
  Trash2,
  Play,
  Pause,
  Check
} from 'lucide-react';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
});

type TaskForm = z.infer<typeof taskSchema>;

export default function Tasks() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['/api/tasks'],
  });

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskForm) => {
      const taskData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      };
      const response = await apiRequest('POST', '/api/tasks', taskData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Task created",
        description: "Your task has been created successfully.",
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
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
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
        description: "Failed to update task.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
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
        description: "Failed to delete task.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TaskForm) => {
    createTaskMutation.mutate(data);
  };

  const handleStatusUpdate = (id: string, status: string) => {
    updateTaskMutation.mutate({ id, updates: { status } });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  const filteredTasks = tasks.filter((task: any) => {
    const statusMatch = filter === 'all' || task.status === filter;
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="text-green-400" size={16} />;
      case 'in_progress': return <Play className="text-blue-400" size={16} />;
      case 'pending': return <Pause className="text-gray-400" size={16} />;
      default: return <Clock className="text-gray-400" size={16} />;
    }
  };

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter((t: any) => t.status === 'completed').length,
    inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
    pending: tasks.filter((t: any) => t.status === 'pending').length,
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--card-dark)] border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Tasks</h1>
              <p className="text-[var(--text-secondary)]">Manage your tasks and projects</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
                  <Plus className="mr-2" size={16} />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[var(--card-dark)] border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Task</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Title</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter task title"
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Enter task description"
                              className="bg-gray-800 border-gray-700 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-800 border-gray-700">
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Due Date</FormLabel>
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
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTaskMutation.isPending}>
                        {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="text-indigo-400" size={20} />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Total</p>
                    <p className="text-xl font-bold text-white">{taskStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Check className="text-green-400" size={20} />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Completed</p>
                    <p className="text-xl font-bold text-white">{taskStats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Play className="text-blue-400" size={20} />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">In Progress</p>
                    <p className="text-xl font-bold text-white">{taskStats.inProgress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="text-yellow-400" size={20} />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Pending</p>
                    <p className="text-xl font-bold text-white">{taskStats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-[var(--card-dark)] border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <Filter className="text-[var(--text-secondary)]" size={20} />
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-[var(--text-secondary)]">Status:</span>
                  <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                    <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-[var(--text-secondary)]">Priority:</span>
                  <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                    <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <Card className="bg-[var(--card-dark)] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">
                Tasks ({filteredTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredTasks.length > 0 ? (
                <div className="space-y-3">
                  {filteredTasks.map((task: any) => (
                    <div key={task.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={(checked) => 
                            handleStatusUpdate(task.id, checked ? 'completed' : 'pending')
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className={`text-sm font-medium ${
                                task.status === 'completed' ? 'line-through text-gray-400' : 'text-white'
                              }`}>
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-3 mt-2">
                                <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                  {task.priority}
                                </Badge>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(task.status)}
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    {task.status.replace('_', ' ')}
                                  </span>
                                </div>
                                {task.dueDate && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="text-[var(--text-secondary)]" size={12} />
                                    <span className="text-xs text-[var(--text-secondary)]">
                                      {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(
                                    task.id, 
                                    task.status === 'pending' ? 'in_progress' : 'completed'
                                  )}
                                >
                                  {task.status === 'pending' ? 'Start' : 'Complete'}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(task.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckSquare className="mx-auto text-gray-400 mb-4" size={48} />
                  <h3 className="text-lg font-semibold text-white mb-2">No tasks found</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    {filter === 'all' ? 'Create your first task to get started' : `No ${filter} tasks`}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2" size={16} />
                    Create Task
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
