/**
 * Enhanced Error Handler Service
 * Provides source-aware error handling with integration-specific suggestions
 * and user-friendly error messages for the AI Productivity Partner
 */
export class EnhancedErrorHandlerService {
    constructor() {
        this.errorPatterns = new Map();
        this.integrationStatus = new Map();
        this.initializeErrorPatterns();
    }

    /**
     * Initialize common error patterns and their handling strategies
     */
    initializeErrorPatterns() {
        // Intent classification errors
        this.errorPatterns.set('intent_classification_failed', {
            category: 'intent',
            severity: 'medium',
            fallbackStrategy: 'ask_clarification',
            userMessage: "I'm not sure what you'd like me to do. Could you be more specific?"
        });

        this.errorPatterns.set('low_confidence_intent', {
            category: 'intent',
            severity: 'low',
            fallbackStrategy: 'provide_options',
            userMessage: "I have a few ideas about what you might want. Let me show you some options."
        });

        // Search-related errors
        this.errorPatterns.set('no_results_found', {
            category: 'search',
            severity: 'low',
            fallbackStrategy: 'suggest_alternatives',
            userMessage: "I couldn't find anything matching your search."
        });

        this.errorPatterns.set('search_query_too_broad', {
            category: 'search',
            severity: 'low',
            fallbackStrategy: 'suggest_refinement',
            userMessage: "Your search returned too many results. Let me help you narrow it down."
        });

        // Integration-specific errors
        this.errorPatterns.set('integration_unavailable', {
            category: 'integration',
            severity: 'high',
            fallbackStrategy: 'graceful_degradation',
            userMessage: "I'm having trouble connecting to one of your integrations."
        });

        this.errorPatterns.set('integration_auth_expired', {
            category: 'integration',
            severity: 'medium',
            fallbackStrategy: 'request_reauth',
            userMessage: "Your connection to {source} has expired and needs to be renewed."
        });

        // Database and system errors
        this.errorPatterns.set('database_error', {
            category: 'system',
            severity: 'high',
            fallbackStrategy: 'retry_with_fallback',
            userMessage: "I'm experiencing a temporary issue. Let me try a different approach."
        });

        this.errorPatterns.set('ai_service_unavailable', {
            category: 'system',
            severity: 'high',
            fallbackStrategy: 'basic_functionality',
            userMessage: "My AI capabilities are temporarily limited, but I can still help with basic tasks."
        });
    }

    /**
     * Handle intent classification errors with source context
     * @param {Error} error - The original error
     * @param {string} query - User's original query
     * @param {string} userId - User identifier
     * @param {Object} context - Additional context including source information
     * @returns {Object} Error handling result with fallback strategy
     */
    async handleIntentError(error, query, userId, context = {}) {
        try {
            const errorType = this.classifyIntentError(error, query, context);
            const sourceContext = this.extractSourceContext(query, context);
            
            // Get error pattern for this type
            const pattern = this.errorPatterns.get(errorType) || this.getDefaultIntentErrorPattern();
            
            // Generate source-aware fallback intent
            const fallbackIntent = await this.generateFallbackIntent(query, sourceContext, errorType);
            
            // Create clarification questions based on source context
            const clarificationQuestions = this.generateSourceAwareClarification(query, sourceContext, errorType);
            
            // Generate helpful suggestions
            const suggestions = this.generateIntentErrorSuggestions(query, sourceContext, errorType);

            return {
                errorType,
                severity: pattern.severity,
                fallbackIntent,
                clarificationQuestions,
                suggestions,
                userMessage: this.formatUserMessage(pattern.userMessage, sourceContext),
                canRetry: true,
                fallbackStrategy: pattern.fallbackStrategy,
                sourceContext,
                metadata: {
                    originalError: error.message,
                    timestamp: new Date().toISOString(),
                    userId,
                    query
                }
            };
        } catch (handlingError) {
            console.error('Error in handleIntentError:', handlingError);
            return this.getEmergencyFallback('intent_error', query, userId);
        }
    }

