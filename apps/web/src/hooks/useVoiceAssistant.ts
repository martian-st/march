'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { getSession } from '@/actions/session';
import { BACKEND_URL, WEBSOCKET_URL } from '@/lib/constants';

interface VoiceCapabilities {
    supportedIntents: Array<{
        intent: string;
        description: string;
        examples: string[];
    }>;
    voiceFeatures: string[];
    tips: string[];
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

export const useVoiceAssistant = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [capabilities, setCapabilities] = useState<VoiceCapabilities | null>(null);
    const [lastResult, setLastResult] = useState<VoiceResult | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

    // Initialize voice services
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const speechSynthesis = window.speechSynthesis;

        if (SpeechRecognition && speechSynthesis) {
            setIsSupported(true);
            speechSynthesisRef.current = speechSynthesis;

            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsRecording(true);
            recognition.onend = () => setIsRecording(false);
            recognition.onerror = (event) => {
                setIsRecording(false);
                console.error('Speech recognition error:', event.error);
            };

            recognitionRef.current = recognition;
        }

        // Load capabilities
        loadCapabilities();
    }, []);

    const loadCapabilities = async () => {
        try {
            const session = await getSession();
            const response = await axios.get(`${BACKEND_URL}/ai/voice/capabilities`, {
                headers: {
                    'Authorization': `Bearer ${session}`
                }
            });
            if (response.data.success) {
                setCapabilities(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load voice capabilities:', error);
        }
    };

    const startRecording = useCallback(async (): Promise<boolean> => {
        if (!isSupported || !recognitionRef.current || isRecording) {
            return false;
        }

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setTranscript('');
            recognitionRef.current.start();
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            toast.error('Could not access microphone. Please check permissions.');
            return false;
        }
    }, [isSupported, isRecording]);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
        }
    }, [isRecording]);

    const processVoiceCommand = useCallback(async (
        transcribedText: string,
        context: any = {}
    ): Promise<VoiceResult | null> => {
        if (!transcribedText.trim()) return null;

        setIsProcessing(true);
        try {
            const session = await getSession();
            const response = await axios.post(`${BACKEND_URL}/ai/voice/process`, {
                transcribedText,
                context
            }, {
                headers: {
                    'Authorization': `Bearer ${session}`
                }
            });

            if (response.data.success) {
                const result: VoiceResult = response.data.data;
                setLastResult(result);

                // Speak response if requested
                if (result.voiceResponse.shouldSpeak) {
                    await speak(result.voiceResponse.text);
                }

                return result;
            } else {
                throw new Error(response.data.error || 'Failed to process voice command');
            }
        } catch (error: any) {
            console.error('Voice command processing error:', error);
            const errorMessage = error.response?.data?.error || error.message;
            toast.error('Voice command failed', { description: errorMessage });
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const speak = useCallback(async (text: string): Promise<void> => {
        if (!speechSynthesisRef.current || !text.trim()) return;

        return new Promise((resolve, reject) => {
            if (!speechSynthesisRef.current) {
                reject(new Error('Speech synthesis not available'));
                return;
            }

            // Cancel any ongoing speech
            speechSynthesisRef.current.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => {
                setIsSpeaking(false);
                resolve();
            };
            utterance.onerror = (event) => {
                setIsSpeaking(false);
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };

            speechSynthesisRef.current.speak(utterance);
        });
    }, []);

    const stopSpeaking = useCallback(() => {
        if (speechSynthesisRef.current) {
            speechSynthesisRef.current.cancel();
            setIsSpeaking(false);
        }
    }, []);

    const transcribeOnly = useCallback(async (
        transcribedText: string,
        context: any = {}
    ) => {
        try {
            const session = await getSession();
            const response = await axios.post(`${BACKEND_URL}/ai/voice/transcribe`, {
                transcribedText,
                context
            }, {
                headers: {
                    'Authorization': `Bearer ${session}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Transcription error:', error);
            return null;
        }
    }, []);

    const checkHealth = useCallback(async () => {
        try {
            const session = await getSession();
            const response = await axios.get(`${BACKEND_URL}/ai/voice/health`, {
                headers: {
                    'Authorization': `Bearer ${session}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Voice health check failed:', error);
            return null;
        }
    }, []);

    // Set up continuous recognition with result handling
    const startContinuousRecording = useCallback((
        onResult: (transcript: string, isFinal: boolean) => void,
        onFinalResult?: (transcript: string) => void
    ) => {
        if (!recognitionRef.current) return false;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
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
            onResult(currentTranscript, !!finalTranscript);

            if (finalTranscript && onFinalResult) {
                onFinalResult(finalTranscript.trim());
            }
        };

        return startRecording();
    }, [startRecording]);

    return {
        // State
        isSupported,
        isRecording,
        isProcessing,
        isSpeaking,
        transcript,
        capabilities,
        lastResult,

        // Actions
        startRecording,
        stopRecording,
        startContinuousRecording,
        processVoiceCommand,
        speak,
        stopSpeaking,
        transcribeOnly,
        checkHealth,
        loadCapabilities
    };
};

// Type declarations for global interfaces
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition;
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}