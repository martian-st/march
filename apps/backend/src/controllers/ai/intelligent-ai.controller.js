import { ChainOfThoughtService } from "../../services/ai/chain-of-thought.service.js";
import { UserLearningService } from "../../services/ai/user-learning.service.js";
import { CalendarIntegrationService } from "../../services/ai/calendar-integration.service.js";
import { AdvancedObjectManagerService } from "../../services/ai/advanced-object-manager.service.js";
import { EnhancedErrorHandlerService } from "../../services/ai/enhanced-error-handler.service.js";
import { IntegrationErrorRecoveryService } from "../../services/ai/integration-error-recovery.service.js";
import { ENHANCED_SYSTEM_PROMPT } from "../../prompts/enhanced-system.prompt.js";

/**
 * Intelligent AI Controller
 * Uses machine learning and user pattern recognition to understand natural language
 * without relying on keyword matching or rigid routing
 */
export class IntelligentAIController {
    constructor () {
        this.chainOfThought = new ChainOfThoughtService(process.env.GOOGLE_AI_API_KEY, ENHANCED_SYSTEM_PROMPT);
        this.userLearning = new UserLearningService(process.env.GOOGLE_AI_API_KEY);
        this.calendarService = new CalendarIntegrationService(process.env.GOOGLE_AI_API_KEY);
        this.objectManager = new AdvancedObjectManagerService(process.env.GOOGLE_AI_API_KEY);
        this.errorHandler = new EnhancedErrorHandlerService();
        this.recoveryService = new IntegrationErrorRecoveryService();
    }

    /**
     * Single intelligent endpoint that handles all user requests
     * Uses user learning and context to understand intent naturally
     */
    async processIntelligentRequest (req, res) {
        const { query, context = {} } = req.body;
        const userId = req.user?._id;

        try {

            if (!query?.trim()) {
                return res.status(400).json({
                    error: "Query is required",
                    success: false
                });
            }

            // Set up streaming response
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Transfer-Encoding", "chunked");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            // Send initial thinking message
            res.write(JSON.stringify({
                status: "thinking",
                message: "Understanding your request..."
            }) + "\n");

            // Step 1: Predict user intent using learned patterns
            let intentPrediction;
            try {
                intentPrediction = await this.userLearning.predictUserIntent(userId, query);

                // Add confidence boost for clear search patterns to fix misclassification
                if (this.isLikelySearchQuery(query) && intentPrediction.operationType !== 'search') {
                    console.log(`Correcting misclassified search query: "${query}" was classified as ${intentPrediction.operationType}`);
                    intentPrediction = {
                        operationType: 'search',
                        confidence: 0.9,
                        reasoning: 'Corrected misclassification - clear search pattern detected',
                        suggestedAction: 'Search for existing items',
                        parameters: {
                            search_terms: query.replace(/^(do i have|show me|what|find|any)\s+/i, '').trim()
                        }
                    };
                }
            } catch (error) {
                console.error('Error predicting intent:', error);

                // Use enhanced error handler for intent errors
                const errorHandling = await this.errorHandler.handleIntentError(error, query, userId, context);
                
                if (errorHandling.fallbackIntent) {
                    intentPrediction = errorHandling.fallbackIntent;
                    
                    // Send clarification if needed
                    if (errorHandling.clarificationQuestions && errorHandling.clarificationQuestions.length > 0) {
                        res.write(JSON.stringify({
                            status: "clarification",
                            message: errorHandling.userMessage,
                            questions: errorHandling.clarificationQuestions,
                            suggestions: errorHandling.suggestions
                        }) + "\n");
                    }
                } else {
                    // Improved fallback with search detection
                    if (this.isLikelySearchQuery(query)) {
                        intentPrediction = {
                            operationType: 'search',
                            confidence: 0.8,
                            reasoning: 'Fallback search detection',
                            suggestedAction: 'Search for items'
                        };
                    } else if (this.isSimpleGreeting(query)) {
                        res.write(JSON.stringify({
                            status: "completed",
                            data: {
                                isConversational: true,
                                response: "Hello! How can I help you today?",
                                success: true
                            },
                            success: true
                        }) + "\n");
                        res.end();
                        return;
                    } else {
                        // Default fallback
                        intentPrediction = {
                            operationType: 'conversational',
                            confidence: 50,
                            reasoning: 'Fallback due to prediction error',
                            suggestedAction: 'Handle as conversation'
                        };
                    }
                }
            }

            // Send progress update (without exposing learning details)
            res.write(JSON.stringify({
                status: "progress",
                message: "Working on your request..."
            }) + "\n");

            // Step 2: Execute the request using the predicted intent
            const result = await this.executeIntelligentRequest(
                query,
                userId,
                intentPrediction,
                context,
                res
            );

            // Step 3: Learn from this interaction (silently in background)
            await this.userLearning.learnFromInteraction(userId, query, result);

            // Send final result (without exposing learning details)
            res.write(JSON.stringify({
                status: "completed",
                data: result,
                success: result.success !== false
            }) + "\n");

            res.end();
        } catch (error) {
            console.error("Error in processIntelligentRequest:", error);

            // Use enhanced error handler for general errors
            const errorHandling = await this.errorHandler.generateUserFriendlyError(error, {
                query,
                userId,
                context,
                operation: 'process_request'
            });

            if (!res.headersSent) {
                res.status(500).json({
                    error: errorHandling.userMessage,
                    suggestions: errorHandling.suggestions,
                    canRetry: errorHandling.canRetry,
                    nextSteps: errorHandling.nextSteps,
                    helpfulLinks: errorHandling.helpfulLinks,
                    success: false
                });
            } else {
                res.write(JSON.stringify({
                    status: "error",
                    error: errorHandling.userMessage,
                    suggestions: errorHandling.suggestions,
                    canRetry: errorHandling.canRetry,
                    success: false
                }) + "\n");
                res.end();
            }
        }
    }

