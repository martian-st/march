import { ChainOfThoughtService } from "../../services/ai/chain-of-thought.service.js";
import { UserLearningService } from "../../services/ai/user-learning.service.js";
import { CalendarIntegrationService } from "../../services/ai/calendar-integration.service.js";
import { AdvancedObjectManagerService } from "../../services/ai/advanced-object-manager.service.js";
import { ENHANCED_SYSTEM_PROMPT } from "../../prompts/enhanced-system.prompt.js";
import { aiErrorHandler } from "../../utils/ai-error-handler.js";

/**
 * Intelligent AI Controller
 * Uses machine learning and user pattern recognition to understand natural language
 * without relying on keyword matching or rigid routing
 */
export class IntelligentAIController {
    constructor () {
        this.chainOfThought = new ChainOfThoughtService(
            process.env.GOOGLE_AI_API_KEY,
            ENHANCED_SYSTEM_PROMPT
        );
        this.userLearning = new UserLearningService(process.env.GOOGLE_AI_API_KEY);
        this.calendarService = new CalendarIntegrationService(
            process.env.GOOGLE_AI_API_KEY
        );
        this.objectManager = new AdvancedObjectManagerService(
            process.env.GOOGLE_AI_API_KEY
        );
    }

    /**
   * Single intelligent endpoint that handles all user requests
   * Uses user learning and context to understand intent naturally
   */
    async processIntelligentRequest (req, res) {
        try {
            const { query, context = {} } = req.body;
            const userId = req.user?._id;

            if (!query?.trim()) {
                return res.status(400).json({
                    error: "Query is required",
                    success: false
                });
            }

            // Set up streaming response with CORS headers preserved
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Transfer-Encoding", "chunked");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            // Ensure CORS headers are set for streaming responses
            const origin = req.headers.origin;
            if (
                origin &&
        [
            "http://localhost:3000",
            "https://app.march.cat",
            "https://march.cat"
        ].includes(origin)
            ) {
                res.setHeader("Access-Control-Allow-Origin", origin);
                res.setHeader("Access-Control-Allow-Credentials", "true");
                res.setHeader(
                    "Access-Control-Allow-Methods",
                    "GET, POST, PUT, DELETE, OPTIONS"
                );
                res.setHeader(
                    "Access-Control-Allow-Headers",
                    "Content-Type, Authorization, sec-websocket-protocol"
                );
            }

            // Send initial thinking message
            res.write(
                JSON.stringify({
                    status: "thinking",
                    message: "Understanding your request..."
                }) + "\n"
            );

            // Step 1: Predict user intent using learned patterns
            let intentPrediction;
            try {
                intentPrediction = await this.userLearning.predictUserIntent(
                    userId,
                    query
                );
            } catch (error) {
                console.error("Error predicting intent:", error);
                // Fallback for simple conversations
                if (this.isSimpleGreeting(query)) {
                    res.write(
                        JSON.stringify({
                            status: "completed",
                            message: "Hello! I'm experiencing some technical difficulties right now, but I'm here to help. How can I assist you today?",
                            data: {
                                isConversational: true,
                                response: "Hello! I'm experiencing some technical difficulties right now, but I'm here to help. How can I assist you today?",
                                success: true
                            },
                            success: true
                        }) + "\n"
                    );
                    res.end();
                    return;
                }

                // Default fallback
                intentPrediction = {
                    operationType: "conversational",
                    confidence: 50,
                    reasoning: "Fallback due to prediction error",
                    suggestedAction: "Handle as conversation"
                };
            }

            // Send progress update (without exposing learning details)
            res.write(
                JSON.stringify({
                    status: "progress",
                    message: "Working on your request..."
                }) + "\n"
            );

            // Step 2: Execute the request using the predicted intent
            const result = await this.executeIntelligentRequest(
                query,
                userId,
                intentPrediction,
                context,
                res
            );

            // Step 3: Learn from this interaction (silently in background)
            try {
                await this.userLearning.learnFromInteraction(userId, query, result);
            } catch (learningError) {
                // Learning failures shouldn't affect the user experience
                console.error('Learning failed (non-critical):', learningError.message);
            }

            // Send final result (without exposing learning details)
            res.write(
                JSON.stringify({
                    status: "completed",
                    data: result,
                    success: result.success !== false
                }) + "\n"
            );

            res.end();
        } catch (error) {
            console.error("Error in processIntelligentRequest:", error);
            aiErrorHandler.logError(error, { userId: req.user?._id, query: req.body?.query, method: 'processIntelligentRequest' });

            // Get user-friendly error message
            const userError = aiErrorHandler.getUserFriendlyError(error, { query: req.body?.query });

            if (!res.headersSent) {
                res.status(500).json({
                    error: userError.message,
                    success: false,
                    retryable: userError.retryable,
                    type: userError.type
                });
            } else {
                // For streaming responses, send fallback response
                const fallbackResponse = aiErrorHandler.createFallbackResponse(req.body?.query || 'help');

                res.write(
                    JSON.stringify({
                        status: "completed",
                        message: fallbackResponse.message,
                        data: fallbackResponse.data,
                        success: true,
                        fallback: true
                    }) + "\n"
                );
                res.end();
            }
        }
    }

