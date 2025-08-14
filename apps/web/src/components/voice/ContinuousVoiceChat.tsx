'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getSession } from '@/actions/session';
import axios from 'axios';
import { BACKEND_URL } from '@/lib/constants';

interface ContinuousVoiceChatProps {
  className?: string;
  onResult?: (result: any) => void;
}

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isVoice: boolean;
}

export const ContinuousVoiceChat: React.FC<ContinuousVoiceChatProps> = ({
  className = '',
  onResult
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const conversationActiveRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to restart listening with proper checks
  const restartListening = useCallback((delay: number = 1000) => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }

    restartTimeoutRef.current = setTimeout(() => {
      if (conversationActiveRef.current && 
          recognitionRef.current && 
          !isSpeaking && 
          !isProcessing && 
          !isListening) {
        try {
          console.log('Restarting voice recognition for continuous conversation...');
          recognitionRef.current.start();
        } catch (e) {
          console.log('Failed to restart recognition:', e);
          // Try again with longer delay
          if (conversationActiveRef.current) {
            restartListening(3000);
          }
        }
      }
    }, delay);
  }, [isSpeaking, isProcessing, isListening]);

  // Initialize speech services
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setIsSupported(true);
      speechSynthesisRef.current = speechSynthesis;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('Continuous voice recognition started');
        setIsListening(true);
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
        setCurrentTranscript(currentTranscript);

        // If we have a final result, process it
        if (finalTranscript.trim()) {
          handleVoiceInput(finalTranscript.trim());
          setCurrentTranscript('');
        }

        // Reset silence timeout on any speech
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Set new silence timeout (3 seconds of silence)
        silenceTimeoutRef.current = setTimeout(() => {
          if (conversationActiveRef.current && !isSpeaking && !isProcessing) {
            console.log('Silence detected, continuing to listen...');
            // Continue listening - don't stop the conversation
          }
        }, 3000);
      };

      recognition.onerror = (event) => {
        console.error('Continuous voice recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access.');
          stopConversation();
        } else if (event.error === 'no-speech') {
          // Restart recognition if no speech detected but conversation is still active
          if (conversationActiveRef.current) {
            restartListening(1500);
          }
        } else if (event.error === 'aborted') {
          // Recognition was aborted (likely because we stopped it to speak)
          console.log('Recognition aborted (likely for speech)');
          if (conversationActiveRef.current) {
            restartListening(500);
          }
        } else {
          // Other errors - try to restart if conversation is active
          if (conversationActiveRef.current) {
            restartListening(2000);
          }
        }
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
        
        // Restart recognition if conversation is still active
        if (conversationActiveRef.current) {
          restartListening(1000);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [isSpeaking, isProcessing]);

  const startConversation = async () => {
    if (!isSupported) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsActive(true);
      conversationActiveRef.current = true;
      
      // Add welcome message
      const welcomeMessage: VoiceMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        text: "Hi! I'm listening. You can talk to me naturally - I'll keep listening until you say 'stop' or 'goodbye'.",
        timestamp: new Date(),
        isVoice: false
      };
      
      setMessages([welcomeMessage]);
      
      // Speak welcome message
      await speakText(welcomeMessage.text);
      
      // Start listening after welcome message
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      toast.success('Voice conversation started! Say "stop" or "goodbye" to end.');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopConversation = () => {
    setIsActive(false);
    conversationActiveRef.current = false;
    setIsListening(false);
    setCurrentTranscript('');
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    
    // Stop any ongoing speech
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
    
    toast.success('Voice conversation ended');
  };

  const handleVoiceInput = async (transcript: string) => {
    console.log('Processing voice input:', transcript);
    
    // Check for stop commands
    const lowerTranscript = transcript.toLowerCase().trim();
    if (lowerTranscript.includes('stop') || 
        lowerTranscript.includes('goodbye') || 
        lowerTranscript.includes('bye') ||
        lowerTranscript.includes('end conversation') ||
        lowerTranscript.includes('turn off')) {
      
      const goodbyeMessage: VoiceMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        text: "Goodbye! Feel free to start a new conversation anytime.",
        timestamp: new Date(),
        isVoice: true
      };
      
      setMessages(prev => [...prev, goodbyeMessage]);
      await speakText(goodbyeMessage.text);
      
      setTimeout(() => {
        stopConversation();
      }, 2000);
      return;
    }

    // Add user message
    const userMessage: VoiceMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: transcript,
      timestamp: new Date(),
      isVoice: true
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const session = await getSession();
      const response = await axios.post(`${BACKEND_URL}/ai/voice/process`, {
        transcribedText: transcript,
        context: { 
          source: 'continuous_voice',
          conversationMode: true
        }
      }, {
        headers: {
          'Authorization': `Bearer ${session}`
        }
      });

      if (response.data.success) {
        const result = response.data.data;
        const assistantText = result.voiceResponse.text;
        
        const assistantMessage: VoiceMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          text: assistantText,
          timestamp: new Date(),
          isVoice: true
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Speak the response
        if (result.voiceResponse.shouldSpeak) {
          await speakText(assistantText);
        }
        
        onResult?.(result);
      } else {
        throw new Error(response.data.error || 'Failed to process voice command');
      }
    } catch (error: any) {
      console.error('Voice processing error:', error);
      
      const errorMessage: VoiceMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: "I'm sorry, I didn't catch that. Could you try again?",
        timestamp: new Date(),
        isVoice: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      await speakText(errorMessage.text);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text: string): Promise<void> => {
    if (!speechSynthesisRef.current || !text.trim()) return;

    return new Promise((resolve) => {
      if (!speechSynthesisRef.current) {
        resolve();
        return;
      }

      // Stop listening while speaking
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }

      // Cancel any ongoing speech
      speechSynthesisRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        console.log('Started speaking:', text);
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('Finished speaking, will restart listening...');
        setIsSpeaking(false);
        
        // Restart listening after speaking if conversation is still active
        if (conversationActiveRef.current) {
          restartListening(1500);
        }
        
        resolve();
      };
      
      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
        
        // Still try to restart listening on error
        if (conversationActiveRef.current) {
          restartListening(1500);
        }
        
        resolve();
      };

      speechSynthesisRef.current.speak(utterance);
    });
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
    <div className={`space-y-4 ${className}`}>
      {/* Conversation Control */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                size="lg"
                onClick={isActive ? stopConversation : startConversation}
                className={`h-12 w-12 rounded-full ${
                  isActive 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-green-500 hover:bg-green-600'
                }`}
                disabled={isProcessing}
              >
                {isActive ? (
                  <PhoneOff className="h-6 w-6 text-white" />
                ) : (
                  <Phone className="h-6 w-6 text-white" />
                )}
              </Button>
              
              <div>
                <p className="font-medium">
                  {isActive ? 'Voice Conversation Active' : 'Start Voice Conversation'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive 
                    ? 'Talk naturally - say "stop" to end' 
                    : 'Click to start talking like ChatGPT voice'
                  }
                </p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
              {isListening && (
                <Badge variant="default" className="animate-pulse">
                  <Mic className="w-3 h-3 mr-1" />
                  Listening
                </Badge>
              )}
              {isProcessing && (
                <Badge variant="secondary">
                  Processing...
                </Badge>
              )}
              {isSpeaking && (
                <Badge variant="outline">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Speaking
                </Badge>
              )}
            </div>
          </div>

          {/* Current Transcript */}
          {currentTranscript && (
            <div className="mt-3 p-2 bg-muted rounded text-sm">
              <span className="font-medium">You're saying: </span>
              {currentTranscript}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation History */}
      {messages.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
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
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.isVoice && (
                        <span className="flex items-center">
                          {message.type === 'user' ? (
                            <Mic className="w-3 h-3 mr-1" />
                          ) : (
                            <Volume2 className="w-3 h-3 mr-1" />
                          )}
                          Voice
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {isSpeaking && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">AI is speaking...</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeaking}
                  className="h-8"
                >
                  <VolumeX className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">How to use Continuous Voice Chat:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Click the green phone button to start</li>
            <li>• Talk naturally - no need to click again</li>
            <li>• I'll respond and keep listening</li>
            <li>• Say "stop", "goodbye", or "bye" to end</li>
            <li>• Or click the red phone button to stop</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}