    /**
     * Execute request based on predicted intent with improved search routing
     */
    async executeIntelligentRequest (query, userId, intentPrediction, context, res) {
        const { operationType, confidence, suggestedAction } = intentPrediction;

        // For search operations, always try to handle them even with lower confidence
        // This fixes the core issue where search queries were being misrouted
        if (operationType === 'search') {
            return await this.handleIntelligentSearch(query, userId, intentPrediction, res);
        }

        // If confidence is low for non-search operations, use chain of thought as backup
        if (confidence < 50) {
            res.write(JSON.stringify({
                status: "processing",
                message: "Let me think about that..."
            }) + "\n");

            return await this.chainOfThought.processComplexRequest(query, userId, {
                ...context,
                intentPrediction,
                lowConfidence: true
            });
        }

        // High confidence - execute based on predicted operation
        switch (operationType) {
        case 'create':
            return await this.handleIntelligentCreate(query, userId, intentPrediction, res);

        case 'update':
            return await this.handleIntelligentUpdate(query, userId, intentPrediction, res);

        case 'schedule':
            return await this.handleIntelligentSchedule(query, userId, intentPrediction, res);

        case 'delete':
            return await this.handleIntelligentDelete(query, userId, intentPrediction, res);

        case 'conversational':
            // Handle conversational queries directly
            return {
                isConversational: true,
                response: this.generateConversationalResponse(query, intentPrediction),
                operationType: 'conversational',
                success: true
            };

        default:
            // Fallback to chain of thought for unknown operations
            return await this.chainOfThought.processComplexRequest(query, userId, {
                ...context,
                intentPrediction,
                fallbackReason: 'unknown_operation'
            });
        }
    }

