import { VoiceRecognitionService } from "../../services/ai/voice-recognition.service.js";
import { environment } from "../../loaders/environment.loader.js";

// Initialize voice service (only needed for response formatting)
const voiceService = new VoiceRecognitionService(environment.GOOGLE_AI_API_KEY);

/**
 * Process voice command and execute AI assistant action
 */
export const processVoiceCommand = async (req, res) => {
    try {
        const { transcribedText, context = {}, sessionId } = req.body;

        if (!transcribedText) {
            return res.status(400).json({
                success: false,
                error: "Transcribed text is required"
            });
        }

        // Use existing intelligent AI API instead of separate voice logic
        let assistantResult;

        try {
        // Call the existing intelligent AI endpoint internally
            const intelligentResponse = await fetch('http://localhost:8080/ai/intelligent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization // Pass through the auth token
                },
                body: JSON.stringify({
                    query: transcribedText // Use the original voice input directly
                })
            });

            if (!intelligentResponse.ok) {
                throw new Error(`Intelligent AI API error: ${intelligentResponse.status}`);
            }

            // Handle streaming response from intelligent AI
            const reader = intelligentResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finalResult = null;

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
                            if (data.status === 'completed' || data.status === 'conversational') {
                                finalResult = data;
                            }
                        } catch (e) {
                            console.warn('Failed to parse streaming response:', line);
                        }
                    }
                }
            }

            if (finalResult) {
                assistantResult = {
                    success: true,
                    data: finalResult.data
                };
            } else {
                assistantResult = {
                    success: false,
                    data: null,
                    error: 'No final result from intelligent AI'
                };
            }
        } catch (error) {
            console.error('Error calling intelligent AI:', error);
            assistantResult = {
                success: false,
                data: null,
                error: error.message || 'Failed to process with intelligent AI'
            };
        }

        // Generate voice-friendly response
        const voiceResponse = voiceService.generateSimpleVoiceResponse(
            assistantResult,
            transcribedText
        );

        // Return simplified result
        res.json({
            success: true,
            data: {
                voiceProcessing: {
                    originalText: transcribedText,
                    intent: 'processed_by_intelligent_ai',
                    confidence: 0.9
                },
                assistantResult: assistantResult.data,
                voiceResponse: {
                    text: voiceResponse.text,
                    shouldSpeak: voiceResponse.shouldSpeak,
                    confidence: voiceResponse.confidence
                },
                executionSummary: {
                    voiceProcessingSuccess: true,
                    assistantExecutionSuccess: assistantResult.success,
                    overallSuccess: assistantResult.success,
                    processedAt: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error("Voice command processing error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error processing voice command",
            message:
        process.env.NODE_ENV === "development"
            ? error.message
            : "Something went wrong"
        });
    }
};

/**
 * Process voice-to-text transcription only (for testing)
 */
export const transcribeVoice = async (req, res) => {
    try {
        const { transcribedText, context = {} } = req.body;

        if (!transcribedText) {
            return res.status(400).json({
                success: false,
                error: "Transcribed text is required"
            });
        }

        // Simple transcription response since we're using intelligent AI directly
        res.json({
            success: true,
            data: {
                originalText: transcribedText,
                processing: {
                    success: true,
                    message: "Voice transcribed successfully"
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Voice transcription error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to process voice transcription"
        });
    }
};

/**
 * Get voice command capabilities and examples
 */
export const getVoiceCapabilities = async (req, res) => {
    try {
        const capabilities = {
            supportedIntents: [
                {
                    intent: "create_task",
                    description: "Create new tasks, notes, or todos",
                    examples: [
                        "Create a task to call the client tomorrow",
                        "Add a note about the meeting discussion",
                        "Remind me to review the budget report"
                    ]
                },
                {
                    intent: "find_objects",
                    description: "Search for existing items",
                    examples: [
                        "Find my tasks for this week",
                        "Show me notes about the project launch",
                        "What are my urgent todos?"
                    ]
                },
                {
                    intent: "schedule_meeting",
                    description: "Create calendar events and meetings",
                    examples: [
                        "Schedule a team meeting for Friday at 2pm",
                        "Book a one-on-one with Sarah next week",
                        "Create a recurring standup every Monday"
                    ]
                },
                {
                    intent: "complex_request",
                    description: "Multi-step operations",
                    examples: [
                        "Find overdue tasks and create a meeting to discuss them",
                        "Show me this week's priorities and schedule time to work on them",
                        "Organize my tasks by project and set deadlines"
                    ]
                },
                {
                    intent: "general_query",
                    description: "General questions and assistance",
                    examples: [
                        "What's on my schedule today?",
                        "How many tasks do I have pending?",
                        "Give me a summary of my week"
                    ]
                }
            ],
            voiceFeatures: [
                "Natural language processing",
                "Intent recognition",
                "Context awareness",
                "Multi-step command execution",
                "Conversational responses",
                "Error handling and clarification"
            ],
            tips: [
                "Speak clearly and at a normal pace",
                "Use natural language - no need for specific commands",
                "Be specific about timeframes and priorities",
                "You can ask follow-up questions",
                "The system learns from context in your conversation"
            ]
        };

        res.json({
            success: true,
            data: capabilities
        });
    } catch (error) {
        console.error("Error getting voice capabilities:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get voice capabilities"
        });
    }
};

/**
 * Handle wake word activation
 */
export const handleWakeWord = async (req, res) => {
    try {
        const { wakeWord, context = {} } = req.body;

        if (!wakeWord) {
            return res.status(400).json({
                success: false,
                error: "Wake word is required"
            });
        }

        // Validate wake word
        const validWakeWords = ["hey march", "hi march", "hello march"];
        const normalizedWakeWord = wakeWord.toLowerCase().trim();

        if (!validWakeWords.some((word) => normalizedWakeWord.includes(word))) {
            return res.status(400).json({
                success: false,
                error: "Invalid wake word"
            });
        }

        // Log wake word activation
        console.log(`Wake word activated: "${wakeWord}"`);

        res.json({
            success: true,
            data: {
                activated: true,
                wakeWord: normalizedWakeWord,
                message: "Hey! I'm listening. What can I help you with?",
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Wake word handling error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to handle wake word activation"
        });
    }
};

/**
 * Health check for voice services
 */
export const voiceHealthCheck = async (req, res) => {
    try {
    // Simple health check since we're using intelligent AI directly
        res.json({
            success: true,
            data: {
                status: "healthy",
                services: {
                    voiceRecognition: true,
                    intelligentAI: true
                },
                wakeWordSupport: false, // Disabled continuous wake word
                supportedFeatures: ["click-to-speak", "voice-responses"],
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Voice health check error:", error);
        res.status(500).json({
            success: false,
            error: "Voice services health check failed",
            timestamp: new Date().toISOString()
        });
    }
};
