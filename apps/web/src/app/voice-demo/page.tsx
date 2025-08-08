'use client';

import React, { useState } from 'react';
import { VoiceAssistant, VoiceFloatingButton } from '@/components/voice';
import { VoiceDemo } from '@/components/VoiceDemo';
import VoiceEnabledAIChat from '@/components/VoiceEnabledAIChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mic, Brain, Zap, MessageSquare } from 'lucide-react';

export default function VoiceDemoPage() {
    const [results, setResults] = useState<any[]>([]);
    const [showFloating] = useState(true);

    const handleVoiceResult = (result: unknown) => {
        setResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
                    <Mic className="h-10 w-10 text-primary" />
                    Voice AI Assistant Demo
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Experience the power of voice-controlled AI. Speak naturally to create tasks,
                    find information, schedule meetings, and execute complex operations.
                </p>
            </div>

            {/* Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="text-center">
                        <Brain className="h-8 w-8 mx-auto text-primary mb-2" />
                        <CardTitle className="text-lg">Smart Understanding</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-muted-foreground">
                            Advanced AI processes your natural speech and understands context,
                            intent, and complex multi-step requests.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="text-center">
                        <Zap className="h-8 w-8 mx-auto text-primary mb-2" />
                        <CardTitle className="text-lg">Instant Execution</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-muted-foreground">
                            Voice commands are processed in real-time and executed immediately
                            with intelligent defaults and error handling.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="text-center">
                        <MessageSquare className="h-8 w-8 mx-auto text-primary mb-2" />
                        <CardTitle className="text-lg">Conversational</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-muted-foreground">
                            Maintains conversation context and provides spoken responses
                            for a natural, interactive experience.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Main Voice Assistant */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Voice Interface */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Voice Interface</h2>
                    <VoiceAssistant onResult={handleVoiceResult} />
                </div>

                {/* Recent Results */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Recent Results</h2>
                    {results.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <p className="text-muted-foreground">
                                    No voice commands processed yet. Try saying something like:
                                </p>
                                <div className="mt-4 space-y-2 text-sm">
                                    <Badge variant="outline">"Create a task to review the budget"</Badge>
                                    <Badge variant="outline">"Find my urgent tasks"</Badge>
                                    <Badge variant="outline">"Schedule a meeting for tomorrow"</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {results.map((result, index) => (
                                <Card key={index}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="secondary">
                                                {result.voiceProcessing.intent.replace('_', ' ')}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(result.executionSummary.processedAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div>
                                            <p className="text-sm font-medium">Command:</p>
                                            <p className="text-sm text-muted-foreground">
                                                "{result.voiceProcessing.originalText}"
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Response:</p>
                                            <p className="text-sm text-muted-foreground">
                                                {result.voiceResponse.text}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <Badge
                                                variant={result.executionSummary.overallSuccess ? "default" : "destructive"}
                                                className="text-xs"
                                            >
                                                {result.executionSummary.overallSuccess ? "Success" : "Failed"}
                                            </Badge>
                                            <span className="text-muted-foreground">
                                                Confidence: {Math.round(result.voiceProcessing.confidence * 100)}%
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Example Commands */}
            <Card>
                <CardHeader>
                    <CardTitle>Example Voice Commands</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2">Task Management</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li>• "Create a task to call the client tomorrow"</li>
                                <li>• "Add a high priority task to review the budget"</li>
                                <li>• "Find all my overdue tasks"</li>
                                <li>• "Show me tasks for this week"</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Calendar & Meetings</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li>• "Schedule a team meeting for Friday at 2pm"</li>
                                <li>• "Book a one-on-one with Sarah next week"</li>
                                <li>• "Find a 2-hour slot for the workshop"</li>
                                <li>• "Create a recurring standup every Monday"</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Complex Operations</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li>• "Find urgent tasks and create a meeting to discuss them"</li>
                                <li>• "Organize my tasks by project and set deadlines"</li>
                                <li>• "Show me this week's priorities and schedule time for them"</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">General Queries</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li>• "What's on my schedule today?"</li>
                                <li>• "How many pending tasks do I have?"</li>
                                <li>• "Give me a summary of my week"</li>
                                <li>• "What are my most important tasks?"</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Floating Button Demo */}
            {showFloating && (
                <VoiceFloatingButton
                    position="bottom-right"
                    onResult={handleVoiceResult}
                />
            )}
        </div>
    );
}