    /**
   * Execute request based on predicted intent
   */
    async executeIntelligentRequest (
        query,
        userId,
        intentPrediction,
        context,
        res
    ) {
        const { operationType, confidence } = intentPrediction;

        // If confidence is low, still try to help but use chain of thought as backup
        if (confidence < 50) {
            res.write(
                JSON.stringify({
                    status: "processing",
                    message: "Let me think about that..."
                }) + "\n"
            );

            return await this.chainOfThought.processComplexRequest(query, userId, {
                ...context,
                intentPrediction,
                lowConfidence: true
            });
        }

        // High confidence - execute based on predicted operation
        switch (operationType) {
        case "create":
            return await this.handleIntelligentCreate(
                query,
                userId,
                intentPrediction,
                res
            );

        case "update":
            return await this.handleIntelligentUpdate(
                query,
                userId,
                intentPrediction,
                res
            );

        case "search":
            return await this.handleIntelligentSearch(
                query,
                userId,
                intentPrediction,
                res
            );

        case "schedule":
            return await this.handleIntelligentSchedule(
                query,
                userId,
                intentPrediction,
                res
            );

        case "delete":
            return await this.handleIntelligentDelete(
                query,
                userId,
                intentPrediction,
                res
            );

        default:
        // Fallback to chain of thought for unknown operations
            return await this.chainOfThought.processComplexRequest(query, userId, {
                ...context,
                intentPrediction,
                fallbackReason: "unknown_operation"
            });
        }
    }

    /**
   * Handle intelligent object creation
   */
    async handleIntelligentCreate (query, userId, intentPrediction, res) {
        try {
            res.write(
                JSON.stringify({
                    status: "processing",
                    message: "Creating that for you..."
                }) + "\n"
            );

            // For very vague requests, make reasonable assumptions and create something useful
            if (this.isVagueCreateRequest(query)) {
                // Instead of asking for clarification, create a basic task with a helpful title
                const enhancedQuery = this.enhanceVagueRequest(query);

                const result = await this.objectManager.createIntelligentObject(
                    enhancedQuery,
                    userId,
                    {
                        intentPrediction,
                        originalQuery: query,
                        enhanced: true
                    }
                );

                return {
                    ...result,
                    message:
            "I created a task for you. You can always edit the details later if needed.",
                    operationType: "create",
                    success: true
                };
            }

            // Use object manager for creation
            const result = await this.objectManager.createIntelligentObject(
                query,
                userId,
                {
                    intentPrediction,
                    originalQuery: query
                }
            );

            return {
                ...result,
                operationType: "create",
                success: true
            };
        } catch (error) {
            console.error("Error in intelligent create:", error);
            return {
                error: true,
                message:
          "I had trouble creating that. Could you try rephrasing your request?",
                success: false
            };
        }
    }

    /**
   * Handle intelligent object updates
   */
    async handleIntelligentUpdate (query, userId, intentPrediction, res) {
        try {
            res.write(
                JSON.stringify({
                    status: "processing",
                    message: "Finding and updating objects..."
                }) + "\n"
            );

            // First, find objects that match the update criteria
            const searchResult = await this.objectManager.findIntelligentObjects(
                this.extractSearchTermsFromUpdate(query),
                userId,
                { limit: 50 }
            );

            if (!searchResult.objects || searchResult.objects.length === 0) {
                return {
                    message:
            "I couldn't find any objects matching your update criteria. Could you be more specific about what you want to update?",
                    success: false,
                    operationType: "update"
                };
            }

            // Extract update parameters from the query
            const updateParams = this.extractUpdateParameters(
                query,
                intentPrediction
            );

            if (!updateParams || Object.keys(updateParams).length === 0) {
                return {
                    needsClarification: true,
                    message: `I found ${searchResult.objects.length} objects, but I'm not sure what you want to update. What changes would you like to make?`,
                    foundObjects: searchResult.objects.slice(0, 5),
                    questions: [
                        {
                            question: "What would you like to update?",
                            suggestions: [
                                "Set due date to next Friday",
                                "Change priority to high",
                                "Mark as completed"
                            ]
                        }
                    ],
                    success: true
                };
            }

            // Perform bulk update
            const updateResults = await this.performBulkUpdate(
                searchResult.objects,
                updateParams,
                userId,
                res
            );

            return {
                message: `Updated ${updateResults.successCount} objects`,
                updatedObjects: updateResults.updated,
                failedUpdates: updateResults.failed,
                operationType: "update",
                success: updateResults.successCount > 0
            };
        } catch (error) {
            console.error("Error in intelligent update:", error);
            return {
                error: true,
                message: error.message,
                success: false
            };
        }
    }

