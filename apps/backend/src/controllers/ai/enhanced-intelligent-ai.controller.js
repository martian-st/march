import { EnhancedIntentUnderstandingService } from "../../services/ai/enhanced-intent-understanding.service.js";
import { ChainOfThoughtService } from "../../services/ai/chain-of-thought.service.js";
import { AdvancedObjectManagerService } from "../../services/ai/advanced-object-manager.service.js";
import { CalendarIntegrationService } from "../../services/ai/calendar-integration.service.js";
import { environment } from "../../loaders/environment.loader.js";

/**
 * Enhanced Intelligent AI Controller
 * Uses advanced multi-LLM intent understanding for superior user experience
 */
export class EnhancedIntelligentAIController {
    constructor() {
        this.intentService = new EnhancedIntentUnderstandingService(environment.GOOGLE_AI_API_KEY);
        this.chainOfThought = new ChainOfThoughtService(environment.GOOGLE_AI_API_KEY);
        this.objectManager = new AdvancedObjectManagerService(environment.GOOGLE_AI_API_KEY);
        this.calendarService = new CalendarIntegrationService(environment.GOOGLE_AI_API_KEY);
    }

    /**
     * Process user request with enhanced intent understanding
     */
    async processEnhancedRequest(req, res) {
        try {
            const { query, context = {} } = req.body;
            const userId = req.user?._id || 'anonymous-user';

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

            // Stage 1: Understand user intent with advanced AI
            res.write(JSON.stringify({
                status: "thinking",
                message: "Understanding your request..."
            }) + "\n");

            const intentAnalysis = await this.intentService.understandUserIntent(query, userId, {
                ...context,
                userPreferences: await this.getUserPreferences(userId),
                previousInteractions: await this.getRecentInteractions(userId)
            });

            console.log('Intent Analysis:', intentAnalysis); // Debug log

            if (!intentAnalysis.success) {
                throw new Error('Failed to understand user intent');
            }

            // Stage 2: Execute based on understood intent
            res.write(JSON.stringify({
                status: "processing",
                message: intentAnalysis.suggestedResponse
            }) + "\n");

            const result = await this.executeBasedOnIntent(intentAnalysis, userId, query, res);

            // Stage 3: Return conversational response
            const finalResponse = this.formatConversationalResponse(result, intentAnalysis);

            res.write(JSON.stringify({
                status: "completed",
                data: finalResponse,
                success: true
            }) + "\n");

            res.end();

        } catch (error) {
            console.error("Enhanced AI processing error:", error);

            if (!res.headersSent) {
                res.status(500).json({
                    error: "An error occurred processing your request",
                    message: error.message,
                    success: false
                });
            } else {
                res.write(JSON.stringify({
                    status: "error",
                    error: error.message,
                    success: false
                }) + "\n");
                res.end();
            }
        }
    }

    /**
     * Execute action based on understood intent
     */
    async executeBasedOnIntent(intentAnalysis, userId, originalQuery, res) {
        const { intent, parameters, confidence } = intentAnalysis;

        try {
            switch (intent) {
                case 'create_task':
                    return await this.handleTaskCreation(parameters, userId, originalQuery, res);

                case 'create_note':
                    return await this.handleNoteCreation(parameters, userId, originalQuery, res);

                case 'create_meeting':
                case 'schedule_event':
                    return await this.handleMeetingCreation(parameters, userId, originalQuery, res);

                case 'find_items':
                    return await this.handleItemSearch(parameters, userId, originalQuery, res);

                case 'update_items':
                    return await this.handleItemUpdate(parameters, userId, originalQuery, res);

                case 'delete_items':
                    return await this.handleItemDeletion(parameters, userId, originalQuery, res);

                case 'complex_workflow':
                    return await this.handleComplexWorkflow(parameters, userId, originalQuery, res);

                case 'conversational':
                case 'general_question':
                default:
                    return await this.handleConversationalResponse(intentAnalysis, userId, originalQuery);
            }
        } catch (error) {
            console.error(`Error executing ${intent}:`, error);
            
            // Fallback to chain of thought for complex cases
            return await this.chainOfThought.processComplexRequest(originalQuery, userId, {
                intentAnalysis,
                fallbackReason: error.message
            });
        }
    }

    /**
     * Handle task creation with intelligent defaults
     */
    async handleTaskCreation(parameters, userId, originalQuery, res) {
        try {
            // If we have enough information, create the task directly
            if (parameters.title && parameters.title !== 'New task') {
                const taskData = {
                    title: parameters.title,
                    description: parameters.description || '',
                    priority: parameters.priority || 'medium',
                    due: parameters.due_date ? { string: parameters.due_date } : null,
                    type: 'task'
                };

                const result = await this.objectManager.createObject(taskData, userId);
                
                return {
                    success: true,
                    object: result.object,
                    message: `Great! I've created the task "${parameters.title}" for you.`,
                    isConversational: true,
                    response: `Perfect! I've created the task "${parameters.title}" for you. ${parameters.due_date ? `It's due ${parameters.due_date}.` : 'You can set a due date anytime.'}`
                };
            }

            // If request is vague, ask for clarification but be helpful
            return {
                success: true,
                needsClarification: true,
                message: "I'd be happy to create a task for you! What would you like the task to be about?",
                isConversational: true,
                response: "Of course! I'd be happy to create a task for you. What would you like the task to be about?",
                questions: [{
                    question: "What should the task be about?",
                    suggestions: [
                        "Call a client",
                        "Review documents", 
                        "Prepare for meeting",
                        "Follow up on project"
                    ]
                }]
            };
        } catch (error) {
            console.error('Task creation error:', error);
            return {
                success: false,
                error: true,
                message: "I had trouble creating that task. Could you try again?",
                isConversational: true,
                response: "I had trouble creating that task. Could you try describing it differently?"
            };
        }
    }

