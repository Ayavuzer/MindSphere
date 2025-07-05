import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'wouter';
import { 
  CheckSquare, 
  Calendar, 
  Heart, 
  TrendingUp, 
  Brain,
  Target,
  Clock,
  AlertCircle,
  Settings
} from 'lucide-react';

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['/api/analytics/stats'],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
  });

  const { data: healthData } = useQuery({
    queryKey: ['/api/health'],
  });

  const { data: moodData } = useQuery({
    queryKey: ['/api/mood'],
  });

  const { data: configStatus } = useQuery({
    queryKey: ['/api/config/status'],
  });

  const completionRate = stats ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  const urgentTasks = tasks.filter((task: any) => task.priority === 'high' && task.status !== 'completed');
  const latestHealth = healthData?.[0];
  const latestMood = moodData?.[0];

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--card-dark)] border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-[var(--text-secondary)]">Your personal overview</p>
            </div>
            <div className="flex items-center space-x-2">
              {configStatus?.openaiConfigured ? (
                <Badge variant="outline" className="text-green-400 border-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  All Systems Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Setup Required
                </Badge>
              )}
            </div>
          </div>
          
          {/* Configuration Warning */}
          {configStatus && !configStatus.openaiConfigured && (
            <Alert className="mt-4 border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>OpenAI API Key Required</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Please configure your OpenAI API key to enable AI features like chat, insights, and voice recognition.
                </span>
                <Link href="/preferences">
                  <Button variant="outline" size="sm" className="ml-4">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Total Tasks</p>
                    <p className="text-2xl font-bold text-white">{stats?.totalTasks || 0}</p>
                  </div>
                  <CheckSquare className="text-indigo-400" size={32} />
                </div>
                <div className="mt-2">
                  <Progress value={completionRate} className="h-2" />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {stats?.completedTasks || 0} completed
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Mood Score</p>
                    <p className="text-2xl font-bold text-white">{latestMood?.mood || 0}/10</p>
                  </div>
                  <Heart className="text-red-400" size={32} />
                </div>
                <div className="mt-2">
                  <Progress value={(latestMood?.mood || 0) * 10} className="h-2" />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {latestMood?.mood ? 'Recent entry' : 'No data'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Energy Level</p>
                    <p className="text-2xl font-bold text-white">{latestHealth?.energy || 0}/10</p>
                  </div>
                  <TrendingUp className="text-green-400" size={32} />
                </div>
                <div className="mt-2">
                  <Progress value={(latestHealth?.energy || 0) * 10} className="h-2" />
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {latestHealth?.energy ? 'Recent entry' : 'No data'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">AI Insights</p>
                    <p className="text-2xl font-bold text-white">{stats?.totalConversations || 0}</p>
                  </div>
                  <Brain className="text-purple-400" size={32} />
                </div>
                <div className="mt-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Total conversations
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent Tasks */}
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <AlertCircle className="text-red-400" size={20} />
                  <span>Urgent Tasks</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {urgentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {urgentTasks.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{task.title}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-[var(--text-secondary)]">No urgent tasks</p>
                    <p className="text-sm text-[var(--text-secondary)]">Great job staying on top of things!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Progress */}
            <Card className="bg-[var(--card-dark)] border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Clock className="text-blue-400" size={20} />
                  <span>Daily Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-[var(--text-secondary)]">Tasks Completed</span>
                      <span className="text-sm text-white">{stats?.completedTasks || 0}/{stats?.totalTasks || 0}</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-[var(--text-secondary)]">Health Score</span>
                      <span className="text-sm text-white">{latestHealth?.energy || 0}/10</span>
                    </div>
                    <Progress value={(latestHealth?.energy || 0) * 10} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-[var(--text-secondary)]">Mood</span>
                      <span className="text-sm text-white">{latestMood?.mood || 0}/10</span>
                    </div>
                    <Progress value={(latestMood?.mood || 0) * 10} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card className="bg-[var(--card-dark)] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Brain className="text-purple-400" size={20} />
                <span>AI Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Productivity Insight</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Based on your task completion patterns, you're most productive in the morning hours. 
                    Consider scheduling high-priority tasks between 9-11 AM.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Wellness Recommendation</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Your energy levels correlate with your sleep quality. Try maintaining a consistent 
                    bedtime routine to improve your daily performance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
