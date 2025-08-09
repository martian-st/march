import { GoogleGenerativeAI } from "@google/generative-ai";

export class VoiceRecognitionService {
    constructor (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    /**
   * Process voice input and extract user intent
   * @param {string} transcribedText - The transcribed voice text
   * @param {Object} context - Additional context for better understanding
   * @returns {Object} Processed voice command with intent and parameters
   */
    async processVoiceCommand (transcribedText, context = {}) {
        try {
            const prompt = this.buildVoiceProcessingPrompt(transcribedText, context);
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            return this.parseVoiceResponse(response, transcribedText);
        } catch (error) {
            console.error("Voice processing error:", error);
            return {
                success: false,
                error: "Failed to process voice command",
                originalText: transcribedText,
                fallback: {
                    intent: "general_query",
                    query: transcribedText,
                    confidence: 0.5
                }
            };
        }
    }

    /**
   * Build prompt for voice command processing
   */
    buildVoiceProcessingPrompt (transcribedText, context) {
        return `
You are a voice command processor for a productivity AI assistant. Your job is to analyze voice input and extract actionable intent.

Voice Input: "${transcribedText}"
Context: ${JSON.stringify(context)}

Analyze this voice command and respond with a JSON object containing:
{
    "intent": "one of: greeting, create_task, find_objects, schedule_meeting, general_query, complex_request",
    "confidence": 0.0-1.0,
    "parameters": {
        "query": "cleaned up version of the user's request",
        "urgency": "low|medium|high",
        "timeframe": "extracted time information if any",
        "entities": ["extracted important entities"],
        "action_type": "specific action if clear"
    },
    "voice_context": {
        "speaking_style": "formal|casual|urgent",
        "clarity": "clear|unclear|partial",
        "completeness": "complete|incomplete"
    },
    "suggested_response": "Natural, conversational response that sounds human-like"
}

Consider:
- Voice commands are often more casual and conversational
- Users might use filler words, pauses, or incomplete sentences
- Extract the core intent even from imperfect speech
- Handle common voice command patterns like "Hey, can you...", "I need to...", "Find me..."
- Identify urgency from tone indicators like "urgent", "ASAP", "when you get a chance"
- Greetings like "hey March", "hello", "hi" should be classified as "greeting" intent
- Responses should be warm, natural, and human-like - avoid robotic language
- Use contractions and casual language when appropriate

Respond only with valid JSON.
        `;
    }

    /**
   * Parse the AI response for voice command
   */
    parseVoiceResponse (response, originalText) {
        try {
            // Clean up the response to extract JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                success: true,
                originalText,
                intent: parsed.intent,
                confidence: parsed.confidence,
                parameters: parsed.parameters,
                voiceContext: parsed.voice_context,
                suggestedResponse: parsed.suggested_response,
                processedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error("Failed to parse voice response:", error);
            return {
                success: false,
                error: "Failed to parse voice command",
                originalText,
                fallback: {
                    intent: "general_query",
                    query: originalText,
                    confidence: 0.3
                }
            };
        }
    }

    /**
   * Convert voice command to AI assistant query
   */
    async convertToAssistantQuery (voiceResult) {
        if (!voiceResult.success) {
            return voiceResult.fallback;
        }

        const { intent, parameters, voiceContext } = voiceResult;

        // Map voice intents to assistant queries
        const queryMapping = {
            greeting: this.buildGreetingQuery(parameters),
            create_task: this.buildCreateTaskQuery(parameters),
            find_objects: this.buildFindObjectsQuery(parameters),
            schedule_meeting: this.buildScheduleMeetingQuery(parameters),
            complex_request: this.buildComplexRequestQuery(parameters),
            general_query: this.buildGeneralQuery(parameters)
        };

        const assistantQuery = queryMapping[intent] || queryMapping.general_query;

        return {
            ...assistantQuery,
            voiceMetadata: {
                originalText: voiceResult.originalText,
                confidence: voiceResult.confidence,
                voiceContext,
                processedAt: voiceResult.processedAt
            }
        };
    }

    buildGreetingQuery (parameters) {
        return {
            type: "greeting",
            query: parameters.query,
            context: {
                source: "voice",
                greeting: true
            }
        };
    }

    buildCreateTaskQuery (parameters) {
        return {
            type: "create",
            query: parameters.query,
            context: {
                urgency: parameters.urgency,
                timeframe: parameters.timeframe,
                entities: parameters.entities,
                source: "voice"
            }
        };
    }

    buildFindObjectsQuery (parameters) {
        return {
            type: "find",
            query: parameters.query,
            options: {
                urgency: parameters.urgency,
                timeframe: parameters.timeframe,
                entities: parameters.entities,
                source: "voice"
            }
        };
    }

    buildScheduleMeetingQuery (parameters) {
        return {
            type: "calendar",
            query: parameters.query,
            action: "create",
            context: {
                timeframe: parameters.timeframe,
                urgency: parameters.urgency,
                source: "voice"
            }
        };
    }

    buildComplexRequestQuery (parameters) {
        return {
            type: "process",
            query: parameters.query,
            context: {
                urgency: parameters.urgency,
                timeframe: parameters.timeframe,
                entities: parameters.entities,
                source: "voice",
                multiStep: true
            }
        };
    }

    buildGeneralQuery (parameters) {
        return {
            type: "process",
            query: parameters.query,
            context: {
                source: "voice",
                general: true
            }
        };
    }

    /**
   * Generate voice-friendly response
   */
    generateVoiceResponse (assistantResult, voiceMetadata) {
        if (!assistantResult || !assistantResult.success) {
            return {
                text: "I'm sorry, I couldn't process that request. Could you try rephrasing it?",
                shouldSpeak: true,
                confidence: 0.3
            };
        }

        // Generate conversational response based on the result
        const responseText = this.buildConversationalResponse(
            assistantResult,
            voiceMetadata
        );

        return {
            text: responseText,
            shouldSpeak: true,
            confidence: voiceMetadata?.confidence || 0.5,
            data: assistantResult.data || {}
        };
    }

    buildConversationalResponse (result, voiceMetadata) {
        // Handle case where result or data might be undefined
        if (!result || !result.data) {
            return "I've processed your request. Let me know if you need anything else!";
        }

        const { data } = result;

        // Handle greetings first
        if (data && data.greeting) {
            return this.getGreetingResponse(voiceMetadata);
        }

        if (data && data.steps && data.steps.length > 0) {
            // Multi-step response
            const successfulSteps = data.steps.filter((step) => step.success).length;
            const totalSteps = data.steps.length;

            if (successfulSteps === totalSteps) {
                return `Great! I've completed all ${totalSteps} steps. ${data.finalResult?.summary || "Everything is done."}`;
            } else {
                return `I've completed ${successfulSteps} out of ${totalSteps} steps. ${data.finalResult?.summary || "Some tasks may need your attention."}`;
            }
        }

        if (data && data.objects && data.objects.length > 0) {
            // Object finding response
            const count = data.objects.length;
            const types = [...new Set(data.objects.map((obj) => obj.type))];
            return `I found ${count} items: ${types.join(", ")}. Would you like me to show them to you?`;
        }

        if (data && data.created) {
            // Object creation response
            return `Perfect! I've created that for you. It's been added to your workspace.`;
        }

        // Handle simple greetings and basic responses
        if (voiceMetadata && voiceMetadata.originalText) {
            const text = voiceMetadata.originalText.toLowerCase().trim();

            // Handle greetings specifically
            if (
                text.includes("hey march") ||
                text.includes("hi march") ||
                text.includes("hello march")
            ) {
                return "Hey there! I'm March, your AI assistant. What can I help you with today?";
            }
            if (
                text.includes("hello") ||
                text.includes("hi") ||
                text.includes("hey")
            ) {
                return "Hello! I'm here to help. What would you like to do?";
            }
            if (text.includes("thank") || text.includes("thanks")) {
                return "You're very welcome! Happy to help anytime.";
            }
            if (text.includes("how are you")) {
                return "I'm doing great, thanks for asking! Ready to help you be more productive. What's on your mind?";
            }
            if (text.includes("what is march") || text.includes("who are you")) {
                return "I'm March, your AI-powered productivity assistant! I can help you create tasks, find information, schedule meetings, and much more. Just tell me what you need!";
            }
        }

        // Default response
        return "I've processed your request. Let me know if you need anything else!";
    }

    getGreetingResponse (voiceMetadata) {
        if (!voiceMetadata || !voiceMetadata.originalText) {
            return "Hello! How can I help you today?";
        }

        const text = voiceMetadata.originalText.toLowerCase().trim();

        // Personalized greeting responses
        if (
            text.includes("hey march") ||
            text.includes("hi march") ||
            text.includes("hello march")
        ) {
            const responses = [
                "Hey there! I'm March, your AI assistant. What can I help you with today?",
                "Hi! I'm here and ready to help. What's on your mind?",
                "Hello! Great to hear from you. How can I make your day more productive?"
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }

        if (
            text.includes("what is march") ||
            text.includes("who are you") ||
            text.includes("what are you")
        ) {
            return "I'm March, your AI-powered productivity assistant! I can help you create tasks, find information, schedule meetings, and much more. Just tell me what you need!";
        }

        if (text.includes("how are you")) {
            return "I'm doing great, thanks for asking! Ready to help you be more productive. What would you like to work on?";
        }

        // Default friendly greeting
        const defaultGreetings = [
            "Hello! I'm here to help. What would you like to do?",
            "Hi there! How can I assist you today?",
            "Hey! Ready to help you get things done. What's up?"
        ];
        return defaultGreetings[
            Math.floor(Math.random() * defaultGreetings.length)
        ];
    }

    /**
   * Generate simple voice response for intelligent AI results
   */
    generateSimpleVoiceResponse (assistantResult, originalText) {
        if (!assistantResult || !assistantResult.success) {
            return {
                text: "I'm sorry, I couldn't process that request. Could you try rephrasing it?",
                shouldSpeak: true,
                confidence: 0.3
            };
        }

        // Handle ONLY pure greetings, not requests that start with greetings
        if (originalText) {
            const text = originalText.toLowerCase().trim();

            // Only respond with greeting if it's JUST a greeting, not a request
            const isPureGreeting = (
                (text === 'hey march' || text === 'hi march' || text === 'hello march') ||
                (text === 'hello' || text === 'hi' || text === 'hey') ||
                (text === 'hey there' || text === 'hello there') ||
                (text === 'good morning' || text === 'good afternoon' || text === 'good evening')
            );

            if (isPureGreeting) {
                return {
                    text: "Hello! How can I help you today?",
                    shouldSpeak: true,
                    confidence: 0.9
                };
            }
        }

        // Use the response from intelligent AI if available
        if (assistantResult.data && assistantResult.data.response) {
            return {
                text: assistantResult.data.response,
                shouldSpeak: true,
                confidence: 0.8
            };
        }

        // Fallback response
        return {
            text: "I've processed your request successfully!",
            shouldSpeak: true,
            confidence: 0.7
        };
    }
}
