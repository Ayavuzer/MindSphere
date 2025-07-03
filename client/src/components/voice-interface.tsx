import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';

interface VoiceInterfaceProps {
  onTranscript?: (transcript: string) => void;
  onSpeech?: (text: string) => void;
}

export function VoiceInterface({ onTranscript, onSpeech }: VoiceInterfaceProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { 
    isListening, 
    isProcessing, 
    transcript, 
    error, 
    startListening, 
    stopListening, 
    synthesizeSpeech,
    isSupported 
  } = useVoice();

  useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeak = (text: string) => {
    if (text && onSpeech) {
      setIsSpeaking(true);
      synthesizeSpeech(text);
      onSpeech(text);
      // Reset speaking state after a delay
      setTimeout(() => setIsSpeaking(false), 3000);
    }
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <MicOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Voice Not Supported</h3>
            <p className="text-sm text-gray-600">
              Your browser doesn't support voice recognition. Please use a modern browser like Chrome or Firefox.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Voice Assistant</span>
          <Badge variant={isListening ? "default" : "secondary"}>
            {isListening ? 'Listening' : 'Ready'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            onClick={handleVoiceToggle}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className={`rounded-full ${isListening ? 'voice-pulse' : ''}`}
            disabled={isProcessing}
          >
            {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          
          <Button
            onClick={() => handleSpeak("Hello, I'm MindSphere, your AI assistant.")}
            variant="outline"
            size="lg"
            className="rounded-full"
            disabled={isSpeaking}
          >
            {isSpeaking ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </Button>
        </div>

        {/* Status */}
        <div className="text-center">
          {isListening && (
            <p className="text-sm text-blue-600">
              🎤 Listening... Speak now
            </p>
          )}
          {isProcessing && (
            <p className="text-sm text-yellow-600">
              ⏳ Processing your voice...
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600">
              ❌ {error}
            </p>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">You said:</p>
            <p className="text-sm text-gray-700">{transcript}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>• Click the microphone to start/stop listening</p>
          <p>• Click the speaker to test voice synthesis</p>
          <p>• Say "Hey MindSphere" to wake up the assistant</p>
        </div>
      </CardContent>
    </Card>
  );
}
