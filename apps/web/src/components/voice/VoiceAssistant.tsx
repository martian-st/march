'use client';

import React, { useState, useCallback } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Mic, Brain, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getSession } from '@/actions/session';
import { BACKEND_URL, } from '@/lib/constants';

interface VoiceAssistantProps {
  className?: string;
  onResult?: (result: any) => void;
}

interface VoiceResult {
  voiceProcessing: {
    originalText: string;
    intent: string;
    confidence: number;
    parameters: any;
  };
  assistantResult: any;
  voiceResponse: {
    text: string;
    shouldSpeak: boolean;
    confidence: number;
  };
  executionSummary: {
    voiceProcessingSuccess: boolean;
    assistantExecutionSuccess: boolean;
    overallSuccess: boolean;
    processedAt: string;
  };
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  className = '',
  onResult
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    text: string;
    timestamp: string;
    confidence?: number;
  }>>([]);

  const handleVoiceCommand = useCallback(async (transcribedText: string, context = {}) => {
    if (!transcribedText.trim()) return;

    setIsProcessing(true);
    
    // Add user message to conversation
    const userMessage = {
      type: 'user' as const,
      text: transcribedText,
      timestamp: new Date().toISOString()
    };
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      const session = await getSession();
      const response = await axios.post(`${BACKEND_URL}/ai/voice/process`, {
        transcribedText,
        context: {
          ...context,
          conversationHistory: conversationHistory.slice(-5) // Last 5 messages for context
        }
      }, {
        headers: {
          'Authorization': `Bearer ${session}`
        }
      });

      if (response.data.success) {
        const result: VoiceResult = response.data.data;
        setLastResult(result);
        
        // Add assistant response to conversation
        const assistantMessage = {
          type: 'assistant' as const,
          text: result.voiceResponse.text,
          timestamp: new Date().toISOString(),
          confidence: result.voiceResponse.confidence
        };
        setConversationHistory(prev => [...prev, assistantMessage]);

        // Speak the response if requested
        if (result.voiceResponse.shouldSpeak && result.voiceResponse.text) {
          speakResponse(result.voiceResponse.text);
        }

        // Show success toast
        toast.success('Voice command processed successfully!', {
          description: result.voiceResponse.text
        });

        // Call onResult callback if provided
        onResult?.(result);
      } else {
        throw new Error(response.data.error || 'Failed to process voice command');
      }
    } catch (error: unknown) {
      console.error('Voice command error:', error);
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process voice command';
      toast.error('Voice Command Failed', {
        description: errorMessage
      });

      // Add error message to conversation
      const errorResponse = {
        type: 'assistant' as const,
        text: `Sorry, I couldn't process that command: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        confidence: 0
      };
      setConversationHistory(prev => [...prev, errorResponse]);
    } finally {
      setIsProcessing(false);
    }
  }, [conversationHistory, onResult]);

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setLastResult(null);
    setCurrentTranscript('');
    toast.success('Conversation cleared');
  };

  const getIntentBadgeVariant = (intent: string) => {
    switch (intent) {
      case 'create_task': return 'default';
      case 'find_objects': return 'secondary';
      case 'schedule_meeting': return 'outline';
      case 'complex_request': return 'destructive';
      default: return 'secondary';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Voice Recorder */}
      <VoiceRecorder
        onVoiceCommand={handleVoiceCommand}
        onTranscriptionUpdate={setCurrentTranscript}
        disabled={isProcessing}
      />

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversation
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearConversation}
              className="h-8 px-2 text-xs"
            >
              Clear
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {conversationHistory.slice(-6).map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p>{message.text}</p>
                    <div className="flex items-center justify-between mt-1 text-xs opacity-70">
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      {message.confidence !== undefined && (
                        <span className={getConfidenceColor(message.confidence)}>
                          {Math.round(message.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Result Details */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Last Command Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Voice Processing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Intent Recognition</span>
                <div className="flex items-center gap-2">
                  <Badge variant={getIntentBadgeVariant(lastResult.voiceProcessing.intent)}>
                    {lastResult.voiceProcessing.intent.replace('_', ' ')}
                  </Badge>
                  <span className={`text-xs ${getConfidenceColor(lastResult.voiceProcessing.confidence)}`}>
                    {Math.round(lastResult.voiceProcessing.confidence * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                "{lastResult.voiceProcessing.originalText}"
              </p>
            </div>

            <Separator />

            {/* Execution Status */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                {lastResult.executionSummary.voiceProcessingSuccess ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span>Voice Processing</span>
              </div>
              <div className="flex items-center gap-2">
                {lastResult.executionSummary.assistantExecutionSuccess ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span>AI Execution</span>
              </div>
            </div>

            <Separator />

            {/* Response */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">AI Response</span>
                {lastResult.voiceResponse.shouldSpeak && (
                  <Badge variant="outline" className="text-xs">
                    <Mic className="h-3 w-3 mr-1" />
                    Spoken
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {lastResult.voiceResponse.text}
              </p>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(lastResult.executionSummary.processedAt).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Commands Help */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Voice Commands</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>
              <p className="font-medium mb-1">Create Tasks:</p>
              <p className="text-muted-foreground">"Create a task to call the client"</p>
            </div>
            <div>
              <p className="font-medium mb-1">Find Items:</p>
              <p className="text-muted-foreground">"Find my urgent tasks"</p>
            </div>
            <div>
              <p className="font-medium mb-1">Schedule Meetings:</p>
              <p className="text-muted-foreground">"Schedule a team meeting for Friday"</p>
            </div>
            <div>
              <p className="font-medium mb-1">Complex Requests:</p>
              <p className="text-muted-foreground">"Find overdue tasks and prioritize them"</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};