    /**
     * Handle note creation
     */
    async handleNoteCreation(parameters, userId, originalQuery, res) {
        try {
            const noteData = {
                title: parameters.title || 'New Note',
                description: parameters.description || parameters.content || '',
                type: 'note'
            };

            if (!noteData.description) {
                return {
                    success: true,
                    needsClarification: true,
                    message: "I'll help you create a note. What would you like to note down?",
                    isConversational: true,
                    response: "I'll help you create a note. What would you like to note down?",
                    questions: [{
                        question: "What would you like to note?",
                        suggestions: [
                            "Meeting notes",
                            "Ideas for project",
                            "Important reminders",
                            "Research findings"
                        ]
                    }]
                };
            }

            const result = await this.objectManager.createObject(noteData, userId);
            
            return {
                success: true,
                object: result.object,
                message: `I've created a note for you: "${noteData.title}"`,
                isConversational: true,
                response: `Perfect! I've created your note. You can edit it anytime to add more details.`
            };
        } catch (error) {
            console.error('Note creation error:', error);
            return {
                success: false,
                error: true,
                message: "I had trouble creating that note. Could you try again?",
                isConversational: true,
                response: "I had trouble creating that note. Could you try again?"
            };
        }
    }

    /**
     * Handle meeting/event creation
     */
    async handleMeetingCreation(parameters, userId, originalQuery, res) {
        try {
            if (!parameters.title) {
                return {
                    success: true,
                    needsClarification: true,
                    message: "I'll help you schedule a meeting. What's the meeting about?",
                    isConversational: true,
                    response: "I'll help you schedule a meeting. What's the meeting about and when would you like it?",
                    questions: [{
                        question: "Meeting details:",
                        suggestions: [
                            "Team standup tomorrow at 9am",
                            "Client call next Friday at 2pm",
                            "Project review this week",
                            "One-on-one with manager"
                        ]
                    }]
                };
            }

            const result = await this.calendarService.processCalendarRequest(originalQuery, 'create', {
                title: parameters.title,
                time_context: parameters.time_context
            });

            return {
                success: true,
                meeting: result.meeting,
                message: `I've scheduled "${parameters.title}" for you.`,
                isConversational: true,
                response: `Great! I've scheduled "${parameters.title}" ${parameters.time_context ? `for ${parameters.time_context}` : 'for you'}. Check your calendar for details.`
            };
        } catch (error) {
            console.error('Meeting creation error:', error);
            return {
                success: false,
                error: true,
                message: "I had trouble scheduling that meeting. Could you try again?",
                isConversational: true,
                response: "I had trouble scheduling that meeting. Could you provide more details about when you'd like it?"
            };
        }
    }

    /**
     * Handle item search
     */
    async handleItemSearch(parameters, userId, originalQuery, res) {
        try {
            const searchQuery = parameters.search_terms || originalQuery;
            const result = await this.objectManager.findObjects(searchQuery, userId, {
                limit: 10
            });

            if (!result.objects || result.objects.length === 0) {
                return {
                    success: true,
                    objects: [],
                    message: "I couldn't find any items matching your search.",
                    isConversational: true,
                    response: "I couldn't find any items matching that search. Would you like to try different search terms or create something new?"
                };
            }

            const count = result.objects.length;
            const types = [...new Set(result.objects.map(obj => obj.type))];
            
            return {
                success: true,
                objects: result.objects,
                message: `Found ${count} items: ${types.join(', ')}`,
                isConversational: true,
                response: `I found ${count} ${count === 1 ? 'item' : 'items'} for you. ${count > 5 ? 'Here are the most relevant ones:' : 'Here they are:'}`
            };
        } catch (error) {
            console.error('Search error:', error);
            return {
                success: false,
                error: true,
                message: "I had trouble searching for that. Could you try again?",
                isConversational: true,
                response: "I had trouble with that search. Could you try rephrasing what you're looking for?"
            };
        }
    }

    /**
     * Handle conversational responses
     */
    async handleConversationalResponse(intentAnalysis, userId, originalQuery) {
        return {
            success: true,
            isConversational: true,
            response: intentAnalysis.suggestedResponse,
            message: intentAnalysis.suggestedResponse,
            confidence: intentAnalysis.confidence,
            reasoning: intentAnalysis.reasoning
        };
    }

    /**
     * Format response for conversational output
     */
    formatConversationalResponse(result, intentAnalysis) {
        if (result.isConversational) {
            return {
                isConversational: true,
                response: result.response,
                success: result.success,
                data: result
            };
        }

        // Convert structured results to conversational format
        return {
            isConversational: true,
            response: result.message || result.response || "I've completed your request!",
            success: result.success,
            data: result
        };
    }

    /**
     * Get user preferences (placeholder for future implementation)
     */
    async getUserPreferences(userId) {
        // TODO: Implement user preferences storage
        return {
            defaultPriority: 'medium',
            preferredTimeFormat: '12h',
            workingHours: { start: '9:00', end: '17:00' }
        };
    }

    /**
     * Get recent user interactions (placeholder for future implementation)
     */
    async getRecentInteractions(userId) {
        // TODO: Implement interaction history storage
        return [];
    }

    /**
     * Health check
     */
    async healthCheck(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    status: "healthy",
                    services: {
                        intentUnderstanding: !!this.intentService,
                        chainOfThought: !!this.chainOfThought,
                        objectManager: !!this.objectManager,
                        calendarService: !!this.calendarService
                    },
                    version: "3.0.0-enhanced",
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: "Health check failed",
                message: error.message
            });
        }
    }
}

// Create singleton instance
export const enhancedIntelligentAIController = new EnhancedIntelligentAIController();