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
   * Build prompt for voice command processing with source awareness
   */
    buildVoiceProcessingPrompt (transcribedText, context) {
        return `
You are a voice command processor for a productivity AI assistant. Your job is to analyze voice input and extract actionable intent with source awareness.

Voice Input: "${transcribedText}"
Context: ${JSON.stringify(context)}

Analyze this voice command and respond with a JSON object containing:
{
    "intent": "one of: greeting, create_task, find_objects, schedule_meeting, general_query, complex_request, source_query, integration_status",
    "confidence": 0.0-1.0,
    "parameters": {
        "query": "cleaned up version of the user's request",
        "urgency": "low|medium|high",
        "timeframe": "extracted time information if any",
        "entities": ["extracted important entities"],
        "action_type": "specific action if clear",
        "source_filter": "detected source platform if mentioned",
        "cross_platform": "true if query involves multiple sources"
    },
    "source_context": {
        "mentioned_platforms": ["list of platforms mentioned: linear, gmail, github, twitter, calendar, march"],
        "platform_specific": "true if query is specific to one platform",
        "integration_query": "true if asking about integration status or health",
        "bulk_operation": "true if operation affects multiple sources"
    },
    "voice_context": {
        "speaking_style": "formal|casual|urgent",
        "clarity": "clear|unclear|partial",
        "completeness": "complete|incomplete"
    },
    "suggested_response": "Natural, conversational response that sounds human-like and acknowledges source context"
}

Platform Recognition Patterns:
- "Linear" or "Linear tasks" → source: linear
- "Gmail" or "email" or "emails" → source: gmail  
- "GitHub" or "Git" or "repositories" or "repos" → source: github
- "Twitter" or "X" or "tweets" → source: twitter
- "Calendar" or "meetings" or "events" → source: cal
- "March" or "my tasks" (without platform) → source: march

Source-Specific Query Examples:
- "Do I have any Linear tasks?" → intent: find_objects, source_filter: linear
- "Show me new Gmail items" → intent: find_objects, source_filter: gmail, timeframe: recent
- "Any GitHub issues assigned to me?" → intent: find_objects, source_filter: github
- "What's new from all my integrations?" → intent: source_query, cross_platform: true
- "Are my integrations working?" → intent: integration_status
- "Create a task from this Twitter thread" → intent: create_task, source_context: twitter

Consider:
- Voice commands are often more casual and conversational
- Users might use filler words, pauses, or incomplete sentences
- Extract the core intent even from imperfect speech
- Handle common voice command patterns like "Hey, can you...", "I need to...", "Find me..."
- Identify urgency from tone indicators like "urgent", "ASAP", "when you get a chance"
- Greetings like "hey March", "hello", "hi" should be classified as "greeting" intent
- Platform names might be mispronounced or abbreviated (e.g., "Git" for "GitHub")
- Responses should be warm, natural, and human-like - avoid robotic language
- Use contractions and casual language when appropriate
- Acknowledge source context in responses when relevant

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
                sourceContext: parsed.source_context,
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

        const { intent, parameters, voiceContext, sourceContext } = voiceResult;

        // Map voice intents to assistant queries
        const queryMapping = {
            greeting: this.buildGreetingQuery(parameters),
            create_task: this.buildCreateTaskQuery(parameters),
            find_objects: this.buildFindObjectsQuery(parameters),
            schedule_meeting: this.buildScheduleMeetingQuery(parameters),
            complex_request: this.buildComplexRequestQuery(parameters),
            source_query: this.buildSourceQuery(parameters, voiceResult.sourceContext),
            integration_status: this.buildIntegrationStatusQuery(parameters, voiceResult.sourceContext),
            general_query: this.buildGeneralQuery(parameters)
        };

        const assistantQuery = queryMapping[intent] || queryMapping.general_query;

        return {
            ...assistantQuery,
            voiceMetadata: {
                originalText: voiceResult.originalText,
                confidence: voiceResult.confidence,
                voiceContext,
                sourceContext,
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
                source: "voice",
                sourceContext: parameters.source_filter,
                crossPlatform: parameters.cross_platform === "true"
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
                source: "voice",
                sourceFilter: parameters.source_filter,
                crossPlatform: parameters.cross_platform === "true"
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
                general: true,
                sourceFilter: parameters.source_filter,
                crossPlatform: parameters.cross_platform === "true"
            }
        };
    }

    buildSourceQuery (parameters, sourceContext) {
        return {
            type: "source_query",
            query: parameters.query,
            context: {
                source: "voice",
                sourceFilter: parameters.source_filter,
                crossPlatform: parameters.cross_platform === "true",
                mentionedPlatforms: sourceContext?.mentioned_platforms || [],
                bulkOperation: sourceContext?.bulk_operation === "true"
            }
        };
    }

    buildIntegrationStatusQuery (parameters, sourceContext) {
        return {
            type: "integration_status",
            query: parameters.query,
            context: {
                source: "voice",
                mentionedPlatforms: sourceContext?.mentioned_platforms || [],
                integrationQuery: true
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

        // Check if confirmation is needed for bulk or cross-platform operations
        if (assistantResult.data && assistantResult.data.needsConfirmation) {
            return this.generateConfirmationResponse(assistantResult.data, voiceMetadata);
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
            data: assistantResult.data || {},
            needsConfirmation: false
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
            // Object finding response with source awareness
            const count = data.objects.length;
            const types = [...new Set(data.objects.map((obj) => obj.type))];
            const sources = [...new Set(data.objects.map((obj) => obj.source).filter(Boolean))];
            
            let response = `I found ${count} ${count === 1 ? 'item' : 'items'}`;
            
            if (types.length > 0) {
                response += ` (${types.join(", ")})`;
            }
            
            if (sources.length > 1) {
                response += ` from ${sources.join(", ")}`;
            } else if (sources.length === 1 && sources[0] !== 'march') {
                response += ` from ${this.formatSourceName(sources[0])}`;
            }
            
            response += ". Would you like me to show them to you?";
            return response;
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

        // Handle source-specific responses
        if (data && data.sourceBreakdown) {
            return this.generateSourceBreakdownResponse(data.sourceBreakdown);
        }

        if (data && data.integrationStatus) {
            return this.generateIntegrationStatusResponse(data.integrationStatus);
        }

        // Default response
        return "I've processed your request. Let me know if you need anything else!";
    }

    /**
     * Format source names for voice responses
     */
    formatSourceName(source) {
        const sourceNames = {
            'linear': 'Linear',
            'gmail': 'Gmail',
            'github': 'GitHub', 
            'twitter': 'Twitter',
            'cal': 'Calendar',
            'march': 'March',
            'march-ai': 'March AI'
        };
        return sourceNames[source] || source;
    }

    /**
     * Generate voice response for source breakdown
     */
    generateSourceBreakdownResponse(sourceBreakdown) {
        const sources = Object.keys(sourceBreakdown);
        if (sources.length === 0) {
            return "I didn't find any items from your integrations.";
        }

        if (sources.length === 1) {
            const source = sources[0];
            const count = sourceBreakdown[source].count;
            return `I found ${count} ${count === 1 ? 'item' : 'items'} from ${this.formatSourceName(source)}.`;
        }

        let response = "Here's what I found: ";
        const sourceSummaries = sources.map(source => {
            const count = sourceBreakdown[source].count;
            return `${count} from ${this.formatSourceName(source)}`;
        });
        
        response += sourceSummaries.join(", ");
        return response + ".";
    }

    /**
     * Generate voice response for integration status
     */
    generateIntegrationStatusResponse(integrationStatus) {
        const workingIntegrations = integrationStatus.filter(status => status.healthy).length;
        const totalIntegrations = integrationStatus.length;

        if (workingIntegrations === totalIntegrations) {
            return `All ${totalIntegrations} of your integrations are working properly!`;
        } else if (workingIntegrations === 0) {
            return "It looks like there are some issues with your integrations. Would you like me to help troubleshoot?";
        } else {
            const problematicSources = integrationStatus
                .filter(status => !status.healthy)
                .map(status => this.formatSourceName(status.source));
            
            return `${workingIntegrations} out of ${totalIntegrations} integrations are working. There seem to be issues with ${problematicSources.join(" and ")}.`;
        }
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

    /**
     * Generate voice confirmation response for bulk operations
     */
    generateConfirmationResponse(data, voiceMetadata) {
        const { foundObjects = [], operationType, crossPlatform, sourceBreakdown } = data;
        const count = foundObjects.length;
        
        let confirmationText = "";
        
        if (operationType === 'delete') {
            confirmationText = `I found ${count} ${count === 1 ? 'item' : 'items'} to delete`;
        } else if (operationType === 'update') {
            confirmationText = `I found ${count} ${count === 1 ? 'item' : 'items'} to update`;
        } else {
            confirmationText = `This operation will affect ${count} ${count === 1 ? 'item' : 'items'}`;
        }

        // Add source breakdown for cross-platform operations
        if (crossPlatform && sourceBreakdown) {
            const sources = Object.keys(sourceBreakdown);
            if (sources.length > 1) {
                const sourceSummary = sources.map(source => 
                    `${sourceBreakdown[source].count} from ${this.formatSourceName(source)}`
                ).join(", ");
                confirmationText += ` across multiple platforms: ${sourceSummary}`;
            }
        }

        confirmationText += ". Would you like me to proceed? Say 'yes' to confirm or 'no' to cancel.";

        return {
            text: confirmationText,
            shouldSpeak: true,
            confidence: 0.9,
            needsConfirmation: true,
            confirmationData: {
                operationType,
                affectedItems: count,
                crossPlatform,
                sourceBreakdown,
                pendingOperation: data
            }
        };
    }

    /**
     * Process confirmation response
     */
    processConfirmationResponse(userResponse, confirmationData) {
        const response = userResponse.toLowerCase().trim();
        
        // Positive confirmations
        const positiveResponses = [
            'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'proceed', 
            'go ahead', 'do it', 'confirm', 'continue', 'affirmative'
        ];
        
        // Negative confirmations  
        const negativeResponses = [
            'no', 'nope', 'cancel', 'stop', 'abort', 'nevermind', 
            'never mind', 'don\'t', 'negative'
        ];

        if (positiveResponses.some(phrase => response.includes(phrase))) {
            return {
                confirmed: true,
                message: "Confirmed! I'll proceed with the operation.",
                shouldSpeak: true,
                operationData: confirmationData.pendingOperation
            };
        }

        if (negativeResponses.some(phrase => response.includes(phrase))) {
            return {
                confirmed: false,
                message: "Operation cancelled. No changes were made.",
                shouldSpeak: true,
                cancelled: true
            };
        }

        // Unclear response - ask for clarification
        return {
            confirmed: null,
            message: "I didn't catch that. Please say 'yes' to confirm or 'no' to cancel the operation.",
            shouldSpeak: true,
            needsClarification: true
        };
    }

    /**
     * Generate audio summary with source breakdown
     */
    generateAudioSummaryWithSources(results, operation = 'operation') {
        if (!results || !results.objects || results.objects.length === 0) {
            return `No items found for this ${operation}.`;
        }

        const count = results.objects.length;
        const sources = [...new Set(results.objects.map(obj => obj.source).filter(Boolean))];
        
        let summary = `${operation} completed successfully. `;
        
        if (count === 1) {
            summary += "1 item was processed";
        } else {
            summary += `${count} items were processed`;
        }

        if (sources.length > 1) {
            const sourceCounts = {};
            results.objects.forEach(obj => {
                if (obj.source) {
                    sourceCounts[obj.source] = (sourceCounts[obj.source] || 0) + 1;
                }
            });

            const sourceDetails = Object.entries(sourceCounts)
                .map(([source, count]) => `${count} from ${this.formatSourceName(source)}`)
                .join(", ");
            
            summary += ` across multiple platforms: ${sourceDetails}`;
        } else if (sources.length === 1 && sources[0] !== 'march') {
            summary += ` from ${this.formatSourceName(sources[0])}`;
        }

        return summary + ".";
    }

    /**
     * Generate voice-guided error recovery for integration issues
     */
    generateIntegrationErrorRecovery(error, context) {
        const { integration, operation, alternativeSources = [] } = context;
        
        let recoveryMessage = `I'm having trouble with ${this.formatSourceName(integration)}. `;
        
        if (alternativeSources.length > 0) {
            const alternatives = alternativeSources.map(source => this.formatSourceName(source)).join(" or ");
            recoveryMessage += `Would you like me to try using ${alternatives} instead? `;
            recoveryMessage += "Say 'yes' to use alternatives or 'retry' to try again.";
        } else {
            recoveryMessage += "Would you like me to retry the connection or skip this integration for now? ";
            recoveryMessage += "Say 'retry' to try again or 'skip' to continue without it.";
        }

        return {
            text: recoveryMessage,
            shouldSpeak: true,
            confidence: 0.8,
            needsRecoveryChoice: true,
            recoveryOptions: {
                integration,
                operation,
                alternativeSources,
                canRetry: true,
                canSkip: true
            }
        };
    }

    /**
     * Process recovery choice response
     */
    processRecoveryChoice(userResponse, recoveryOptions) {
        const response = userResponse.toLowerCase().trim();
        
        if (response.includes('yes') || response.includes('alternative') || response.includes('use')) {
            return {
                choice: 'use_alternatives',
                message: "I'll use the alternative sources instead.",
                shouldSpeak: true,
                alternatives: recoveryOptions.alternativeSources
            };
        }

        if (response.includes('retry') || response.includes('try again')) {
            return {
                choice: 'retry',
                message: "I'll retry the connection now.",
                shouldSpeak: true,
                integration: recoveryOptions.integration
            };
        }

        if (response.includes('skip') || response.includes('continue') || response.includes('without')) {
            return {
                choice: 'skip',
                message: "I'll continue without this integration for now.",
                shouldSpeak: true,
                skipped: recoveryOptions.integration
            };
        }

        // Unclear response
        return {
            choice: null,
            message: "I didn't understand. Please say 'retry' to try again, 'yes' for alternatives, or 'skip' to continue without it.",
            shouldSpeak: true,
            needsClarification: true
        };
    }
}
