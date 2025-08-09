'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getSession } from '@/actions/session';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { ContinuousVoiceChat } from './voice/ContinuousVoiceChat';
import { RealtimeVoiceChat } from './voice/RealtimeVoiceChat';

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
    const [showContinuousVoice, setShowContinuousVoice] = useState(false);
    const [showRealtimeVoice, setShowRealtimeVoice] = useState(false);

    const messagesEndRef = useRef(null);
    const wakeWordRecognitionRef = useRef(null);
    const voiceRecognitionRef = useRef(null);
    const speechSynthesisRef = useRef(null);

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

    const startVoiceCommand = async () => {
        if (!voiceSupported && !browserVoiceSupport) {
            toast.error('Voice recognition not supported in this browser');
            return;
        }

        setIsVoiceMode(true);
        setVoiceTranscript('');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log('Voice command recognition started');
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setVoiceTranscript(transcript);

            // If final result, process the command
            if (event.results[event.results.length - 1].isFinal) {
                handleVoiceCommand(transcript.trim());
            }
        };

        recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            setIsVoiceMode(false);
            restartWakeWordDetection();

            if (event.error === 'no-speech') {
                toast.error('No speech detected. Try again.');
            } else if (event.error === 'not-allowed') {
                toast.error('Microphone access denied.');
            }
        };

        recognition.onend = () => {
            console.log('Voice command recognition ended');
            setIsVoiceMode(false);
            setVoiceTranscript('');
            restartWakeWordDetection();
        };

        voiceRecognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            setIsVoiceMode(false);
            restartWakeWordDetection();
        }
    };

    const stopVoiceCommand = () => {
        if (voiceRecognitionRef.current) {
            voiceRecognitionRef.current.stop();
        }
        setIsVoiceMode(false);
        setVoiceTranscript('');
        restartWakeWordDetection();
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

    const handleVoiceCommand = async (transcript) => {
        if (!transcript.trim()) return;

        console.log('Processing voice command:', transcript);

        // Add the voice command as user input
        setInput(transcript);

        // Process the command
        await processMessage(transcript, true);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            ? 'http://localhost:8080/ai/voice/process'
            : 'http://localhost:8080/ai/intelligent';

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
                                    <span className="text-xs text-red-600">Voice command active</span>
                                    {voiceTranscript && (
                                        <span className="text-xs text-gray-600 italic">&quot;{voiceTranscript}&quot;</span>
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

                                {/* Voice buttons */}
                                {(voiceSupported || browserVoiceSupport) && (
                                    <div className="flex items-center space-x-1 mr-2">
                                        {/* Regular voice button */}
                                        <button
                                            type="button"
                                            onClick={isVoiceMode ? stopVoiceCommand : startVoiceCommand}
                                            className={`p-2 rounded-full transition-all duration-200 ${isVoiceMode
                                                ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
                                                }`}
                                            title={isVoiceMode ? "Stop voice input" : "Click to speak once"}
                                        >
                                            {isVoiceMode ? (
                                                <MicOff className="w-5 h-5" />
                                            ) : (
                                                <Mic className="w-5 h-5" />
                                            )}
                                        </button>

                                        {/* Continuous voice button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowContinuousVoice(true)}
                                            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 transition-all duration-200"
                                            title="Start continuous voice conversation (restart-based)"
                                        >
                                            <Volume2 className="w-5 h-5" />
                                        </button>

                                        {/* Real-time WebSocket voice button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowRealtimeVoice(true)}
                                            className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-800 transition-all duration-200"
                                            title="Start real-time voice chat (WebSocket - instant responses!)"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </button>
                                    </div>
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

            {/* Continuous Voice Chat Modal */}
            {showContinuousVoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Continuous Voice Chat</h2>
                            <button
                                onClick={() => setShowContinuousVoice(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <ContinuousVoiceChat
                            onResult={(result) => {
                                // Handle the voice result if needed
                                console.log('Continuous voice result:', result);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Real-time Voice Chat Modal */}
            {showRealtimeVoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">⚡ Real-time Voice Chat</h2>
                            <button
                                onClick={() => setShowRealtimeVoice(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <RealtimeVoiceChat
                            onResult={(result) => {
                                // Handle the voice result if needed
                                console.log('Real-time voice result:', result);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoiceEnabledAIChat;