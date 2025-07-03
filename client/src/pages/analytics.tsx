import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Heart, 
  Brain, 
  Target,
  Calendar,
  CheckSquare,
  Smile,
  DollarSign,
  Activity
} from 'lucide-react';

export default function Analytics() {
  const { data: stats } = useQuery({
    queryKey: ['/api/analytics/stats'],
  });

  const { data: healthData = [] } = useQuery({
    queryKey: ['/api/health'],
  });

  const { data: moodData = [] } = useQuery({
    queryKey: ['/api/mood'],
  });

  const { data: financialData = [] } = useQuery({
    queryKey: ['/api/finances'],
  });

  const { data: taskInsights } = useQuery({
    queryKey: ['/api/analytics/insights', 'tasks'],
    queryFn: () => fetch('/api/analytics/insights?type=tasks').then(res => res.json()),
  });

  const { data: healthInsights } = useQuery({
    queryKey: ['/api/analytics/insights', 'health'],
    queryFn: () => fetch('/api/analytics/insights?type=health').then(res => res.json()),
  });

  const { data: moodInsights } = useQuery({
    queryKey: ['/api/analytics/insights', 'mood'],
    queryFn: () => fetch('/api/analytics/insights?type=mood').then(res => res.json()),
  });

  // Calculate analytics
  const taskCompletionRate = stats ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  const avgMood = stats?.avgMood || 0;
  const avgEnergy = stats?.avgEnergy || 0;

  const recentHealthEntry = healthData[0];
  const recentMoodEntry = moodData[0];

  // Financial analytics
  const totalIncome = financialData
    .filter((entry: any) => entry.type === 'income')
    .reduce((sum: number, entry: any) => sum + entry.amount, 0);
  
  const totalExpenses = financialData
    .filter((entry: any) => entry.type === 'expense')
    .reduce((sum: number, entry: any) => sum + entry.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-[var(--card-dark)] border-b border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics</h1>
              <p className="text-[var(--text-secondary)]">Insights into your productivity and well-being</p>
            </div>
            <Badge variant="outline" className="text-purple-400 border-purple-400">
              <Brain className="mr-1" size={12} />
              AI Powered
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-[var(--card-dark)] border border-gray-800">
              <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600">
                Overview
              </TabsTrigger>
              <TabsTrigger value="productivity" className="data-[state=active]:bg-indigo-600">
                Productivity
              </TabsTrigger>
              <TabsTrigger value="wellness" className="data-[state=active]:bg-indigo-600">
                Wellness
              </TabsTrigger>
              <TabsTrigger value="financial" className="data-[state=active]:bg-indigo-600">
                Financial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Task Completion</p>
                        <p className="text-2xl font-bold text-white">{taskCompletionRate.toFixed(1)}%</p>
                      </div>
                      <CheckSquare className="text-indigo-400" size={32} />
                    </div>
                    <Progress value={taskCompletionRate} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Avg Mood</p>
                        <p className="text-2xl font-bold text-white">{avgMood.toFixed(1)}/10</p>
                      </div>
                      <Smile className="text-yellow-400" size={32} />
                    </div>
                    <Progress value={avgMood * 10} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Avg Energy</p>
                        <p className="text-2xl font-bold text-white">{avgEnergy.toFixed(1)}/10</p>
                      </div>
                      <Activity className="text-green-400" size={32} />
                    </div>
                    <Progress value={avgEnergy * 10} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Net Balance</p>
                        <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${Math.abs(netBalance).toFixed(0)}
                        </p>
                      </div>
                      <DollarSign className="text-blue-400" size={32} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Brain className="text-purple-400" size={20} />
                      <span>AI Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">Productivity Patterns</h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {taskInsights?.insights || "Complete more tasks to receive AI-powered productivity insights."}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">Wellness Trends</h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {healthInsights?.insights || "Track your health metrics to receive personalized wellness insights."}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-2">Mood Analysis</h4>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {moodInsights?.insights || "Log your mood entries to receive emotional wellness insights."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Target className="text-indigo-400" size={20} />
                      <span>Goals Progress</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">Weekly Task Goals</span>
                        <span className="text-sm text-white">{stats?.completedTasks || 0}/10</span>
                      </div>
                      <Progress value={((stats?.completedTasks || 0) / 10) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">Health Tracking</span>
                        <span className="text-sm text-white">{healthData.length}/7 days</span>
                      </div>
                      <Progress value={(healthData.length / 7) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[var(--text-secondary)]">Mood Tracking</span>
                        <span className="text-sm text-white">{moodData.length}/7 days</span>
                      </div>
                      <Progress value={(moodData.length / 7) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="productivity" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <CheckSquare className="text-indigo-400" size={20} />
                      <span>Task Statistics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Total Tasks</span>
                      <span className="text-white font-semibold">{stats?.totalTasks || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Completed</span>
                      <span className="text-green-400 font-semibold">{stats?.completedTasks || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Completion Rate</span>
                      <span className="text-white font-semibold">{taskCompletionRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Conversations</span>
                      <span className="text-purple-400 font-semibold">{stats?.totalConversations || 0}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <TrendingUp className="text-green-400" size={20} />
                      <span>Productivity Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {taskInsights?.insights || "AI will analyze your task patterns and provide productivity recommendations as you complete more tasks."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="wellness" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Heart className="text-red-400" size={20} />
                      <span>Health Metrics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentHealthEntry ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--text-secondary)]">Sleep Hours</span>
                          <span className="text-white font-semibold">{recentHealthEntry.sleepHours || 0}h</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--text-secondary)]">Steps</span>
                          <span className="text-white font-semibold">{recentHealthEntry.steps || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--text-secondary)]">Energy Level</span>
                          <span className="text-white font-semibold">{recentHealthEntry.energy || 0}/10</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--text-secondary)]">Overall Mood</span>
                          <span className="text-white font-semibold">{recentHealthEntry.mood || 0}/10</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-[var(--text-secondary)]">No health data available. Start tracking to see your metrics.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Smile className="text-yellow-400" size={20} />
                      <span>Wellness Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">Health Analysis</h4>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {healthInsights?.insights || "Start tracking your health metrics to receive personalized AI insights."}
                        </p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h4 className="font-semibold text-white mb-2">Mood Patterns</h4>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {moodInsights?.insights || "Log your daily mood to discover patterns and receive emotional wellness tips."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <DollarSign className="text-blue-400" size={20} />
                      <span>Financial Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Total Income</span>
                      <span className="text-green-400 font-semibold">${totalIncome.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Total Expenses</span>
                      <span className="text-red-400 font-semibold">${totalExpenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Net Balance</span>
                      <span className={`font-semibold ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${netBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Total Transactions</span>
                      <span className="text-white font-semibold">{financialData.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[var(--card-dark)] border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <BarChart3 className="text-purple-400" size={20} />
                      <span>Financial Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-[var(--text-secondary)]">
                        {financialData.length > 0 
                          ? "Your financial tracking shows consistent monitoring of expenses. Keep maintaining this habit for better financial awareness."
                          : "Start tracking your income and expenses to receive AI-powered financial insights and recommendations."
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