    /**
     * Handle intelligent object creation
     */
    async handleIntelligentCreate (query, userId, intentPrediction, res) {
        try {
            res.write(JSON.stringify({
                status: "processing",
                message: "Creating that for you..."
            }) + "\n");

            // For very vague requests, make reasonable assumptions and create something useful
            if (this.isVagueCreateRequest(query)) {
                // Instead of asking for clarification, create a basic task with a helpful title
                const enhancedQuery = this.enhanceVagueRequest(query);

                const result = await this.objectManager.createIntelligentObject(enhancedQuery, userId, {
                    intentPrediction,
                    originalQuery: query,
                    enhanced: true
                });

                return {
                    ...result,
                    message: "I created a task for you. You can always edit the details later if needed.",
                    operationType: 'create',
                    success: true
                };
            }

            // Use object manager for creation
            const result = await this.objectManager.createIntelligentObject(query, userId, {
                intentPrediction,
                originalQuery: query
            });

            return {
                ...result,
                operationType: 'create',
                success: true
            };
        } catch (error) {
            console.error('Error in intelligent create:', error);
            
            // Check if this is an integration-specific error
            const integrationError = this.detectIntegrationError(error);
            if (integrationError) {
                const recovery = await this.recoveryService.implementFallbackStrategy(
                    integrationError.integration,
                    'create',
                    error,
                    { query, userId, intentPrediction }
                );
                
                if (recovery.success) {
                    return {
                        ...recovery.result,
                        message: recovery.userMessage,
                        fallbackUsed: true,
                        alternativeSources: recovery.alternativeSources,
                        operationType: 'create',
                        success: true
                    };
                }
            }
            
            // Use enhanced error handler for general create errors
            const errorHandling = await this.errorHandler.generateUserFriendlyError(error, {
                query,
                userId,
                operation: 'create',
                intentPrediction
            });
            
            return {
                error: true,
                message: errorHandling.userMessage,
                suggestions: errorHandling.suggestions,
                canRetry: errorHandling.canRetry,
                success: false
            };
        }
    }

