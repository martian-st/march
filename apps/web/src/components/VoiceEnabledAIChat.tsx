'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getSession } from '@/actions/session';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { BACKEND_URL, WEBSOCKET_URL } from '@/lib/constants';


/**
 * Voice-Enabled AI Chat Component
 * Extends the existing AI chat with voice capabilities including "Hey March" wake word
 */
const VoiceEnabledAIChat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [pendingClarification, setPendingClarification] = useState(null);
    const [conversationState, setConversationState] = useState('normal');
    const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(true);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [wakeWordRestarting, setWakeWordRestarting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentProgress, setCurrentProgress] = useState('');

    const messagesEndRef = useRef(null);
    const wakeWordRecognitionRef = useRef(null);
    const voiceRecognitionRef = useRef(null);
    const speechSynthesisRef = useRef(null);
    const wsRef = useRef(null);
    const conversationActiveRef = useRef(false);

    const {
        isSupported: voiceSupported,
        speak,
        stopSpeaking,
        isSpeaking
    } = useVoiceAssistant();

    // Direct browser support check as fallback
    const [browserVoiceSupport, setBrowserVoiceSupport] = useState(false);

    useEffect(() => {
        // Check for browser voice support directly
        const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        const hasSpeechSynthesis = 'speechSynthesis' in window;
        setBrowserVoiceSupport(hasWebSpeech && hasSpeechSynthesis);
        console.log('Voice support check:', { hasWebSpeech, hasSpeechSynthesis, voiceSupported });
    }, [voiceSupported]);

    // Initialize wake word detection (disabled by default due to browser limitations)
    useEffect(() => {
        // Disable continuous wake word detection as it causes browser conflicts
        // Users can still use the microphone button for voice input
        setIsListeningForWakeWord(false);
        return;

        // The code below is commented out but kept for reference
        /*
        if (!voiceSupported && !browserVoiceSupport) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Wake word detection (always listening in background)
        const wakeWordRecognition = new SpeechRecognition();
        wakeWordRecognition.continuous = true;
        wakeWordRecognition.interimResults = false;
        wakeWordRecognition.lang = 'en-US';

        wakeWordRecognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            console.log('Wake word detection:', transcript);

            if (transcript.includes('hey march') || transcript.includes('hi march') || transcript.includes('hello march')) {
                handleWakeWordDetected();
            }
        };

        wakeWordRecognition.onerror = (event) => {
            console.log('Wake word detection error:', event.error);
            setWakeWordRestarting(false);
            
            // Only restart for certain errors, not for aborted
            if (isListeningForWakeWord && !isVoiceMode && event.error !== 'not-allowed' && event.error !== 'aborted') {
                setWakeWordRestarting(true);
                setTimeout(() => {
                    if (isListeningForWakeWord && !isVoiceMode && !wakeWordRestarting) {
                        try {
                            wakeWordRecognition.start();
                            setWakeWordRestarting(false);
                        } catch (e) {
                            console.log('Failed to restart wake word detection');
                            setWakeWordRestarting(false);
                        }
                    }
                }, 2000); // Increased delay to prevent conflicts
            }
        };

        wakeWordRecognition.onend = () => {
            console.log('Wake word detection ended');
            setWakeWordRestarting(false);
            
            // Only restart if we should be listening and not in voice mode
            if (isListeningForWakeWord && !isVoiceMode && !wakeWordRestarting) {
                setWakeWordRestarting(true);
                setTimeout(() => {
                    if (isListeningForWakeWord && !isVoiceMode) {
                        try {
                            wakeWordRecognition.start();
                            setWakeWordRestarting(false);
                        } catch (e) {
                            console.log('Failed to restart wake word detection');
                            setWakeWordRestarting(false);
                        }
                    }
                }, 1000); // Reasonable delay to prevent conflicts
            }
        };

        wakeWordRecognitionRef.current = wakeWordRecognition;

        // Start wake word detection
        if (isListeningForWakeWord) {
            startWakeWordDetection();
        }

        return () => {
            setWakeWordRestarting(false);
            if (wakeWordRecognitionRef.current) {
                try {
                    wakeWordRecognitionRef.current.stop();
                } catch (e) {
                    console.log('Wake word recognition cleanup');
                }
            }
            if (voiceRecognitionRef.current) {
                try {
                    voiceRecognitionRef.current.stop();
                } catch (e) {
                    console.log('Voice recognition cleanup');
                }
            }
        };
        */
    }, [voiceSupported, isListeningForWakeWord, isVoiceMode]);

    const startWakeWordDetection = async () => {
        if (!wakeWordRecognitionRef.current || wakeWordRestarting || isVoiceMode) return;

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            wakeWordRecognitionRef.current.start();
            console.log('Wake word detection started');
            setWakeWordRestarting(false);
        } catch (error) {
            console.error('Failed to start wake word detection:', error);
            setWakeWordRestarting(false);

            if (error.name === 'NotAllowedError') {
                toast.error('Microphone access denied. Please allow microphone access in your browser settings and refresh the page.', {
                    duration: 5000
                });
            } else if (error.name === 'InvalidStateError') {
                console.log('Speech recognition already running, skipping start');
            } else {
                toast.error('Voice features disabled. Please check your microphone.');
            }
        }
    };

    const handleWakeWordDetected = () => {
        console.log('Wake word "Hey March" detected!');
        toast.success('Hey March detected! Listening...', { duration: 2000 });

        // Stop wake word detection temporarily and prevent restart
        setWakeWordRestarting(false);
        if (wakeWordRecognitionRef.current) {
            try {
                wakeWordRecognitionRef.current.stop();
            } catch (e) {
                console.log('Wake word recognition already stopped');
            }
        }

        // Start voice command mode after a brief delay
        setTimeout(() => {
            startVoiceCommand();
        }, 500);
    };

    // WebSocket connection management
    const connectWebSocket = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        return new Promise(async (resolve, reject) => {
            try {
                const session = await getSession();
                const wsUrl = `${WEBSOCKET_URL}`;
                console.log('Connecting to WebSocket:', wsUrl);

                const ws = new WebSocket(wsUrl, session);

                const connectionTimeout = setTimeout(() => {
                    ws.close();
                    reject(new Error('WebSocket connection timeout'));
                }, 10000);

                ws.onopen = () => {
                    console.log('WebSocket connected for real-time voice chat');
                    console.log('WebSocket readyState:', ws.readyState);
                    clearTimeout(connectionTimeout);
                    setIsConnected(true);
                    resolve();
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
                    console.log('Close event details:', event);
                    clearTimeout(connectionTimeout);
                    setIsConnected(false);

                    if (conversationActiveRef.current && event.code !== 1000) {
                        toast.error('Connection lost. Attempting to reconnect...');
                        setTimeout(() => connectWebSocket(), 3000);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    clearTimeout(connectionTimeout);
                    setIsConnected(false);
                    reject(error);
                };

                wsRef.current = ws;
            } catch (error) {
                console.error('Failed to connect WebSocket:', error);
                reject(error);
            }
        });
    }, []);

    const disconnectWebSocket = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close(1000, 'User disconnected');
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    const handleWebSocketMessage = (message) => {
        switch (message.type) {
            case 'welcome':
                console.log('WebSocket connection confirmed');
                break;
            case 'voice_conversation_started':
                toast.success('Real-time voice conversation started!');
                break;
            case 'voice_conversation_ended':
                toast.success('Voice conversation ended');
                stopRealtimeVoice();
                break;
            case 'voice_user_message':
                // Add user message to chat
                const userMessage = {
                    id: Date.now().toString(),
                    type: 'user',
                    content: message.text,
                    timestamp: new Date(),
                    isVoice: true
                };
                setMessages(prev => [...prev, userMessage]);
                break;
            case 'voice_immediate_response':
                // Immediate acknowledgment - speak it right away
                if (message.shouldSpeak && speechSynthesisRef.current) {
                    const utterance = new SpeechSynthesisUtterance(message.text);
                    utterance.rate = 1.0; // Slightly faster for acknowledgments
                    utterance.pitch = 1.1; // Slightly higher pitch for energy
                    utterance.volume = 0.8;
                    speechSynthesisRef.current.speak(utterance);
                }
                break;
            case 'voice_progress_update':
                // Progress updates - show in UI but don't speak
                setCurrentProgress(message.text);
                console.log('Progress:', message.text);
                break;
            case 'voice_processing':
                setIsProcessing(true);
                break;
            case 'voice_ai_response':
                setIsProcessing(false);
                setCurrentProgress(''); // Clear progress indicator

                // Add AI response to chat
                const aiMessage = {
                    id: Date.now().toString(),
                    type: 'assistant',
                    content: message.text,
                    timestamp: new Date(),
                    isVoice: true
                };
                setMessages(prev => [...prev, aiMessage]);

                // Speak the response
                if (message.shouldSpeak && speechSynthesisRef.current) {
                    const utterance = new SpeechSynthesisUtterance(message.text);
                    utterance.rate = 0.9;
                    utterance.pitch = 1;
                    utterance.volume = 0.8;
                    speechSynthesisRef.current.speak(utterance);
                }
                break;
            case 'voice_error':
                setIsProcessing(false);
                toast.error(message.message);
                break;
        }
    };

    const startRealtimeVoice = async () => {
        if (!voiceSupported && !browserVoiceSupport) {
            toast.error('Voice recognition not supported in this browser');
            return;
        }

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // Connect WebSocket if not already connected
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                console.log('Connecting to WebSocket...');
                await connectWebSocket();
                console.log('WebSocket connection attempt completed');

                // Give a moment for the connection to stabilize
                await new Promise(resolve => setTimeout(resolve, 500));

                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    console.error('WebSocket connection failed. ReadyState:', wsRef.current?.readyState);
                    throw new Error('WebSocket connection failed');
                }

                console.log('WebSocket is ready for voice chat');
            }

            setIsVoiceMode(true);
            conversationActiveRef.current = true;
            setVoiceTranscript('');

            // Send start conversation message
            sendMessage({ type: 'voice_start_conversation' });

            // Setup continuous speech recognition
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                console.log('Real-time voice recognition started');
            };

            recognition.onresult = (event) => {
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
                setVoiceTranscript(currentTranscript);

                // Send final transcript via WebSocket
                if (finalTranscript.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
                    sendMessage({
                        type: 'voice_text_input',
                        text: finalTranscript.trim()
                    });
                    setVoiceTranscript('');
                }
            };

            recognition.onerror = (event) => {
                console.error('Real-time voice recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    toast.error('Microphone access denied');
                    stopRealtimeVoice();
                }
            };

            recognition.onend = () => {
                console.log('Voice recognition ended');
                // Restart recognition if conversation is still active
                if (conversationActiveRef.current && !isProcessing) {
                    setTimeout(() => {
                        if (conversationActiveRef.current && voiceRecognitionRef.current) {
                            try {
                                voiceRecognitionRef.current.start();
                            } catch (e) {
                                console.log('Recognition restart failed:', e);
                            }
                        }
                    }, 1000);
                }
            };

            voiceRecognitionRef.current = recognition;
            recognition.start();

            toast.success('Real-time voice conversation started!');

        } catch (error) {
            console.error('Failed to start real-time voice:', error);
            toast.error(`Could not start voice conversation: ${error.message}`);
            setIsVoiceMode(false);
            conversationActiveRef.current = false;
        }
    };

    const stopRealtimeVoice = () => {
        setIsVoiceMode(false);
        conversationActiveRef.current = false;
        setVoiceTranscript('');
        setIsProcessing(false);

        if (voiceRecognitionRef.current) {
            voiceRecognitionRef.current.stop();
        }

        if (speechSynthesisRef.current) {
            speechSynthesisRef.current.cancel();
        }

        if (isConnected) {
            sendMessage({ type: 'voice_stop_conversation' });
        }

        disconnectWebSocket();
    };

    const restartWakeWordDetection = () => {
        if (isListeningForWakeWord && !isVoiceMode && !wakeWordRestarting) {
            setWakeWordRestarting(true);
            setTimeout(() => {
                if (isListeningForWakeWord && !isVoiceMode) {
                    startWakeWordDetection();
                    setWakeWordRestarting(false);
                }
            }, 2000); // Longer delay to prevent conflicts
        }
    };



    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize speech synthesis and cleanup
    useEffect(() => {
        speechSynthesisRef.current = window.speechSynthesis;

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (voiceRecognitionRef.current) {
                voiceRecognitionRef.current.stop();
            }
            if (speechSynthesisRef.current) {
                speechSynthesisRef.current.cancel();
            }
        };
    }, []);

    // Keep-alive ping for WebSocket
    useEffect(() => {
        if (!isConnected) return;

        const pingInterval = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                sendMessage({ type: 'ping' });
            }
        }, 30000); // Ping every 30 seconds

        return () => clearInterval(pingInterval);
    }, [isConnected, sendMessage]);

    const addMessage = (message) => {
        setMessages(prev => [...prev, message]);
    };

    const updateLastMessage = (updates) => {
        setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0) {
                newMessages[lastIndex] = { ...newMessages[lastIndex], ...updates };
            }
            return newMessages;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        await processMessage(input.trim(), false);
    };

    const processMessage = async (messageText, isVoiceInput = false) => {
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: messageText,
            timestamp: new Date(),
            isVoiceInput
        };

        addMessage(userMessage);
        setInput('');
        setIsLoading(true);

        // Add loading message
        const loadingMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: 'Thinking...',
            isLoading: true,
            timestamp: new Date()
        };
        addMessage(loadingMessage);

        try {
            await handleIntelligentRequest(messageText, isVoiceInput);
        } catch (error) {
            console.error('Error:', error);
            updateLastMessage({
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                isLoading: false,
                error: true
            });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const handleIntelligentRequest = async (query, isVoiceInput = false) => {
        setIsStreaming(true);

        const session = await getSession();

        // Use voice endpoint if it's a voice input
        const endpoint = isVoiceInput
            ? `${BACKEND_URL}/ai/voice/process`
            : `${BACKEND_URL}/ai/intelligent`;

        const requestBody = isVoiceInput
            ? { transcribedText: query, context: { source: 'voice' } }
            : { query };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            updateLastMessage({
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                isLoading: false,
                error: true
            });
            setIsStreaming(false);
            return;
        }

        if (isVoiceInput) {
            // Handle voice response
            const data = await response.json();
            if (data.success) {
                const responseText = data.data.voiceResponse.text;
                updateLastMessage({
                    content: responseText,
                    isLoading: false,
                    isVoiceResponse: true,
                    data: data.data
                });

                // Speak the response
                if (data.data.voiceResponse.shouldSpeak) {
                    await speak(responseText);
                }
            } else {
                updateLastMessage({
                    content: 'Sorry, I couldn\'t process that voice command.',
                    isLoading: false,
                    error: true
                });
            }
        } else {
            // Handle regular streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            updateLastMessage({ content: '', isLoading: false, isStreaming: true });

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                handleStreamingResponse(data);
                            } catch (e) {
                                console.warn('Failed to parse streaming response:', line);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        }
    };

    const handleStreamingResponse = (data) => {
        switch (data.status) {
            case 'thinking':
                updateLastMessage({
                    content: data.message || 'Processing your request...',
                    isStreaming: true
                });
                break;
            case 'processing':
                updateLastMessage({
                    content: data.message || 'Processing your request...',
                    isStreaming: true
                });
                break;
            case 'progress':
                updateLastMessage({
                    content: data.message || 'Working on your request...',
                    isStreaming: true
                });
                break;
            case 'completed':
                const responseContent = formatIntelligentResponse(data.data);
                updateLastMessage({
                    content: responseContent,
                    isStreaming: false,
                    data: data.data,
                    learningStats: data.data.learningStats
                });
                setConversationState('normal');
                break;
            case 'conversational':
                updateLastMessage({
                    content: data.data.response,
                    isStreaming: false,
                    isConversational: true,
                    data: data.data
                });
                setConversationState('normal');
                break;
            case 'clarification_needed':
                updateLastMessage({
                    content: formatClarificationRequest(data.data),
                    isStreaming: false,
                    needsClarification: true,
                    clarificationData: data.data
                });
                setPendingClarification(data.data);
                setConversationState('clarification');
                break;
            case 'follow_up_response':
                updateLastMessage({
                    content: data.data.response,
                    isStreaming: false,
                    isFollowUp: true,
                    data: data.data
                });
                setConversationState('normal');
                break;
            case 'error':
                updateLastMessage({
                    content: `Error: ${data.error}`,
                    isStreaming: false,
                    error: true
                });
                setConversationState('normal');
                setPendingClarification(null);
                break;
            default:
                updateLastMessage({
                    content: data.message || 'Processing your request...',
                    isStreaming: true
                });
                break;
        }
    };

    const formatIntelligentResponse = (data) => {
        let response = '';

        if (data.isConversational && data.response) {
            return data.response;
        }

        if (data.response) {
            return data.response;
        }

        if (data.message) {
            response += data.message + '\n\n';
        }

        if (data.object) {
            response += `✅ Created: **${data.object.title}**\n`;
            response += `Type: ${data.object.type}\n`;
            if (data.object.status) response += `Status: ${data.object.status}\n`;
            if (data.object.due?.string) response += `Due: ${data.object.due.string}\n`;
            response += '\n';
        }

        if (data.objects && data.objects.length > 0) {
            response += `Found ${data.objects.length} result${data.objects.length !== 1 ? 's' : ''}:\n\n`;
            data.objects.slice(0, 5).forEach((obj, index) => {
                response += `${index + 1}. **${obj.title}**\n`;
                response += `   ${obj.type} | ${obj.status || 'No status'}\n`;
                if (obj.due?.string) response += `   Due: ${obj.due.string}\n`;
                response += '\n';
            });
            if (data.objects.length > 5) {
                response += `... and ${data.objects.length - 5} more results\n\n`;
            }
        }

        return response || 'Request completed successfully';
    };

    const formatClarificationRequest = (data) => {
        let response = `${data.message}\n\n`;

        if (data.questions && data.questions.length > 0) {
            response += "**Please help me with the following:**\n\n";

            data.questions.forEach((question, index) => {
                response += `${index + 1}. ${question.question}\n`;

                if (question.suggestions && question.suggestions.length > 0) {
                    response += `   Suggestions: ${question.suggestions.join(', ')}\n`;
                }
                response += '\n';
            });

            response += "You can answer all questions in one message, or just provide the most important details.";
        }

        return response;
    };

    const formatMessageContent = (content) => {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>')
            .replace(/•/g, '&bull;')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    };

    const handleQuickResponse = (suggestion) => {
        setInput(suggestion);
    };

    const exampleQueries = [
        "Create a task to review the quarterly report by Friday",
        "Find my urgent tasks due this week",
        "Add a due date of August 15th to all my unplanned todos",
        "Schedule a team meeting for tomorrow at 2 PM",
        "Show me completed tasks from last month",
        "Update high priority tasks to be due next Monday"
    ];

    return (
        <div className="flex flex-col h-screen bg-white text-gray-900">
            {/* Voice Status Bar - Only show when actively using voice */}
            {(isVoiceMode || isSpeaking) && (
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">
                        <div className="flex items-center space-x-4">


                            {/* Voice Mode Status */}
                            {isVoiceMode && (
                                <div className="flex items-center space-x-2">
                                    <Mic className="w-4 h-4 text-red-500 animate-pulse" />
                                    <span className="text-xs text-red-600">Voice chat active</span>
                                    {voiceTranscript && (
                                        <span className="text-xs text-gray-600 italic">&quot;{voiceTranscript}&quot;</span>
                                    )}
                                    {currentProgress && (
                                        <span className="text-xs text-blue-600 italic">{currentProgress}</span>
                                    )}
                                </div>
                            )}

                            {/* Speaking Status */}
                            {isSpeaking && (
                                <div className="flex items-center space-x-2">
                                    <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />
                                    <span className="text-xs text-blue-600">Speaking...</span>
                                </div>
                            )}
                        </div>

                        {/* Voice Controls */}
                        <div className="flex items-center space-x-2">
                            {isSpeaking && (
                                <button
                                    onClick={stopSpeaking}
                                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="Stop speaking"
                                >
                                    <VolumeX className="w-4 h-4" />
                                </button>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 pb-36">
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-2xl px-4 py-3 rounded-2xl ${message.type === 'user'
                                ? 'bg-gray-900 text-white ml-12'
                                : 'bg-gray-100 text-gray-900 mr-12'
                                }`}>
                                {/* Voice input indicator */}
                                {message.isVoiceInput && (
                                    <div className="flex items-center space-x-1 mb-2 opacity-70">
                                        <Mic className="w-3 h-3" />
                                        <span className="text-xs">Voice input</span>
                                    </div>
                                )}

                                {message.isLoading ? (
                                    <div className="flex items-center space-x-1">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className="text-sm leading-relaxed"
                                            dangerouslySetInnerHTML={{
                                                __html: formatMessageContent(message.content)
                                            }}
                                        />

                                        {/* Voice response indicator */}
                                        {message.isVoiceResponse && (
                                            <div className="flex items-center space-x-1 mt-2 opacity-70">
                                                <Volume2 className="w-3 h-3" />
                                                <span className="text-xs">Spoken response</span>
                                            </div>
                                        )}

                                        {message.needsClarification && message.clarificationData?.questions && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                {message.clarificationData.questions.map((question, qIndex) => (
                                                    question.suggestions && question.suggestions.length > 0 && (
                                                        <div key={qIndex} className="mb-4">
                                                            <div className="text-sm font-medium text-gray-700 mb-2">{question.question}</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {question.suggestions.map((suggestion, sIndex) => (
                                                                    <button
                                                                        key={sIndex}
                                                                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        onClick={() => handleQuickResponse(suggestion)}
                                                                        disabled={isLoading}
                                                                    >
                                                                        {suggestion}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>



            {/* Input field */}
            <div className={`${messages.length === 0 ? 'flex items-center justify-center h-full' : 'fixed bottom-0 left-0 right-0 p-4'} bg-white`}>
                <div className="max-w-2xl w-full mx-auto">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className={`rounded-xl bg-gray-100 shadow-sm overflow-hidden ${isVoiceMode ? 'ring-2 ring-red-200 bg-red-50' : ''
                            }`}>
                            <div className="flex items-center px-4 py-3">


                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={
                                        isVoiceMode
                                            ? "🎤 Listening... Speak now or click mic to stop"
                                            : (voiceSupported || browserVoiceSupport)
                                                ? "Ask anything or click 🎤 to speak"
                                                : "Ask anything"
                                    }
                                    disabled={isLoading || isVoiceMode}
                                    className="flex-1 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-500"
                                />

                                {/* Voice button */}
                                {(voiceSupported || browserVoiceSupport) && (
                                    <button
                                        type="button"
                                        onClick={isVoiceMode ? stopRealtimeVoice : startRealtimeVoice}
                                        className={`p-2 mr-2 rounded-full transition-all duration-200 ${isVoiceMode
                                            ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
                                            }`}
                                        title={isVoiceMode ? "Stop real-time voice chat" : "Start real-time voice chat"}
                                    >
                                        {isVoiceMode ? (
                                            <MicOff className="w-5 h-5" />
                                        ) : (
                                            <Mic className="w-5 h-5" />
                                        )}
                                    </button>
                                )}

                                {/* Send button */}
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim() || isVoiceMode}
                                    className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Example queries - only shown when no messages exist */}
                        {messages.length === 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full">
                                {exampleQueries.map((query, index) => (
                                    <button
                                        key={index}
                                        className="p-4 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => setInput(query)}
                                        disabled={isLoading || isVoiceMode}
                                    >
                                        {query}
                                    </button>
                                ))}
                            </div>
                        )}
                    </form>
                </div>
            </div>


        </div>
    );
};

export default VoiceEnabledAIChat;