    /**
     * Handle search errors with integration-specific suggestions
     * @param {Error} error - The original error
     * @param {Object} searchCriteria - Search parameters that failed
     * @param {string} userId - User identifier
     * @param {Object} context - Additional context including source filters
     * @returns {Object} Error handling result with search alternatives
     */
    async handleSearchError(error, searchCriteria, userId, context = {}) {
        try {
            const errorType = this.classifySearchError(error, searchCriteria, context);
            const sourceFilters = searchCriteria.sourceFilter || context.sourceFilter;
            const integrationStatus = await this.checkIntegrationStatus(sourceFilters, userId);
            
            // Get error pattern
            const pattern = this.errorPatterns.get(errorType) || this.getDefaultSearchErrorPattern();
            
            // Generate alternative search strategies
            const alternativeSearches = this.generateAlternativeSearches(searchCriteria, sourceFilters, integrationStatus);
            
            // Create integration-specific suggestions
            const suggestions = this.generateSearchErrorSuggestions(errorType, sourceFilters, integrationStatus);
            
            // Generate helpful message based on integration status
            const userMessage = this.generateSearchErrorMessage(errorType, sourceFilters, integrationStatus, pattern);

            return {
                errorType,
                severity: pattern.severity,
                alternativeSearches,
                suggestions,
                userMessage,
                integrationStatus,
                canRetry: this.canRetrySearch(errorType, integrationStatus),
                fallbackStrategy: pattern.fallbackStrategy,
                sourceContext: {
                    requestedSources: sourceFilters,
                    availableSources: integrationStatus.available,
                    unavailableSources: integrationStatus.unavailable
                },
                metadata: {
                    originalError: error.message,
                    searchCriteria,
                    timestamp: new Date().toISOString(),
                    userId
                }
            };
        } catch (handlingError) {
            console.error('Error in handleSearchError:', handlingError);
            return this.getEmergencyFallback('search_error', searchCriteria, userId);
        }
    }

    /**
     * Generate user-friendly error messages with source awareness
     * @param {Error} error - The original error
     * @param {Object} context - Context including source, operation type, etc.
     * @returns {Object} User-friendly error response
     */
    async generateUserFriendlyError(error, context = {}) {
        try {
            const errorCategory = this.categorizeError(error, context);
            const sourceContext = this.extractSourceContext(context.query || '', context);
            
            let userMessage;
            let suggestions = [];
            let canRetry = true;
            let severity = 'medium';

            switch (errorCategory) {
                case 'integration_failure':
                    ({ userMessage, suggestions, canRetry, severity } = 
                        this.handleIntegrationFailure(error, sourceContext, context));
                    break;

                case 'authentication_error':
                    ({ userMessage, suggestions, canRetry, severity } = 
                        this.handleAuthenticationError(error, sourceContext, context));
                    break;

                case 'data_validation_error':
                    ({ userMessage, suggestions, canRetry, severity } = 
                        this.handleValidationError(error, sourceContext, context));
                    break;

                case 'rate_limit_error':
                    ({ userMessage, suggestions, canRetry, severity } = 
                        this.handleRateLimitError(error, sourceContext, context));
                    break;

                case 'network_error':
                    ({ userMessage, suggestions, canRetry, severity } = 
                        this.handleNetworkError(error, sourceContext, context));
                    break;

                default:
                    ({ userMessage, suggestions, canRetry, severity } = 
                        this.handleGenericError(error, sourceContext, context));
            }

            return {
                errorCategory,
                severity,
                userMessage,
                suggestions,
                canRetry,
                sourceContext,
                nextSteps: this.generateNextSteps(errorCategory, sourceContext, context),
                helpfulLinks: this.generateHelpfulLinks(errorCategory, sourceContext),
                metadata: {
                    originalError: error.message,
                    timestamp: new Date().toISOString(),
                    context
                }
            };
        } catch (handlingError) {
            console.error('Error in generateUserFriendlyError:', handlingError);
            return this.getEmergencyFallback('generic_error', error.message, context.userId);
        }
    }

