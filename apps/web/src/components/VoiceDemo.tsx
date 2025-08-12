'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, Volume2, MessageSquare, Zap, Brain } from 'lucide-react';

export const VoiceDemo = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check for voice support
    const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    setIsSupported(hasWebSpeech && hasSpeechSynthesis);
  }, []);

  const features = [
    {
      icon: <Mic className="h-6 w-6 text-blue-500" />,
      title: "Click to Talk",
      description: "Click the microphone button in the chat to start voice input",
      badge: "Active"
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-green-500" />,
      title: "Hey March Wake Word",
      description: "Say 'Hey March' anytime to activate voice mode",
      badge: "Always Listening"
    },
    {
      icon: <Volume2 className="h-6 w-6 text-purple-500" />,
      title: "Voice Responses",
      description: "AI responds with both text and speech for natural conversation",
      badge: "Automatic"
    },
    {
      icon: <Brain className="h-6 w-6 text-orange-500" />,
      title: "Smart Understanding",
      description: "Advanced AI processes natural speech and understands context",
      badge: "AI Powered"
    }
  ];

  const exampleCommands = [
    "Hey March, create a task to call the client tomorrow",
    "Hey March, find my urgent tasks due this week",
    "Hey March, schedule a team meeting for Friday at 2pm",
    "Hey March, show me my completed tasks from last month",
    "Hey March, add a due date to all my unplanned todos"
  ];

  return (
    <div className="space-y-6">
      {/* Voice Support Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Assistant Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isSupported ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              {isSupported ? 'Voice features are available' : 'Voice features not supported in this browser'}
            </span>
            {isSupported && (
              <Badge variant="default" className="ml-auto">
                Ready
              </Badge>
            )}
          </div>
          {!isSupported && (
            <p className="text-sm text-muted-foreground mt-2">
              Please use Chrome or Edge for the best voice experience.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {feature.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How to Use */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Voice Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Click the Microphone</p>
                <p className="text-sm text-muted-foreground">
                  Click the microphone icon in the chat input to start voice recording
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Say "Hey March"</p>
                <p className="text-sm text-muted-foreground">
                  The system is always listening for "Hey March" to activate voice mode
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Speak Naturally</p>
                <p className="text-sm text-muted-foreground">
                  Use natural language - no need for specific commands or keywords
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <div>
                <p className="font-medium">Listen to Response</p>
                <p className="text-sm text-muted-foreground">
                  March will respond with both text and speech for a natural conversation
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Try These Voice Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {exampleCommands.map((command, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-mono text-gray-700">
                  "{command}"
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> You can also have follow-up conversations! After March responds, 
              you can continue the conversation naturally without saying "Hey March" again.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Go to AI Chat */}
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold mb-2">Ready to try voice features?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Head to the AI Chat to experience voice-powered productivity
          </p>
          <Button asChild>
            <a href="/ai-chat" className="inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Go to AI Chat
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};