    /**
     * Handle intelligent object updates
     */
    async handleIntelligentUpdate (query, userId, intentPrediction, res) {
        try {
            res.write(JSON.stringify({
                status: "processing",
                message: "Finding and updating objects..."
            }) + "\n");

            // First, find objects that match the update criteria
            const searchResult = await this.objectManager.findObjects(
                this.extractSearchTermsFromUpdate(query),
                userId,
                { limit: 50 }
            );

            if (!searchResult.objects || searchResult.objects.length === 0) {
                return {
                    message: "I couldn't find any objects matching your update criteria. Could you be more specific about what you want to update?",
                    success: false,
                    operationType: 'update'
                };
            }

            // Extract update parameters from the query
            const updateParams = this.extractUpdateParameters(query, intentPrediction);

            if (!updateParams || Object.keys(updateParams).length === 0) {
                return {
                    needsClarification: true,
                    message: `I found ${searchResult.objects.length} objects, but I'm not sure what you want to update. What changes would you like to make?`,
                    foundObjects: searchResult.objects.slice(0, 5),
                    questions: [{
                        question: "What would you like to update?",
                        suggestions: [
                            "Set due date to next Friday",
                            "Change priority to high",
                            "Mark as completed"
                        ]
                    }],
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
                operationType: 'update',
                success: updateResults.successCount > 0
            };
        } catch (error) {
            console.error('Error in intelligent update:', error);
            return {
                error: true,
                message: error.message,
                success: false
            };
        }
    }

    /**
     * Handle intelligent search with improved error handling and user feedback
     */
    async handleIntelligentSearch (query, userId, intentPrediction, res) {
        // Extract search parameters from the intent prediction (declare outside try block)
        const searchOptions = {
            intentPrediction,
            includeContext: true,
            limit: 50
        };

        // Add specific filters based on the query
        if (intentPrediction.parameters) {
            if (intentPrediction.parameters.time_filter) {
                searchOptions.timeFilter = intentPrediction.parameters.time_filter;
            }
            if (intentPrediction.parameters.source_filter) {
                searchOptions.sourceFilter = intentPrediction.parameters.source_filter;
            }
            if (intentPrediction.parameters.object_type) {
                searchOptions.objectType = intentPrediction.parameters.object_type;
            }
        }

        try {
            res.write(JSON.stringify({
                status: "processing",
                message: "Searching through your items..."
            }) + "\n");

            const result = await this.objectManager.findObjects(query, userId, searchOptions);

            // Provide helpful feedback based on results
            if (!result.objects || result.objects.length === 0) {
                return {
                    message: "I couldn't find any items matching your search. Would you like me to help you create something instead?",
                    objects: [],
                    suggestions: [
                        "Try a broader search term",
                        "Check if you have any items at all",
                        "Create a new item"
                    ],
                    operationType: 'search',
                    success: true
                };
            }

            // Generate a helpful summary
            const summary = this.generateSearchSummary(result.objects, query, intentPrediction);

            return {
                ...result,
                summary,
                operationType: 'search',
                success: true
            };
        } catch (error) {
            console.error('Error in intelligent search:', error);

            // Use enhanced error handler for search errors
            const errorHandling = await this.errorHandler.handleSearchError(error, {
                query,
                sourceFilter: searchOptions.sourceFilter,
                timeFilter: searchOptions.timeFilter,
                objectType: searchOptions.objectType
            }, userId, { query, intentPrediction });

            // Check if we can use alternative sources
            if (errorHandling.alternativeSearches && errorHandling.alternativeSearches.length > 0) {
                // Try the first alternative
                try {
                    const alternativeResult = await this.objectManager.findObjects(
                        query, userId, errorHandling.alternativeSearches[0].criteria
                    );
                    
                    return {
                        ...alternativeResult,
                        message: `${errorHandling.userMessage} I searched using alternative sources instead.`,
                        alternativeUsed: true,
                        originalError: errorHandling.errorType,
                        suggestions: errorHandling.suggestions,
                        operationType: 'search',
                        success: true
                    };
                } catch (alternativeError) {
                    // Alternative also failed, provide graceful degradation
                }
            }

            // Provide user-friendly error handling with integration-specific suggestions
            return {
                error: false, // Don't treat as hard error
                message: errorHandling.userMessage,
                suggestions: errorHandling.suggestions,
                integrationStatus: errorHandling.integrationStatus,
                alternativeSearches: errorHandling.alternativeSearches,
                canRetry: errorHandling.canRetry,
                operationType: 'search',
                success: false
            };
        }
    }

    /**
     * Handle intelligent scheduling
     */
    async handleIntelligentSchedule (query, userId, intentPrediction, res) {
        try {
            res.write(JSON.stringify({
                status: "processing",
                message: "Creating calendar event..."
            }) + "\n");

            const result = await this.calendarService.createIntelligentEvent(query, userId, {
                intentPrediction,
                originalQuery: query
            });

            return {
                ...result,
                operationType: 'schedule',
                success: true
            };
        } catch (error) {
            console.error('Error in intelligent schedule:', error);
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
            res.write(JSON.stringify({
                status: "processing",
                message: "Finding objects to delete..."
            }) + "\n");

            // This is a dangerous operation, always ask for confirmation
            const searchResult = await this.objectManager.findObjects(
                this.extractSearchTermsFromDelete(query),
                userId,
                { limit: 10 }
            );

            return {
                needsClarification: true,
                message: `I found ${searchResult.objects?.length || 0} objects that match your deletion criteria. Are you sure you want to delete them?`,
                foundObjects: searchResult.objects?.slice(0, 5) || [],
                questions: [{
                    question: "Confirm deletion:",
                    suggestions: [
                        "Yes, delete them",
                        "No, cancel",
                        "Show me more details first"
                    ]
                }],
                operationType: 'delete',
                success: true
            };
        } catch (error) {
            console.error('Error in intelligent delete:', error);
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

        return vaguePhrases.some(pattern => pattern.test(query.trim()));
    }

    /**
     * Enhance vague requests with reasonable defaults
     */
    enhanceVagueRequest (query) {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('task')) {
            return "Create a new task - please update the title and details";
        }

        if (lowerQuery.includes('note')) {
            return "Create a new note";
        }

        if (lowerQuery.includes('meeting')) {
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
            .replace(/\b(add|set|change|update|modify|edit)\b/gi, '')
            .replace(/\b(a|an|the|to|all|my)\b/gi, '')
            .replace(/\b(date|priority|status|due)\b/gi, '')
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
            const dateMatch = lowerQuery.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*|\d{1,2}\/\d{1,2}\/\d{2,4}|today|tomorrow|next\s+\w+)\b/i);
            if (dateMatch) {
                params.due = { string: dateMatch[0] };
            }
        }

        // Extract priority updates
        if (/priority|urgent|high|low|medium|critical/i.test(lowerQuery)) {
            const priorityMatch = lowerQuery.match(/\b(high|low|medium|urgent|critical|normal)\b/i);
            if (priorityMatch) {
                params.priority = priorityMatch[0];
            }
        }

