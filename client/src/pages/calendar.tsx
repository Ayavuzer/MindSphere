import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Users } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
  });

  // Filter tasks by selected date
  const tasksForDate = tasks.filter((task: any) => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate.toDateString() === selectedDate.toDateString();
  });

  // Get tasks for current week for overview
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const weekTasks = tasks.filter((task: any) => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate >= startOfWeek && taskDate <= endOfWeek;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--card-dark)] border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Calendar</h1>
              <p className="text-[var(--text-secondary)]">Manage your schedule and deadlines</p>
            </div>
            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600">
              <Plus className="mr-2" size={16} />
              Add Event
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Widget */}
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <CalendarIcon className="text-indigo-400" size={20} />
                  <span>Calendar</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border-gray-700"
                />
                <div className="mt-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-[var(--text-secondary)]">High Priority</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-[var(--text-secondary)]">Medium Priority</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-[var(--text-secondary)]">Low Priority</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks for Selected Date */}
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">
                  Tasks for {selectedDate.toLocaleDateString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasksForDate.length > 0 ? (
                  <div className="space-y-3">
                    {tasksForDate.map((task: any) => (
                      <div key={task.id} className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-start space-x-3">
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            task.priority === 'high' ? 'bg-red-500' :
                            task.priority === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}></div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">{task.title}</h4>
                            {task.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                {task.priority}
                              </Badge>
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div>
                              <span className="text-xs text-[var(--text-secondary)]">
                                {task.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-[var(--text-secondary)]">No tasks for this date</p>
                    <p className="text-sm text-[var(--text-secondary)]">Select another date or add a new task</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Week Overview */}
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Week Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-xs text-[var(--text-secondary)] p-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Total Tasks This Week</span>
                      <span className="text-sm text-white">{weekTasks.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Completed</span>
                      <span className="text-sm text-white">
                        {weekTasks.filter((t: any) => t.status === 'completed').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">In Progress</span>
                      <span className="text-sm text-white">
                        {weekTasks.filter((t: any) => t.status === 'in_progress').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Pending</span>
                      <span className="text-sm text-white">
                        {weekTasks.filter((t: any) => t.status === 'pending').length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Deadlines */}
          <Card className="bg-[var(--card-dark)] border-gray-800 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Clock className="text-yellow-400" size={20} />
                <span>Upcoming Deadlines</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks
                  .filter((task: any) => task.dueDate && new Date(task.dueDate) > new Date())
                  .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 6)
                  .map((task: any) => (
                    <div key={task.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`w-3 h-3 rounded-full mt-1 ${
                          task.priority === 'high' ? 'bg-red-500' :
                          task.priority === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                        }`}></div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-white">{task.title}</h4>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs mt-2">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
