'use client';

import React, { useState } from 'react';
import { Mic, MicOff, Volume2, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoiceAssistant } from './VoiceAssistant';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceFloatingButtonProps {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    onResult?: (result: any) => void;
}

export const VoiceFloatingButton: React.FC<VoiceFloatingButtonProps> = ({
    position = 'bottom-right',
    onResult
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [quickMode, setQuickMode] = useState(false);
    const {
        isSupported,
        isRecording,
        isProcessing,
        isSpeaking,
        transcript,
        startContinuousRecording,
        stopRecording,
        processVoiceCommand
    } = useVoiceAssistant();

    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'top-right': 'top-6 right-6',
        'top-left': 'top-6 left-6'
    };

    const handleQuickVoiceCommand = async () => {
        if (isRecording) {
            stopRecording();
            return;
        }

        setQuickMode(true);
        const success = await startContinuousRecording(
            (_transcript, _isFinal) => {
                // Handle interim results if needed
            },
            async (finalTranscript) => {
                if (finalTranscript.trim()) {
                    const result = await processVoiceCommand(finalTranscript);
                    if (result && onResult) {
                        onResult(result);
                    }
                }
                setQuickMode(false);
            }
        );

        if (!success) {
            setQuickMode(false);
        }
    };

    const getButtonState = () => {
        if (isProcessing) return { icon: Volume2, color: 'bg-yellow-500', pulse: true };
        if (isRecording) return { icon: MicOff, color: 'bg-red-500', pulse: true };
        if (isSpeaking) return { icon: Volume2, color: 'bg-blue-500', pulse: true };
        return { icon: Mic, color: 'bg-primary', pulse: false };
    };

    const buttonState = getButtonState();

    if (!isSupported) {
        return null;
    }

    return (
        <>
            {/* Floating Button */}
            <div className={`fixed ${positionClasses[position]} z-50`}>
                <div className="flex flex-col items-end gap-2">
                    {/* Quick transcript display */}
                    <AnimatePresence>
                        {quickMode && transcript && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                className="max-w-xs"
                            >
                                <Card className="shadow-lg border-primary/20">
                                    <CardContent className="p-3">
                                        <p className="text-sm">{transcript}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main floating button */}
                    <div className="flex gap-2">
                        {/* Quick voice button */}
                        <Button
                            size="lg"
                            onClick={handleQuickVoiceCommand}
                            className={`h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${buttonState.color} ${buttonState.pulse ? 'animate-pulse' : ''
                                }`}
                            disabled={isProcessing}
                        >
                            <buttonState.icon className="h-6 w-6 text-white" />
                        </Button>

                        {/* Full interface toggle */}
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setIsOpen(!isOpen)}
                            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            {isOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <MessageSquare className="h-6 w-6" />
                            )}
                        </Button>
                    </div>

                    {/* Status indicators */}
                    <div className="flex gap-1">
                        {isRecording && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                                Recording
                            </Badge>
                        )}
                        {isProcessing && (
                            <Badge variant="secondary" className="text-xs">
                                Processing
                            </Badge>
                        )}
                        {isSpeaking && (
                            <Badge variant="outline" className="text-xs">
                                Speaking
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Full Voice Assistant Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className={`fixed ${position.includes('right') ? 'right-6' : 'left-6'
                                } ${position.includes('bottom') ? 'bottom-24' : 'top-24'
                                } w-96 max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] overflow-hidden z-50`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Card className="shadow-2xl border-primary/20">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <Mic className="h-5 w-5" />
                                        Voice Assistant
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsOpen(false)}
                                        className="h-8 w-8 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[70vh] overflow-y-auto p-4">
                                        <VoiceAssistant onResult={onResult} />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};