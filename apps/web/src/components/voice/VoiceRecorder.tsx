'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onVoiceCommand: (transcribedText: string, context?: any) => Promise<void>;
  onTranscriptionUpdate?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onVoiceCommand,
  onTranscriptionUpdate,
  disabled = false,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setIsSupported(true);
      speechSynthesisRef.current = speechSynthesis;
      
      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('Voice recognition started');
        setIsRecording(true);
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        onTranscriptionUpdate?.(currentTranscript);
        
        // If we have a final result, process it
        if (finalTranscript.trim()) {
          handleVoiceCommand(finalTranscript.trim());
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access and try again.');
        } else if (event.error === 'no-speech') {
          toast.error('No speech detected. Please try again.');
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };
      
      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported in this browser');
      toast.error('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscriptionUpdate]);

  const handleVoiceCommand = async (transcribedText: string) => {
    if (!transcribedText.trim()) return;
    
    setIsProcessing(true);
    try {
      await onVoiceCommand(transcribedText);
      setTranscript('');
    } catch (error) {
      console.error('Error processing voice command:', error);
      toast.error('Failed to process voice command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    if (!isSupported || !recognitionRef.current || disabled) return;
    
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setTranscript('');
      recognitionRef.current.start();
      toast.success('Listening... Speak your command');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text: string) => {
    if (!speechSynthesisRef.current || !text.trim()) return;
    
    // Cancel any ongoing speech
    speechSynthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error('Failed to speak response');
    };
    
    speechSynthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className={`border-destructive ${className}`}>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Voice recognition is not supported in your browser.
            <br />
            Please use Chrome or Edge for voice features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Recording Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {isProcessing ? 'Processing...' : isRecording ? 'Stop' : 'Record'}
            </Button>
            
            {/* Speaking Controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={isSpeaking ? stopSpeaking : () => speakText('Voice assistant is ready')}
              disabled={disabled}
              className="flex items-center gap-2"
            >
              {isSpeaking ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {isSpeaking ? 'Stop' : 'Test'}
            </Button>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {isRecording && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Listening...
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Volume2 className="w-4 h-4" />
                Speaking...
              </div>
            )}
          </div>
        </div>
        
        {/* Live Transcript */}
        {transcript && (
          <div className="mt-3 p-3 bg-muted rounded-md">
            <p className="text-sm">
              <span className="font-medium">Transcript: </span>
              {transcript}
            </p>
          </div>
        )}
        
        {/* Voice Commands Help */}
        <div className="mt-3 text-xs text-muted-foreground">
          <p>Try saying: "Create a task to call the client" or "Find my urgent tasks"</p>
        </div>
      </CardContent>
    </Card>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}