    /**
   * Handle intelligent search
   */
    async handleIntelligentSearch (query, userId, intentPrediction, res) {
        try {
            res.write(
                JSON.stringify({
                    status: "processing",
                    message: "Searching through your objects..."
                }) + "\n"
            );

            const result = await this.objectManager.findIntelligentObjects(
                query,
                userId,
                {
                    intentPrediction,
                    includeContext: true
                }
            );

            return {
                ...result,
                operationType: "search",
                success: true
            };
        } catch (error) {
            console.error("Error in intelligent search:", error);
            return {
                error: true,
                message: error.message,
                success: false
            };
        }
    }

    /**
   * Handle intelligent scheduling
   */
    async handleIntelligentSchedule (query, userId, intentPrediction, res) {
        try {
            res.write(
                JSON.stringify({
                    status: "processing",
                    message: "Creating calendar event..."
                }) + "\n"
            );

            const result = await this.calendarService.createIntelligentEvent(
                query,
                userId,
                {
                    intentPrediction,
                    originalQuery: query
                }
            );

            return {
                ...result,
                operationType: "schedule",
                success: true
            };
        } catch (error) {
            console.error("Error in intelligent schedule:", error);
            return {
                error: true,
                message: error.message,
                success: false
            };
        }
    }

    /**
   * Handle intelligent deletion
   */
    async handleIntelligentDelete (query, userId, intentPrediction, res) {
        try {
            res.write(
                JSON.stringify({
                    status: "processing",
                    message: "Finding objects to delete..."
                }) + "\n"
            );

            // This is a dangerous operation, always ask for confirmation
            const searchResult = await this.objectManager.findIntelligentObjects(
                this.extractSearchTermsFromDelete(query),
                userId,
                { limit: 10 }
            );

            return {
                needsClarification: true,
                message: `I found ${searchResult.objects?.length || 0} objects that match your deletion criteria. Are you sure you want to delete them?`,
                foundObjects: searchResult.objects?.slice(0, 5) || [],
                questions: [
                    {
                        question: "Confirm deletion:",
                        suggestions: [
                            "Yes, delete them",
                            "No, cancel",
                            "Show me more details first"
                        ]
                    }
                ],
                operationType: "delete",
                success: true
            };
        } catch (error) {
            console.error("Error in intelligent delete:", error);
            return {
                error: true,
                message: error.message,
                success: false
            };
        }
    }

    /**
   * Check if create request is too vague
   */
    isVagueCreateRequest (query) {
        const vaguePhrases = [
            /^(can you |could you |please )?create a task( for me)?$/i,
            /^(can you |could you |please )?add a task( for me)?$/i,
            /^(can you |could you |please )?make a task( for me)?$/i,
            /^create something$/i,
            /^add something$/i,
            /^make something$/i
        ];

        return vaguePhrases.some((pattern) => pattern.test(query.trim()));
    }

    /**
   * Enhance vague requests with reasonable defaults
   */
    enhanceVagueRequest (query) {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes("task")) {
            return "Create a new task - please update the title and details";
        }

        if (lowerQuery.includes("note")) {
            return "Create a new note";
        }

        if (lowerQuery.includes("meeting")) {
            return "Schedule a new meeting";
        }

