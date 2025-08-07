import { ChainOfThoughtService } from "../../services/ai/chain-of-thought.service.js";
import { CalendarIntegrationService } from "../../services/ai/calendar-integration.service.js";
import { AdvancedObjectManagerService } from "../../services/ai/advanced-object-manager.service.js";
import { ENHANCED_SYSTEM_PROMPT } from "../../prompts/enhanced-system.prompt.js";

/**
 * Enhanced AI Controller
 * Orchestrates all AI services for complex user interactions
 */
export class EnhancedAIController {
    constructor() {
        this.chainOfThought = new ChainOfThoughtService(process.env.GOOGLE_AI_API_KEY, ENHANCED_SYSTEM_PROMPT);
        this.calendarService = new CalendarIntegrationService(process.env.GOOGLE_AI_API_KEY);
        this.objectManager = new AdvancedObjectManagerService(process.env.GOOGLE_AI_API_KEY);
    }

    /**
     * Main entry point for complex AI requests
     */
    async processComplexRequest(req, res) {
        try {
            const { query, context = {} } = req.body;
            // Use a default user ID if no user is present in the request (for testing)
            const userId = req.user?._id ;

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

            // Send initial response
            res.write(JSON.stringify({ 
                status: "processing", 
                message: "Analyzing your request..." 
            }) + "\n");

            // Process the complex request using chain of thought
            const result = await this.chainOfThought.processComplexRequest(query, userId, {
                ...context,
                userAgent: req.headers['user-agent'],
                timestamp: new Date().toISOString()
            });

            // Handle different response types
            if (result.needsClarification) {
                res.write(JSON.stringify({
                    status: "clarification_needed",
                    data: result,
                    success: true
                }) + "\n");
            } else if (result.isFollowUp) {
                res.write(JSON.stringify({
                    status: "follow_up_response",
                    data: result,
                    success: true
                }) + "\n");
            } else if (result.isConversational) {
                res.write(JSON.stringify({
                    status: "conversational",
                    data: result,
                    success: true
                }) + "\n");
            } else {
                res.write(JSON.stringify({
                    status: "completed",
                    data: result,
                    success: result.success
                }) + "\n");
            }

            res.end();

        } catch (error) {
            console.error("Error in processComplexRequest:", error);
            
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
     * Smart object finder endpoint
     */
    async findObjects(req, res) {
        try {
            const { query, options = {} } = req.body;
            const userId = req.user._id;

            if (!query?.trim()) {
                return res.status(400).json({ 
                    error: "Search query is required",
                    success: false 
                });
            }

            const result = await this.objectManager.findObjects(query, userId, options);

            res.json({
                success: true,
                data: result,
                message: result.message
            });

        } catch (error) {
            console.error("Error in findObjects:", error);
            res.status(500).json({
                error: "Error searching objects",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Intelligent object creation endpoint
     */
    async createObject(req, res) {
        try {
            const { prompt, context = {} } = req.body;
            const userId = req.user._id;

            if (!prompt?.trim()) {
                return res.status(400).json({ 
                    error: "Creation prompt is required",
                    success: false 
                });
            }

            const result = await this.objectManager.createIntelligentObject(
                prompt, 
                userId, 
                {
                    ...context,
                    originalPrompt: prompt
                }
            );

            res.json({
                success: true,
                data: result,
                message: result.message
            });

        } catch (error) {
            console.error("Error in createObject:", error);
            res.status(500).json({
                error: "Error creating object",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Calendar integration endpoint
     */
    async handleCalendarRequest(req, res) {
        try {
            const { prompt, action = "create" } = req.body;
            const userId = req.user._id;

            if (!prompt?.trim()) {
                return res.status(400).json({ 
                    error: "Calendar prompt is required",
                    success: false 
                });
            }

            let result;

            switch (action) {
                case "create":
                    const calendarData = await this.calendarService.parseCalendarRequest(prompt, userId);
                    result = await this.calendarService.createCalendarEvent(calendarData, userId);
                    break;

                case "find_time":
                    result = await this.calendarService.suggestMeetingTimes(prompt, userId);
                    break;

                default:
                    throw new Error(`Unknown calendar action: ${action}`);
            }

            res.json({
                success: true,
                data: result,
                message: result.message || "Calendar request processed successfully"
            });

        } catch (error) {
            console.error("Error in handleCalendarRequest:", error);
            res.status(500).json({
                error: "Error processing calendar request",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Get conversation context
     */
    async getConversationContext(req, res) {
        try {
            const userId = req.user._id;
            const context = this.chainOfThought.getConversationContext(userId);

            res.json({
                success: true,
                data: {
                    context,
                    count: context.length
                },
                message: `Retrieved ${context.length} conversation entries`
            });

        } catch (error) {
            console.error("Error in getConversationContext:", error);
            res.status(500).json({
                error: "Error retrieving conversation context",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Clear conversation context
     */
    async clearConversationContext(req, res) {
        try {
            const userId = req.user._id;
            this.chainOfThought.clearConversationContext(userId);

            res.json({
                success: true,
                message: "Conversation context cleared"
            });

        } catch (error) {
            console.error("Error in clearConversationContext:", error);
            res.status(500).json({
                error: "Error clearing conversation context",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Check for pending clarifications
     */
    async getPendingClarifications(req, res) {
        try {
            const userId = req.user._id;
            const pending = this.chainOfThought.pendingClarifications.get(userId);

            res.json({
                success: true,
                data: {
                    hasPending: !!pending,
                    clarification: pending || null
                },
                message: pending ? "Pending clarification found" : "No pending clarifications"
            });

        } catch (error) {
            console.error("Error in getPendingClarifications:", error);
            res.status(500).json({
                error: "Error checking pending clarifications",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Clear pending clarifications
     */
    async clearPendingClarifications(req, res) {
        try {
            const userId = req.user._id;
            this.chainOfThought.pendingClarifications.delete(userId);

            res.json({
                success: true,
                message: "Pending clarifications cleared"
            });

        } catch (error) {
            console.error("Error in clearPendingClarifications:", error);
            res.status(500).json({
                error: "Error clearing pending clarifications",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Analyze user intent without executing
     */
    async analyzeIntent(req, res) {
        try {
            const { query } = req.body;
            const userId = req.user._id;

            if (!query?.trim()) {
                return res.status(400).json({ 
                    error: "Query is required for analysis",
                    success: false 
                });
            }

            // Use chain of thought to analyze without executing
            const analysis = await this.chainOfThought.analyzeRequestStructure(query, userId);

            res.json({
                success: true,
                data: analysis,
                message: "Intent analysis completed"
            });

        } catch (error) {
            console.error("Error in analyzeIntent:", error);
            res.status(500).json({
                error: "Error analyzing intent",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Get AI capabilities and examples
     */
    async getCapabilities(req, res) {
        try {
            const capabilities = {
                complexRequests: {
                    description: "Process multi-step requests with chain-of-thought reasoning",
                    examples: [
                        "Find all my urgent tasks and create a meeting to discuss them",
                        "Create a project plan for the new feature and set up weekly check-ins",
                        "Find overdue tasks and prioritize them by importance"
                    ]
                },
                objectManagement: {
                    description: "Intelligent object finding and creation",
                    examples: [
                        "Find notes about the client meeting last week",
                        "Create a task to review the proposal by Friday",
                        "Show me all high-priority items due this week"
                    ]
                },
                calendarIntegration: {
                    description: "Calendar event creation and scheduling assistance",
                    examples: [
                        "Schedule a team meeting for tomorrow at 2pm",
                        "Find available time slots for a 1-hour meeting this week",
                        "Create a recurring standup every Monday at 9am"
                    ]
                },
                contextualConversation: {
                    description: "Maintain conversation context for follow-up questions",
                    examples: [
                        "What did we discuss about the project last time?",
                        "Can you elaborate on that suggestion?",
                        "What were the next steps we agreed on?"
                    ]
                }
            };

            res.json({
                success: true,
                data: capabilities,
                message: "AI capabilities retrieved"
            });

        } catch (error) {
            console.error("Error in getCapabilities:", error);
            res.status(500).json({
                error: "Error retrieving capabilities",
                message: error.message,
                success: false
            });
        }
    }

    /**
     * Health check endpoint
     */
    async healthCheck(req, res) {
        try {
            const status = {
                chainOfThought: !!this.chainOfThought,
                calendarService: !!this.calendarService,
                objectManager: !!this.objectManager,
                timestamp: new Date().toISOString(),
                version: "1.0.0"
            };

            res.json({
                success: true,
                data: status,
                message: "Enhanced AI services are healthy"
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
export const enhancedAIController = new EnhancedAIController();
