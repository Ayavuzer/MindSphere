import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, MessageSquare, BarChart3, Heart, Mic, Shield, Zap } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--deep-dark)] to-[var(--card-dark)] flex flex-col">
      {/* Header */}
      <header className="p-6 border-b border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">MindSphere</h1>
              <p className="text-sm text-[var(--text-secondary)]">AI Personal Assistant</p>
            </div>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-5xl font-bold text-white mb-6">
              Your AI-Powered
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Life Assistant
              </span>
            </h2>
            <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto mb-8">
              Manage your entire digital life with MindSphere - the AI assistant that learns, adapts, and grows with you. 
              From conversations to health tracking, we've got you covered.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card className="glass-effect border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <MessageSquare className="text-indigo-400" size={24} />
                  <span>Conversational AI</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-secondary)]">
                  Natural conversations with advanced AI that remembers your preferences and context.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <BarChart3 className="text-green-400" size={24} />
                  <span>Life Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-secondary)]">
                  Track your health, mood, productivity, and finances with intelligent insights.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Heart className="text-red-400" size={24} />
                  <span>Wellness Tracking</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-secondary)]">
                  Monitor your physical and mental health with personalized recommendations.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Mic className="text-purple-400" size={24} />
                  <span>Voice Interface</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-secondary)]">
                  Hands-free interaction with advanced voice recognition and synthesis.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Zap className="text-yellow-400" size={24} />
                  <span>Smart Automation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-secondary)]">
                  Automate routine tasks and get proactive suggestions for better productivity.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Shield className="text-blue-400" size={24} />
                  <span>Privacy First</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--text-secondary)]">
                  End-to-end encryption and local processing options for maximum privacy.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-lg px-8 py-4"
            >
              Start Your AI Journey
            </Button>
            <p className="text-sm text-[var(--text-secondary)]">
              Free to start • Premium features available • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-[var(--text-secondary)]">
          <p>&copy; 2025 MindSphere. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