    /**
     * Classify intent classification errors
     */
    classifyIntentError(error, query, context) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('confidence') || errorMessage.includes('uncertain')) {
            return 'low_confidence_intent';
        }
        
        if (errorMessage.includes('parse') || errorMessage.includes('format')) {
            return 'intent_parse_error';
        }
        
        if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            return 'ai_service_timeout';
        }
        
        return 'intent_classification_failed';
    }

    /**
     * Classify search errors
     */
    classifySearchError(error, searchCriteria, context) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('no results') || errorMessage.includes('not found')) {
            return 'no_results_found';
        }
        
        if (errorMessage.includes('too many') || errorMessage.includes('limit exceeded')) {
            return 'search_query_too_broad';
        }
        
        if (errorMessage.includes('integration') || errorMessage.includes('source')) {
            return 'integration_search_failed';
        }
        
        if (errorMessage.includes('timeout')) {
            return 'search_timeout';
        }
        
        return 'search_execution_failed';
    }

    /**
     * Extract source context from query and context
     */
    extractSourceContext(query, context) {
        const sourceContext = {
            detectedSources: [],
            requestedSources: context.sourceFilter || [],
            queryMentionsSources: false
        };

        // Detect source mentions in query
        const sourceMentions = {
            'linear': /\b(linear|issue|ticket)\b/i,
            'gmail': /\b(gmail|email|mail)\b/i,
            'github': /\b(github|repo|repository|pr|pull request)\b/i,
            'twitter': /\b(twitter|tweet|x\.com)\b/i,
            'calendar': /\b(calendar|meeting|event|appointment)\b/i
        };

        for (const [source, pattern] of Object.entries(sourceMentions)) {
            if (pattern.test(query)) {
                sourceContext.detectedSources.push(source);
                sourceContext.queryMentionsSources = true;
            }
        }

        return sourceContext;
    }

    /**
     * Generate fallback intent based on source context
     */
    async generateFallbackIntent(query, sourceContext, errorType) {
        // If query mentions specific sources, default to search
        if (sourceContext.queryMentionsSources) {
            return {
                operationType: 'search',
                confidence: 0.6,
                reasoning: 'Fallback to search due to source mentions',
                parameters: {
                    search_terms: query,
                    source_filter: sourceContext.detectedSources
                }
            };
        }

        // Check for common patterns
        const lowerQuery = query.toLowerCase();
        
        if (/^(do i have|show me|what|find|any)\s+/i.test(lowerQuery)) {
            return {
                operationType: 'search',
                confidence: 0.7,
                reasoning: 'Fallback to search based on query pattern'
            };
        }
        
        if (/^(create|add|make|new)\s+/i.test(lowerQuery)) {
            return {
                operationType: 'create',
                confidence: 0.7,
                reasoning: 'Fallback to create based on query pattern'
            };
        }

        // Default to conversational
        return {
            operationType: 'conversational',
            confidence: 0.5,
            reasoning: 'Fallback to conversational due to unclear intent'
        };
    }

    /**
     * Generate source-aware clarification questions
     */
    generateSourceAwareClarification(query, sourceContext, errorType) {
        const questions = [];

        if (sourceContext.queryMentionsSources) {
            questions.push({
                question: `I noticed you mentioned ${sourceContext.detectedSources.join(' and ')}. What would you like me to do with items from these sources?`,
                suggestions: [
                    `Search my ${sourceContext.detectedSources[0]} items`,
                    `Show me recent ${sourceContext.detectedSources[0]} activity`,
                    `Create a new item`
                ]
            });
        } else {
            questions.push({
                question: "What would you like me to help you with?",
                suggestions: [
                    "Search for existing items",
                    "Create a new task or note",
                    "Update existing items",
                    "Check my integrations"
                ]
            });
        }

        return questions;
    }

    /**
     * Generate intent error suggestions
     */
    generateIntentErrorSuggestions(query, sourceContext, errorType) {
        const suggestions = [];

        // Source-specific suggestions
        if (sourceContext.queryMentionsSources) {
            sourceContext.detectedSources.forEach(source => {
                suggestions.push(`Search ${source} items`);
                suggestions.push(`Check ${source} integration status`);
            });
        }

        // General suggestions based on error type
        switch (errorType) {
            case 'low_confidence_intent':
                suggestions.push("Try being more specific about what you want to do");
                suggestions.push("Use action words like 'find', 'create', or 'update'");
                break;
            case 'intent_parse_error':
                suggestions.push("Try rephrasing your request");
                suggestions.push("Break down complex requests into simpler parts");
                break;
            default:
                suggestions.push("Try a simpler request");
                suggestions.push("Ask for help with available commands");
        }

        return suggestions;
    }

    /**
     * Check integration status for sources
     */
    async checkIntegrationStatus(sourceFilters, userId) {
        const status = {
            available: [],
            unavailable: [],
            authExpired: [],
            rateLimited: []
        };

        if (!sourceFilters || sourceFilters.length === 0) {
            // Check all integrations
            const allSources = ['linear', 'gmail', 'github', 'twitter', 'calendar'];
            sourceFilters = allSources;
        }

        for (const source of sourceFilters) {
            const sourceStatus = this.integrationStatus.get(`${userId}_${source}`);
            
            if (!sourceStatus) {
                status.unavailable.push(source);
            } else if (sourceStatus.authExpired) {
                status.authExpired.push(source);
            } else if (sourceStatus.rateLimited) {
                status.rateLimited.push(source);
            } else {
                status.available.push(source);
            }
        }

        return status;
    }

    /**
     * Generate alternative search strategies
     */
    generateAlternativeSearches(searchCriteria, sourceFilters, integrationStatus) {
        const alternatives = [];

        // If specific sources failed, suggest searching available sources
        if (integrationStatus.unavailable.length > 0 && integrationStatus.available.length > 0) {
            alternatives.push({
                type: 'available_sources_only',
                description: `Search only in available sources: ${integrationStatus.available.join(', ')}`,
                criteria: {
                    ...searchCriteria,
                    sourceFilter: integrationStatus.available
                }
            });
        }

        // Suggest broader search without source filters
        if (sourceFilters && sourceFilters.length > 0) {
            alternatives.push({
                type: 'all_sources',
                description: 'Search across all your items (not just specific integrations)',
                criteria: {
                    ...searchCriteria,
                    sourceFilter: undefined
                }
            });
        }

        // Suggest time-based alternatives
        if (!searchCriteria.timeFilter) {
            alternatives.push({
                type: 'recent_items',
                description: 'Search only recent items (last 7 days)',
                criteria: {
                    ...searchCriteria,
                    timeFilter: 'recent'
                }
            });
        }

        return alternatives;
    }

    /**
     * Generate search error suggestions
     */
    generateSearchErrorSuggestions(errorType, sourceFilters, integrationStatus) {
        const suggestions = [];

        switch (errorType) {
            case 'no_results_found':
                suggestions.push("Try using different search terms");
                suggestions.push("Check if you have any items in your account");
                if (sourceFilters) {
                    suggestions.push("Try searching without source filters");
                }
                break;

            case 'integration_search_failed':
                if (integrationStatus.authExpired.length > 0) {
                    suggestions.push(`Reconnect your ${integrationStatus.authExpired.join(', ')} integration(s)`);
                }
                if (integrationStatus.unavailable.length > 0) {
                    suggestions.push(`Check ${integrationStatus.unavailable.join(', ')} integration status`);
                }
                break;

            case 'search_query_too_broad':
                suggestions.push("Add more specific search terms");
                suggestions.push("Use filters to narrow down results");
                break;

            default:
                suggestions.push("Try a simpler search");
                suggestions.push("Check your internet connection");
        }

        return suggestions;
    }

    /**
     * Generate search error message based on integration status
     */
    generateSearchErrorMessage(errorType, sourceFilters, integrationStatus, pattern) {
        let message = pattern.userMessage;

        if (errorType === 'integration_search_failed') {
            if (integrationStatus.authExpired.length > 0) {
                message = `Your connection to ${integrationStatus.authExpired.join(' and ')} has expired. Please reconnect to search those sources.`;
            } else if (integrationStatus.unavailable.length > 0) {
                message = `I'm having trouble connecting to ${integrationStatus.unavailable.join(' and ')}. I can search your other sources instead.`;
            }
        } else if (errorType === 'no_results_found' && sourceFilters) {
            message = `I couldn't find anything in ${sourceFilters.join(' or ')}. You might not have any items from these sources yet.`;
        }

        return message;
    }

    /**
     * Handle integration failure errors
     */
    handleIntegrationFailure(error, sourceContext, context) {
        const affectedSources = sourceContext.detectedSources.length > 0 
            ? sourceContext.detectedSources 
            : ['the integration'];

        return {
            userMessage: `I'm having trouble connecting to ${affectedSources.join(' and ')}. This might be temporary.`,
            suggestions: [
                `Check ${affectedSources.join(' and ')} integration status`,
                'Try again in a few moments',
                'Use other available sources',
                'Contact support if the issue persists'
            ],
            canRetry: true,
            severity: 'medium'
        };
    }

    /**
     * Handle authentication errors
     */
    handleAuthenticationError(error, sourceContext, context) {
        const affectedSources = sourceContext.detectedSources.length > 0 
            ? sourceContext.detectedSources 
            : ['your account'];

        return {
            userMessage: `Your connection to ${affectedSources.join(' and ')} needs to be renewed.`,
            suggestions: [
                `Reconnect your ${affectedSources.join(' and ')} integration(s)`,
                'Check integration settings',
                'Try logging out and back in'
            ],
            canRetry: false,
            severity: 'high'
        };
    }

    /**
     * Handle validation errors
     */
    handleValidationError(error, sourceContext, context) {
        return {
            userMessage: "There's an issue with the information provided. Let me help you fix it.",
            suggestions: [
                'Check the format of dates and times',
                'Make sure required fields are filled',
                'Try simplifying your request'
            ],
            canRetry: true,
            severity: 'low'
        };
    }

    /**
     * Handle rate limit errors
     */
    handleRateLimitError(error, sourceContext, context) {
        const affectedSources = sourceContext.detectedSources.length > 0 
            ? sourceContext.detectedSources 
            : ['the service'];

        return {
            userMessage: `I've reached the rate limit for ${affectedSources.join(' and ')}. Please wait a moment before trying again.`,
            suggestions: [
                'Wait a few minutes before retrying',
                'Try using other integrations',
                'Reduce the frequency of requests'
            ],
            canRetry: true,
            severity: 'medium'
        };
    }

    /**
     * Handle network errors
     */
    handleNetworkError(error, sourceContext, context) {
        return {
            userMessage: "I'm having trouble connecting to the internet. Please check your connection.",
            suggestions: [
                'Check your internet connection',
                'Try again in a few moments',
                'Use offline features if available'
            ],
            canRetry: true,
            severity: 'high'
        };
    }

    /**
     * Handle generic errors
     */
    handleGenericError(error, sourceContext, context) {
        return {
            userMessage: "Something unexpected happened. Let me try a different approach.",
            suggestions: [
                'Try rephrasing your request',
                'Break down complex requests',
                'Contact support if the issue persists'
            ],
            canRetry: true,
            severity: 'medium'
        };
    }

    /**
     * Categorize errors for appropriate handling
     */
    categorizeError(error, context) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('token')) {
            return 'authentication_error';
        }
        
        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
            return 'rate_limit_error';
        }
        
        if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
            return 'network_error';
        }
        
        if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('format')) {
            return 'data_validation_error';
        }
        
        if (errorMessage.includes('integration') || errorMessage.includes('source')) {
            return 'integration_failure';
        }
        
        return 'generic_error';
    }

    /**
     * Check if search can be retried based on error type and integration status
     */
    canRetrySearch(errorType, integrationStatus) {
        if (errorType === 'search_timeout' || errorType === 'network_error') {
            return true;
        }
        
        if (errorType === 'integration_search_failed') {
            return integrationStatus.available.length > 0;
        }
        
        return errorType !== 'no_results_found';
    }

    /**
     * Generate next steps for error recovery
     */
    generateNextSteps(errorCategory, sourceContext, context) {
        const steps = [];

        switch (errorCategory) {
            case 'authentication_error':
                steps.push('Go to Settings > Integrations');
                steps.push('Reconnect the affected integration');
                steps.push('Try your request again');
                break;

            case 'integration_failure':
                steps.push('Check integration status in Settings');
                steps.push('Try using other available sources');
                steps.push('Contact support if issue persists');
                break;

            case 'network_error':
                steps.push('Check your internet connection');
                steps.push('Wait a moment and try again');
                steps.push('Use offline features if available');
                break;

            default:
                steps.push('Try rephrasing your request');
                steps.push('Use simpler commands');
                steps.push('Contact support if needed');
        }

        return steps;
    }

    /**
     * Generate helpful links for error resolution
     */
    generateHelpfulLinks(errorCategory, sourceContext) {
        const links = [];

        switch (errorCategory) {
            case 'authentication_error':
            case 'integration_failure':
                links.push({
                    title: 'Integration Settings',
                    url: '/settings/integrations',
                    description: 'Manage your connected services'
                });
                break;

            case 'data_validation_error':
                links.push({
                    title: 'Help Documentation',
                    url: '/help/formatting',
                    description: 'Learn about proper formatting'
                });
                break;

            default:
                links.push({
                    title: 'Help Center',
                    url: '/help',
                    description: 'Get help with common issues'
                });
        }

        return links;
    }

    /**
     * Get default error patterns
     */
    getDefaultIntentErrorPattern() {
        return {
            category: 'intent',
            severity: 'medium',
            fallbackStrategy: 'ask_clarification',
            userMessage: "I'm not sure what you'd like me to do. Could you be more specific?"
        };
    }

    getDefaultSearchErrorPattern() {
        return {
            category: 'search',
            severity: 'medium',
            fallbackStrategy: 'suggest_alternatives',
            userMessage: "I had trouble with your search. Let me suggest some alternatives."
        };
    }

    /**
     * Format user message with source context
     */
    formatUserMessage(template, sourceContext) {
        let message = template;
        
        if (sourceContext.detectedSources.length > 0) {
            message = message.replace('{source}', sourceContext.detectedSources.join(' and '));
        }
        
        return message;
    }

    /**
     * Emergency fallback for when error handling itself fails
     */
    getEmergencyFallback(errorType, originalInput, userId) {
        return {
            errorType: 'error_handler_failure',
            severity: 'high',
            userMessage: "I'm experiencing technical difficulties. Please try a simpler request or contact support.",
            suggestions: [
                'Try a basic command like "show my tasks"',
                'Refresh the page and try again',
                'Contact support for assistance'
            ],
            canRetry: true,
            fallbackStrategy: 'emergency_mode',
            metadata: {
                originalErrorType: errorType,
                originalInput,
                userId,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Update integration status (called by integration services)
     */
    updateIntegrationStatus(userId, source, status) {
        this.integrationStatus.set(`${userId}_${source}`, {
            ...status,
            lastUpdated: new Date().toISOString()
        });
    }

    /**
     * Get integration status for a user and source
     */
    getIntegrationStatus(userId, source) {
        return this.integrationStatus.get(`${userId}_${source}`) || {
            available: false,
            authExpired: false,
            rateLimited: false,
            lastUpdated: null
        };
    }
}