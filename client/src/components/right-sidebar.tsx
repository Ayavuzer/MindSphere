import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  TrendingUp, 
  Heart, 
  Mic, 
  Check, 
  Mail, 
  Brain,
  Shield
} from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';

export function RightSidebar() {
  const { startListening, stopListening, isListening } = useVoice();

  const { data: stats } = useQuery({
    queryKey: ['/api/analytics/stats'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const { data: healthInsights } = useQuery({
    queryKey: ['/api/analytics/insights'],
    queryFn: () => fetch('/api/analytics/insights?type=health').then(res => res.json()),
    refetchInterval: 600000, // Refresh every 10 minutes
  });

  const { data: moodInsights } = useQuery({
    queryKey: ['/api/analytics/insights'],
    queryFn: () => fetch('/api/analytics/insights?type=mood').then(res => res.json()),
    refetchInterval: 600000, // Refresh every 10 minutes
  });

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="w-80 bg-[var(--card-dark)] border-l border-gray-800 p-4 space-y-4 overflow-y-auto">
      {/* Today's Insights */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <Lightbulb className="text-yellow-400 mr-2" size={20} />
            Today's Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="text-green-400" size={16} />
              <span className="text-sm font-medium text-white">Productivity</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              You're 23% more productive in the morning. Schedule important tasks before noon.
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="text-red-400" size={16} />
              <span className="text-sm font-medium text-white">Health</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {healthInsights?.insights || "Track your health metrics to receive personalized insights."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Weekly Goals</span>
            <div className="flex items-center space-x-2">
              <Progress value={80} className="w-20" />
              <span className="text-sm text-white">80%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Health Score</span>
            <div className="flex items-center space-x-2">
              <Progress value={85} className="w-20" />
              <span className="text-sm text-white">85%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Focus Time</span>
            <span className="text-sm text-white">
              {stats ? `${Math.round(stats.totalConversations * 0.5)}h` : '0h'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <Check className="text-white" size={12} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">
                Completed {stats?.completedTasks || 0} tasks today
              </p>
              <p className="text-xs text-[var(--text-secondary)]">2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <Mail className="text-white" size={12} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">Processed communication updates</p>
              <p className="text-xs text-[var(--text-secondary)]">3 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <Brain className="text-white" size={12} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">Generated daily insights</p>
              <p className="text-xs text-[var(--text-secondary)]">5 hours ago</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Assistant Status */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Voice Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center ${
              isListening ? 'voice-pulse' : ''
            }`}>
              <Mic className="text-white" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">
                {isListening ? 'Listening...' : 'Ready to listen'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {isListening ? 'Speak now' : 'Say "Hey MindSphere" to activate'}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleVoiceToggle}
            className="w-full"
            variant={isListening ? "destructive" : "default"}
          >
            {isListening ? 'Stop Listening' : 'Start Voice Session'}
          </Button>
          
          <div className="flex items-center justify-center mt-3">
            <div className="text-xs text-[var(--text-secondary)] flex items-center">
              <Shield className="text-green-400 mr-1" size={12} />
              End-to-end encrypted
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