        // Extract status updates
        if (/mark as|set status|change status/i.test(lowerQuery)) {
            const statusMatch = lowerQuery.match(/\b(completed|done|finished|pending|in progress|cancelled)\b/i);
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
                res.write(JSON.stringify({
                    status: "progress",
                    message: `Updating object ${i + 1} of ${objects.length}...`
                }) + "\n");

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
            .replace(/\b(delete|remove|trash|destroy)\b/gi, '')
            .replace(/\b(all|my|the)\b/gi, '')
            .trim();
    }

    /**
     * Get user learning statistics
     */
    async getUserLearningStats (req, res) {
        try {
            const userId = req.user?._id || 'anonymous-user';
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
            const userId = req.user?._id || 'anonymous-user';

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
     * Generate conversational response for non-task queries
     */
    generateConversationalResponse (query, intentPrediction) {
        const lowerQuery = query.toLowerCase().trim();

        if (this.isSimpleGreeting(query)) {
            return "Hello! I'm here to help you manage your tasks, notes, and schedule. What would you like to do today?";
        }

        if (lowerQuery.includes('help')) {
            return "I can help you with:\n• Creating and managing tasks\n• Taking notes\n• Scheduling meetings\n• Finding your items\n• Updating existing items\n\nWhat would you like to start with?";
        }

        return intentPrediction.suggestedResponse || "I'm here to help! What would you like me to do for you?";
    }

    /**
     * Generate search summary based on results
     */
    generateSearchSummary (objects, query, intentPrediction) {
        const count = objects.length;
        const types = [...new Set(objects.map(obj => obj.type || 'item'))];

        let summary = `Found ${count} ${count === 1 ? 'item' : 'items'}`;

        if (types.length === 1) {
            summary += ` (${types[0]}s)`;
        } else if (types.length > 1) {
            summary += ` including ${types.join(', ')}`;
        }

        // Add time-based context if relevant
        if (intentPrediction.parameters?.time_filter) {
            const timeFilter = intentPrediction.parameters.time_filter;
            if (timeFilter === 'overdue') {
                const overdueCount = objects.filter(obj => obj.due && new Date(obj.due.date) < new Date()).length;
                if (overdueCount > 0) {
                    summary += `. ${overdueCount} ${overdueCount === 1 ? 'is' : 'are'} overdue`;
                }
            }
        }

        return summary;
    }

    /**
     * Detect likely search queries to prevent misclassification
     */
    isLikelySearchQuery (query) {
        const lowerQuery = query.toLowerCase().trim();
        const searchPatterns = [
            /^do i have/i,
            /^do we have/i,
            /^show me/i,
            /^what.*do i have/i,
            /^what.*tasks/i,
            /^what.*items/i,
            /^find my/i,
            /^any.*tasks/i,
            /^any.*items/i,
            /^list my/i,
            /overdue/i,
            /due today/i,
            /due tomorrow/i
        ];

        return searchPatterns.some(pattern => pattern.test(lowerQuery));
    }

    /**
     * Check if query is a simple greeting (fallback method)
     */
    isSimpleGreeting (query) {
        const simpleGreetings = ['hi', 'hello', 'hey', 'hiya', 'good morning', 'good afternoon', 'good evening'];
        const lowerQuery = query.toLowerCase().trim();
        return simpleGreetings.some(greeting => lowerQuery.startsWith(greeting));
    }

    /**
     * Detect if an error is integration-specific
     */
    detectIntegrationError(error) {
        const errorMessage = error.message.toLowerCase();
        
        // Check for integration-specific error patterns
        const integrationPatterns = {
            'linear': /linear|issue|ticket/i,
            'gmail': /gmail|email|mail/i,
            'github': /github|repo|repository/i,
            'twitter': /twitter|tweet|x\.com/i,
            'calendar': /calendar|meeting|event/i
        };
        
        for (const [integration, pattern] of Object.entries(integrationPatterns)) {
            if (pattern.test(errorMessage) || error.integration === integration) {
                return { integration, error };
            }
        }
        
        return null;
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
                errorHandler: !!this.errorHandler,
                recoveryService: !!this.recoveryService,
                timestamp: new Date().toISOString(),
                version: "2.1.0-enhanced-error-handling"
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