        // Default enhancement
        return "Create a new task - please update the title and details";
    }

    /**
   * Extract search terms from update query
   */
    extractSearchTermsFromUpdate (query) {
    // Remove update-related words to get the search terms
        return query
            .replace(/\b(add|set|change|update|modify|edit)\b/gi, "")
            .replace(/\b(a|an|the|to|all|my)\b/gi, "")
            .replace(/\b(date|priority|status|due)\b/gi, "")
            .trim();
    }

    /**
   * Extract update parameters from query
   */
    extractUpdateParameters (query, intentPrediction) {
        const params = {};
        const lowerQuery = query.toLowerCase();

        // Extract due date updates
        if (/add.*date|set.*date|due.*date/i.test(lowerQuery)) {
            const dateMatch = lowerQuery.match(
                /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|\d{1,2}\/\d{1,2}\/\d{2,4}|today|tomorrow|next\s+\w+)\b/i
            );
            if (dateMatch) {
                params.due = { string: dateMatch[0] };
            }
        }

        // Extract priority updates
        if (/priority|urgent|high|low|medium|critical/i.test(lowerQuery)) {
            const priorityMatch = lowerQuery.match(
                /\b(high|low|medium|urgent|critical|normal)\b/i
            );
            if (priorityMatch) {
                params.priority = priorityMatch[0];
            }
        }

        // Extract status updates
        if (/mark as|set status|change status/i.test(lowerQuery)) {
            const statusMatch = lowerQuery.match(
                /\b(completed|done|finished|pending|in progress|cancelled)\b/i
            );
            if (statusMatch) {
                params.status = statusMatch[0];
            }
        }

        return params;
    }

    /**
   * Perform bulk update on objects
   */
    async performBulkUpdate (objects, updateParams, userId, res) {
        const results = { updated: [], failed: [], successCount: 0 };

        for (let i = 0; i < objects.length; i++) {
            try {
                res.write(
                    JSON.stringify({
                        status: "progress",
                        message: `Updating object ${i + 1} of ${objects.length}...`
                    }) + "\n"
                );

                const updatedObject = await this.objectManager.updateObject(
                    objects[i]._id,
                    updateParams,
                    userId
                );

                results.updated.push(updatedObject);
                results.successCount++;
            } catch (error) {
                results.failed.push({
                    object: objects[i],
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
   * Extract search terms from delete query
   */
    extractSearchTermsFromDelete (query) {
        return query
            .replace(/\b(delete|remove|trash|destroy)\b/gi, "")
            .replace(/\b(all|my|the)\b/gi, "")
            .trim();
    }

    /**
   * Get user learning statistics
   */
    async getUserLearningStats (req, res) {
        try {
            const userId = req.user?._id || "anonymous-user";
            const stats = this.userLearning.getUserLearningStats(userId);

            res.json({
                success: true,
                data: stats,
                message: "Learning statistics retrieved"
            });
        } catch (error) {
            console.error("Error getting learning stats:", error);
            res.status(500).json({
                error: "Error retrieving learning statistics",
                message: error.message,
                success: false
            });
        }
    }

    /**
   * Reset user learning data
   */
    async resetUserLearning (req, res) {
        try {
            const userId = req.user?._id || "anonymous-user";

            // Export current data for backup
            const backup = this.userLearning.exportUserData(userId);

            // Clear learning data
            this.userLearning.userPatterns.delete(userId);
            this.userLearning.userContext.delete(userId);
            this.userLearning.userPreferences.delete(userId);
            this.userLearning.interactionHistory.delete(userId);

            res.json({
                success: true,
                data: { backup },
                message: "User learning data reset successfully"
            });
        } catch (error) {
            console.error("Error resetting learning data:", error);
            res.status(500).json({
                error: "Error resetting learning data",
                message: error.message,
                success: false
            });
        }
    }

    /**
   * Check if query is a simple greeting (fallback method)
   */
    isSimpleGreeting (query) {
        const simpleGreetings = [
            "hi",
            "hello",
            "hey",
            "hiya",
            "good morning",
            "good afternoon",
            "good evening"
        ];
        const lowerQuery = query.toLowerCase().trim();
        return simpleGreetings.some((greeting) => lowerQuery.startsWith(greeting));
    }

    /**
   * Generate simple conversational response when AI is unavailable
   */
    getSimpleConversationalResponse (query) {
        const lowerQuery = query.toLowerCase().trim();

        if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
            return "Hello! I'm March AI, your productivity assistant. I'm experiencing some technical difficulties right now, but I'm here to help. What can I do for you?";
        }

        if (lowerQuery.includes('who are you') || lowerQuery.includes('what are you')) {
            return "I'm March AI, your friendly productivity assistant. I can help with scheduling, finding information, managing tasks, and more. I'm having some technical issues at the moment, but please try your request again.";
        }

        if (lowerQuery.includes('what can you do') || lowerQuery.includes('help')) {
            return "I'm March AI and I can help with scheduling meetings, finding information, managing tasks, and much more. I'm experiencing some technical difficulties right now, but please try again in a moment.";
        }

        return "I'm experiencing some technical difficulties at the moment, but I'm here to help. Please try your request again in a few seconds.";
    }

    /**
   * Health check endpoint
   */
    async healthCheck (req, res) {
        try {
            const status = {
                chainOfThought: !!this.chainOfThought,
                userLearning: !!this.userLearning,
                calendarService: !!this.calendarService,
                objectManager: !!this.objectManager,
                timestamp: new Date().toISOString(),
                version: "2.0.0-intelligent"
            };

            res.json({
                success: true,
                data: status,
                message: "Intelligent AI services are healthy"
            });
        } catch (error) {
            console.error("Error in healthCheck:", error);
            res.status(500).json({
                error: "Health check failed",
                message: error.message,
                success: false
            });
        }
    }
}

// Create singleton instance
export const intelligentAIController = new IntelligentAIController();
