'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getSession } from '@/actions/session';
import {  WEBSOCKET_URL } from '@/lib/constants';

interface RealtimeVoiceChatProps {
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

export const RealtimeVoiceChat: React.FC<RealtimeVoiceChatProps> = ({
  className = '',
  onResult
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationActiveRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        console.log('Real-time voice recognition started');
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

        // Send final transcript via WebSocket
        if (finalTranscript.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
          sendMessage({
            type: 'voice_text_input',
            text: finalTranscript.trim()
          });
          setCurrentTranscript('');
        }
      };

      recognition.onerror = (event) => {
        console.error('Real-time voice recognition error:', event.error);

        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access.');
          stopConversation();
        }
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);

        // Restart recognition if conversation is still active
        if (conversationActiveRef.current && !isSpeaking && !isProcessing) {
          setTimeout(() => {
            if (conversationActiveRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Recognition restart failed:', e);
              }
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isSpeaking, isProcessing]);

  // WebSocket connection management
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      const session = await getSession();

      // Use the existing WebSocket endpoint with sec-websocket-protocol for auth
      const wsUrl = `${WEBSOCKET_URL}`;
      const ws = new WebSocket(wsUrl, session);

      ws.onopen = () => {
        console.log('WebSocket connected for voice chat');
        setIsConnected(true);
        setConnectionStatus('connected');
        toast.success('Connected to real-time voice chat');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');

        // Attempt to reconnect if it was an unexpected closure
        if (conversationActiveRef.current && event.code !== 1000) {
          toast.error('Connection lost. Attempting to reconnect...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        toast.error('Connection error occurred');
      };

      wsRef.current = ws;

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionStatus('error');
      toast.error('Failed to connect to voice chat service');
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }, []);

  const handleWebSocketMessage = (message: any) => {
    console.log('Received WebSocket message:', message.type);

    switch (message.type) {
      case 'welcome':
        console.log('WebSocket connection confirmed');
        break;

      case 'voice_conversation_started':
        const welcomeMessage: VoiceMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          text: message.message,
          timestamp: new Date(),
          isVoice: false
        };
        setMessages([welcomeMessage]);

        if (message.shouldSpeak) {
          speakText(message.message);
        }
        break;

      case 'voice_conversation_ended':
        const goodbyeMessage: VoiceMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          text: message.message,
          timestamp: new Date(),
          isVoice: true
        };
        setMessages(prev => [...prev, goodbyeMessage]);

        if (message.shouldSpeak) {
          speakText(message.message);
        }

        setTimeout(() => {
          stopConversation();
        }, 2000);
        break;

      case 'voice_user_message':
        const userMessage: VoiceMessage = {
          id: Date.now().toString(),
          type: 'user',
          text: message.text,
          timestamp: new Date(message.timestamp),
          isVoice: true
        };
        setMessages(prev => [...prev, userMessage]);
        break;

      case 'voice_processing':
        setIsProcessing(true);
        break;

      case 'voice_ai_response':
        setIsProcessing(false);

        const assistantMessage: VoiceMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          text: message.text,
          timestamp: new Date(message.timestamp),
          isVoice: true
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (message.shouldSpeak) {
          speakText(message.text);
        }

        onResult?.(message.metadata || {});
        break;

      case 'voice_error':
        setIsProcessing(false);
        toast.error(message.message);
        break;

      case 'voice_pong':
        // Keep-alive response
        break;

      case 'pong':
        // Regular keep-alive response
        break;

      default:
        // Ignore non-voice messages (they might be for other features)
        if (message.type && message.type.startsWith('voice_')) {
          console.warn('Unknown voice WebSocket message type:', message.type);
        }
    }
  };

  const startConversation = async () => {
    if (!isSupported) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect WebSocket first
      await connectWebSocket();

      // Wait for connection
      const maxWait = 5000; // 5 seconds
      const startTime = Date.now();

      while (!isConnected && Date.now() - startTime < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!isConnected) {
        throw new Error('Failed to connect to voice chat service');
      }

      setIsActive(true);
      conversationActiveRef.current = true;

      // Send start conversation message
      sendMessage({ type: 'voice_start_conversation' });

      // Start listening
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      toast.success('Real-time voice conversation started!');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Could not start voice conversation. Please check permissions.');
    }
  };

  const stopConversation = () => {
    setIsActive(false);
    conversationActiveRef.current = false;
    setIsListening(false);
    setCurrentTranscript('');
    setIsProcessing(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Stop any ongoing speech
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }

    // Send stop message if connected
    if (isConnected) {
      sendMessage({ type: 'voice_stop_conversation' });
    }

    // Disconnect WebSocket
    disconnectWebSocket();

    toast.success('Voice conversation ended');
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
        console.log('Finished speaking');
        setIsSpeaking(false);

        // Restart listening after speaking if conversation is still active
        if (conversationActiveRef.current && recognitionRef.current) {
          setTimeout(() => {
            if (conversationActiveRef.current && recognitionRef.current && !isProcessing) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Failed to restart listening after speech:', e);
              }
            }
          }, 1000);
        }

        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
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

  // Keep-alive ping
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'voice_ping' });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);

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
      {/* Connection Status */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {connectionStatus === 'connected' && 'Connected'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'disconnected' && 'Disconnected'}
                {connectionStatus === 'error' && 'Connection Error'}
              </span>
            </div>

            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              Real-time WebSocket
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Control */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                size="lg"
                onClick={isActive ? stopConversation : startConversation}
                className={`h-12 w-12 rounded-full ${isActive
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-green-500 hover:bg-green-600'
                  }`}
                disabled={isProcessing || connectionStatus === 'connecting'}
              >
                {isActive ? (
                  <PhoneOff className="h-6 w-6 text-white" />
                ) : (
                  <Phone className="h-6 w-6 text-white" />
                )}
              </Button>

              <div>
                <p className="font-medium">
                  {isActive ? 'Real-time Voice Chat Active' : 'Start Real-time Voice Chat'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? 'Talk naturally - real-time WebSocket connection'
                    : 'Instant responses via WebSocket - no delays!'
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
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${message.type === 'user'
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
          <h4 className="font-medium mb-2">Real-time Voice Chat Features:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• ⚡ Instant responses via WebSocket connection</li>
            <li>• 🎤 Click green phone to start real-time conversation</li>
            <li>• 💬 Talk naturally - no delays or restarts needed</li>
            <li>• 🔄 Automatic reconnection if connection drops</li>
            <li>• 🛑 Say "stop", "goodbye", or click red phone to end</li>
            <li>• 📡 Real-time status indicators show connection health</li>
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