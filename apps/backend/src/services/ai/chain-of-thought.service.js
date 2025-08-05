import { GoogleGenerativeAI } from "@google/generative-ai";
import { Object } from "../../models/lib/object.model.js";
import { saveContent } from "../../utils/helper.service.js";

/**
 * Enhanced Chain-of-Thought AI Service
 * Provides sophisticated reasoning capabilities for complex user requests
 */
export class ChainOfThoughtService {
    constructor(apiKey, systemPrompt) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.3, // Lower temperature for more consistent reasoning
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 4096
            },
            systemInstruction: systemPrompt
        });
        
        // Context memory for conversation continuity
        this.conversationContext = new Map();
        // Conversation state tracking
        this.conversationStates = new Map();
        // Pending clarifications
        this.pendingClarifications = new Map();
    }

    /**
     * Check if this is a simple conversational query
     */
    isSimpleConversationalQuery(userPrompt) {
        const conversationalPatterns = [
            /^(hi|hello|hey|hiya)\b/i,
            /^(how are you|what's up|what are you)\b/i,
            /^(who are you|what do you do|tell me about yourself)\b/i,
            /^(good morning|good afternoon|good evening)\b/i,
            /^(thanks|thank you|bye|goodbye)\b/i,
            /^(help|what can you do)\b/i
        ];
        
        return conversationalPatterns.some(pattern => pattern.test(userPrompt.trim()));
    }

    /**
     * Handle simple conversational queries
     */
    async handleConversationalQuery(userPrompt, userId) {
        const lowerPrompt = userPrompt.toLowerCase().trim();
        
        let response = "";
        
        if (lowerPrompt.match(/^(hi|hello|hey|hiya)/)) {
            response = "Hello! I'm March AI, your intelligent assistant. I can help you manage tasks, schedule meetings, search through your objects, and handle complex multi-step requests. What would you like me to help you with today?";
        } else if (lowerPrompt.match(/^(who are you|what do you do|tell me about yourself)/)) {
            response = "I'm March AI, your enhanced AI assistant built into the March productivity platform. I can:\n\n• Create and manage tasks, notes, and other objects\n• Search through your content intelligently\n• Schedule meetings and calendar events\n• Handle complex multi-step requests\n• Ask clarifying questions when needed\n• Continue conversations with context\n\nI'm designed to understand natural language and help you be more productive. Try asking me to create a task, find something, or schedule a meeting!";
        } else if (lowerPrompt.match(/^(how are you|what's up)/)) {
            response = "I'm doing great, thank you for asking! I'm here and ready to help you with your tasks, scheduling, or any other productivity needs. What can I assist you with?";
        } else if (lowerPrompt.match(/^(help|what can you do)/)) {
            response = "I can help you with many things! Here are some examples:\n\n**Task Management:**\n• \"Create a task to review the quarterly report\"\n• \"Find all my urgent tasks due this week\"\n\n**Scheduling:**\n• \"Schedule a meeting with the team tomorrow at 2 PM\"\n• \"Find a good time for a 1-hour meeting next week\"\n\n**Complex Requests:**\n• \"Find overdue tasks and create a meeting to discuss them\"\n• \"Create a project plan with 5 tasks for the website redesign\"\n\n**Follow-up Questions:**\nI can continue conversations and answer follow-up questions based on our previous interactions.\n\nJust ask me naturally - I'll understand what you need and ask for clarification if needed!";
        } else if (lowerPrompt.match(/^(thanks|thank you)/)) {
            response = "You're very welcome! I'm always here to help. Feel free to ask me anything else you need assistance with.";
        } else if (lowerPrompt.match(/^(bye|goodbye)/)) {
            response = "Goodbye! Have a great day, and don't hesitate to come back if you need any help with your tasks or scheduling.";
        } else {
            response = "Hello! I'm March AI, your intelligent assistant. I'm here to help you manage tasks, schedule meetings, and handle complex requests. What would you like me to help you with?";
        }
        
        // Store this simple interaction in context
        this.updateConversationContext(userId, {
            request: userPrompt,
            isConversational: true,
            result: { response },
            timestamp: new Date()
        });
        
        return {
            success: true,
            isConversational: true,
            response,
            message: "Conversational response"
        };
    }

    /**
     * Main reasoning engine - breaks down complex requests into steps
     */
    async processComplexRequest(userPrompt, userId, context = {}) {
        try {
            // Check if this is a simple conversational query first
            if (this.isSimpleConversationalQuery(userPrompt)) {
                return await this.handleConversationalQuery(userPrompt, userId);
            }

            // Check if this is a response to a pending clarification
            const pendingClarification = this.pendingClarifications.get(userId);
            if (pendingClarification) {
                return await this.handleClarificationResponse(userPrompt, userId, pendingClarification);
            }

            // Get conversation context for follow-up detection
            const conversationHistory = this.getConversationContext(userId);
            const isFollowUp = this.detectFollowUpQuestion(userPrompt, conversationHistory);

            if (isFollowUp) {
                return await this.handleFollowUpQuestion(userPrompt, userId, conversationHistory);
            }

            // Step 1: Analyze the request structure
            const analysis = await this.analyzeRequestStructure(userPrompt, userId);
            
            // Check if clarification is needed
            const clarificationNeeded = this.needsClarification(analysis, userPrompt);
            if (clarificationNeeded.needed) {
                return await this.requestClarification(clarificationNeeded, userId, userPrompt, analysis);
            }
            
            // Step 2: Generate reasoning chain
            const reasoningChain = await this.generateReasoningChain(analysis, {
                ...context,
                conversationHistory
            });
            
            // Step 3: Execute the reasoning chain
            const result = await this.executeReasoningChain(reasoningChain, userId);
            
            // Step 4: Store context for future interactions
            this.updateConversationContext(userId, {
                request: userPrompt,
                analysis,
                result,
                timestamp: new Date()
            });
            
            return result;
        } catch (error) {
            console.error("Error in processComplexRequest:", error);
            throw error;
        }
    }

    /**
     * Detect if a query needs clarification
     */
    needsClarification(analysis, userPrompt) {
        const ambiguityScore = this.calculateAmbiguityScore(analysis, userPrompt);
        
        if (ambiguityScore > 0.7) {
            return {
                needed: true,
                reasons: analysis.actions.flatMap(action => action.ambiguities || []),
                missingInfo: analysis.actions.flatMap(action => action.requiredInfo || []),
                confidence: analysis.confidence
            };
        }
        
        return { needed: false };
    }

    /**
     * Calculate ambiguity score based on analysis
     */
    calculateAmbiguityScore(analysis, userPrompt) {
        let score = 0;
        
        // High ambiguity indicators
        if (analysis.actions.some(action => action.ambiguities?.length > 0)) score += 0.4;
        if (analysis.actions.some(action => action.requiredInfo?.length > 0)) score += 0.3;
        if (analysis.confidence < 0.6) score += 0.3;
        if (userPrompt.split(' ').length < 4) score += 0.2; // Very short queries
        if (analysis.contextNeeded?.length > 0) score += 0.2;
        
        return Math.min(score, 1.0);
    }

    /**
     * Request clarification from user
     */
    async requestClarification(clarificationNeeded, userId, originalPrompt, analysis) {
        const clarificationQuestions = await this.generateClarificationQuestions(
            clarificationNeeded, 
            originalPrompt, 
            analysis
        );
        
        // Store pending clarification
        this.pendingClarifications.set(userId, {
            originalPrompt,
            analysis,
            questions: clarificationQuestions,
            timestamp: new Date()
        });
        
        return {
            success: true,
            needsClarification: true,
            questions: clarificationQuestions,
            message: "I need some clarification to help you better.",
            originalPrompt,
            conversationId: `clarification_${Date.now()}`
        };
    }

    /**
     * Generate specific clarification questions
     */
    async generateClarificationQuestions(clarificationNeeded, originalPrompt, analysis) {
        const questionPrompt = `
        The user said: "${originalPrompt}"
        
        Analysis shows these ambiguities: ${JSON.stringify(clarificationNeeded.reasons)}
        Missing information: ${JSON.stringify(clarificationNeeded.missingInfo)}
        
        Generate 2-3 specific clarifying questions to help complete the request.
        Return as JSON array:
        [
            {
                "question": "What should the task title be?",
                "type": "text",
                "suggestions": ["option1", "option2"]
            },
            {
                "question": "When should this be due?",
                "type": "date",
                "suggestions": ["today", "tomorrow", "next week"]
            }
        ]
        
        Question types: text, date, choice, time, priority
        `;
        
        try {
            const result = await this.model.generateContent(questionPrompt);
            const response = result.response.text();
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (error) {
            console.error("Error generating clarification questions:", error);
            return this.getDefaultClarificationQuestions(originalPrompt, analysis);
        }
    }

    /**
     * Handle clarification response from user
     */
    async handleClarificationResponse(userResponse, userId, pendingClarification) {
        try {
            // Parse the user's clarification response
            const parsedResponse = await this.parseClarificationResponse(
                userResponse, 
                pendingClarification
            );
            
            // Enhance the original analysis with clarification
            const enhancedAnalysis = await this.enhanceAnalysisWithClarification(
                pendingClarification.analysis,
                parsedResponse
            );
            
            // Clear pending clarification
            this.pendingClarifications.delete(userId);
            
            // Generate reasoning chain with enhanced analysis
            const reasoningChain = await this.generateReasoningChain(enhancedAnalysis, {
                clarificationProvided: true,
                originalPrompt: pendingClarification.originalPrompt,
                clarificationResponse: userResponse
            });
            
            // Execute the reasoning chain
            const result = await this.executeReasoningChain(reasoningChain, userId);
            
            // Store context
            this.updateConversationContext(userId, {
                request: pendingClarification.originalPrompt,
                clarification: userResponse,
                analysis: enhancedAnalysis,
                result,
                timestamp: new Date()
            });
            
            return result;
        } catch (error) {
            console.error("Error handling clarification response:", error);
            // Clear the pending clarification and return error
            this.pendingClarifications.delete(userId);
            throw error;
        }
    }

    /**
     * Detect if this is a follow-up question
     */
    detectFollowUpQuestion(userPrompt, conversationHistory) {
        if (conversationHistory.length === 0) return false;
        
        const followUpIndicators = [
            'what about', 'and also', 'can you also', 'what if', 'how about',
            'tell me more', 'explain', 'elaborate', 'what did we', 'from before',
            'that', 'this', 'it', 'them', 'those', 'these', 'continue', 'next'
        ];
        
        const lowerPrompt = userPrompt.toLowerCase();
        return followUpIndicators.some(indicator => lowerPrompt.includes(indicator)) ||
               lowerPrompt.split(' ').length < 6; // Short queries are often follow-ups
    }

    /**
     * Handle follow-up questions using conversation context
     */
    async handleFollowUpQuestion(userPrompt, userId, conversationHistory) {
        const recentContext = conversationHistory.slice(-3); // Last 3 interactions
        
        const followUpPrompt = `
        Based on our recent conversation:
        ${recentContext.map(ctx => `
        User: ${ctx.request}
        Result: ${JSON.stringify(ctx.result?.finalResult || ctx.result, null, 2)}
        `).join('\n')}
        
        The user now asks: "${userPrompt}"
        
        This appears to be a follow-up question. Please:
        1. Understand what they're referring to from the context
        2. Provide a helpful response that builds on the previous conversation
        3. If they want to perform an action, determine what action based on context
        
        Respond naturally as if continuing the conversation.
        `;
        
        try {
            const result = await this.model.generateContent(followUpPrompt);
            const response = result.response.text();
            
            // Store this interaction
            this.updateConversationContext(userId, {
                request: userPrompt,
                isFollowUp: true,
                result: { response },
                timestamp: new Date()
            });
            
            return {
                success: true,
                isFollowUp: true,
                response,
                conversationContext: recentContext,
                message: "Follow-up response based on our conversation"
            };
        } catch (error) {
            console.error("Error handling follow-up question:", error);
            throw error;
        }
    }

    /**
     * Parse clarification response
     */
    async parseClarificationResponse(userResponse, pendingClarification) {
        const parsePrompt = `
        The user was asked these clarification questions:
        ${JSON.stringify(pendingClarification.questions, null, 2)}
        
        Their response: "${userResponse}"
        
        Parse their response and map it to the questions. Return JSON:
        {
            "answers": [
                {
                    "questionIndex": 0,
                    "answer": "parsed answer",
                    "type": "text|date|choice|time|priority"
                }
            ],
            "confidence": 0.95
        }
        `;
        
        try {
            const result = await this.model.generateContent(parsePrompt);
            const response = result.response.text();
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (error) {
            console.error("Error parsing clarification response:", error);
            return {
                answers: [{ questionIndex: 0, answer: userResponse, type: "text" }],
                confidence: 0.5
            };
        }
    }

    /**
     * Enhance analysis with clarification data
     */
    async enhanceAnalysisWithClarification(originalAnalysis, clarificationData) {
        const enhanced = { ...originalAnalysis };
        
        // Apply clarification answers to enhance the analysis
        clarificationData.answers.forEach((answer, index) => {
            const question = originalAnalysis.actions[0]; // Simplification for now
            
            switch (answer.type) {
                case 'text':
                    if (answer.answer.length > 0) {
                        enhanced.actions[0].description = answer.answer;
                        enhanced.actions[0].requiredInfo = enhanced.actions[0].requiredInfo?.filter(info => 
                            !info.toLowerCase().includes('title') && !info.toLowerCase().includes('content')
                        ) || [];
                    }
                    break;
                case 'date':
                    enhanced.actions[0].parameters = enhanced.actions[0].parameters || {};
                    enhanced.actions[0].parameters.dueDate = answer.answer;
                    break;
                case 'priority':
                    enhanced.actions[0].parameters = enhanced.actions[0].parameters || {};
                    enhanced.actions[0].parameters.priority = answer.answer;
                    break;
            }
        });
        
        // Increase confidence since we have clarification
        enhanced.confidence = Math.min(enhanced.confidence + 0.3, 1.0);
        
        return enhanced;
    }

    /**
     * Get default clarification questions
     */
    getDefaultClarificationQuestions(originalPrompt, analysis) {
        const questions = [];
        
        if (originalPrompt.toLowerCase().includes('create') || originalPrompt.toLowerCase().includes('task')) {
            questions.push({
                question: "What should the task title be?",
                type: "text",
                suggestions: ["Complete project review", "Call client", "Write report"]
            });
            
            questions.push({
                question: "When should this be due?",
                type: "date",
                suggestions: ["today", "tomorrow", "next week", "no due date"]
            });
        }
        
        if (originalPrompt.toLowerCase().includes('meeting') || originalPrompt.toLowerCase().includes('schedule')) {
            questions.push({
                question: "What time would you prefer?",
                type: "time",
                suggestions: ["9:00 AM", "2:00 PM", "4:00 PM"]
            });
            
            questions.push({
                question: "How long should the meeting be?",
                type: "choice",
                suggestions: ["30 minutes", "1 hour", "2 hours"]
            });
        }
        
        if (questions.length === 0) {
            questions.push({
                question: "Could you provide more details about what you'd like me to do?",
                type: "text",
                suggestions: ["I need help with...", "Please create...", "Can you find..."]
            });
        }
        
        return questions;
    }

    /**
     * Analyzes the structure and complexity of user requests
     */
    async analyzeRequestStructure(userPrompt, userId) {
        const analysisPrompt = `
        Analyze this user request for complexity and structure: "${userPrompt}"
        
        Consider:
        1. Is this a single action or multiple actions?
        2. Are there dependencies between actions?
        3. What information is needed to complete the request?
        4. Are there any ambiguities that need clarification?
        5. What is the user's likely intent and goal?
        
        Return a JSON object with:
        {
            "complexity": "simple|moderate|complex",
            "actionCount": number,
            "actions": [
                {
                    "type": "search|create|update|delete|calendar|conversation",
                    "description": "what needs to be done",
                    "dependencies": ["list of dependencies"],
                    "priority": "high|medium|low",
                    "requiredInfo": ["list of required information"],
                    "ambiguities": ["list of unclear aspects"]
                }
            ],
            "overallIntent": "user's main goal",
            "contextNeeded": ["what additional context would help"],
            "confidence": 0.95
        }`;

        const result = await this.model.generateContent(analysisPrompt);
        const response = result.response.text();
        
        try {
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (parseError) {
            console.error("Failed to parse analysis response:", response);
            // Fallback to simple analysis
            return {
                complexity: "simple",
                actionCount: 1,
                actions: [{
                    type: "conversation",
                    description: userPrompt,
                    dependencies: [],
                    priority: "medium",
                    requiredInfo: [],
                    ambiguities: []
                }],
                overallIntent: "User needs assistance",
                contextNeeded: [],
                confidence: 0.5
            };
        }
    }

    /**
     * Generates a step-by-step reasoning chain
     */
    async generateReasoningChain(analysis, context) {
        const chainPrompt = `
        Based on this analysis: ${JSON.stringify(analysis, null, 2)}
        And context: ${JSON.stringify(context, null, 2)}
        
        Generate a step-by-step reasoning chain to accomplish the user's goal.
        
        Each step should have:
        - A clear action to take
        - Expected outcome
        - How to handle potential failures
        - What information to pass to the next step
        
        Return a JSON array of steps:
        [
            {
                "stepNumber": 1,
                "action": "specific action to take",
                "method": "search|create|update|delete|calendar|analyze",
                "parameters": {},
                "expectedOutcome": "what should happen",
                "failureHandling": "what to do if this fails",
                "outputForNext": "what info to pass forward"
            }
        ]`;

        const result = await this.model.generateContent(chainPrompt);
        const response = result.response.text();
        
        try {
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (parseError) {
            console.error("Failed to parse reasoning chain:", response);
            // Fallback to simple chain
            return [{
                stepNumber: 1,
                action: "Process user request",
                method: "analyze",
                parameters: { query: analysis.overallIntent },
                expectedOutcome: "Provide helpful response",
                failureHandling: "Ask for clarification",
                outputForNext: "Response ready"
            }];
        }
    }

    /**
     * Executes the reasoning chain step by step
     */
    async executeReasoningChain(reasoningChain, userId) {
        const results = [];
        let contextData = {};

        for (const step of reasoningChain) {
            try {
                console.log(`Executing step ${step.stepNumber}: ${step.action}`);
                
                const stepResult = await this.executeStep(step, userId, contextData);
                results.push({
                    step: step.stepNumber,
                    action: step.action,
                    result: stepResult,
                    success: true
                });
                
                // Pass data to next step
                contextData = { ...contextData, ...stepResult };
                
            } catch (error) {
                console.error(`Step ${step.stepNumber} failed:`, error);
                
                // Handle failure according to step's failure handling
                const fallbackResult = await this.handleStepFailure(step, error, userId);
                results.push({
                    step: step.stepNumber,
                    action: step.action,
                    result: fallbackResult,
                    success: false,
                    error: error.message
                });
                
                // Decide whether to continue or stop
                if (step.failureHandling.includes("stop")) {
                    break;
                }
            }
        }

        return {
            success: results.every(r => r.success),
            steps: results,
            finalResult: this.synthesizeFinalResult(results),
            executionSummary: this.generateExecutionSummary(results)
        };
    }

    /**
     * Executes individual steps based on their method
     */
    async executeStep(step, userId, contextData) {
        switch (step.method) {
            case 'search':
                return await this.executeSearchStep(step, userId, contextData);
            case 'create':
                return await this.executeCreateStep(step, userId, contextData);
            case 'update':
                return await this.executeUpdateStep(step, userId, contextData);
            case 'delete':
                return await this.executeDeleteStep(step, userId, contextData);
            case 'calendar':
                return await this.executeCalendarStep(step, userId, contextData);
            case 'analyze':
                return await this.executeAnalyzeStep(step, userId, contextData);
            default:
                throw new Error(`Unknown step method: ${step.method}`);
        }
    }

    /**
     * Execute search operations
     */
    async executeSearchStep(step, userId, contextData) {
        const { parameters } = step;
        
        // Build search query
        const searchQuery = {
            user: userId,
            ...parameters
        };

        // Add filters from context if available
        if (contextData.filters) {
            Object.assign(searchQuery, contextData.filters);
        }

        const objects = await Object.find(searchQuery)
            .populate('labels')
            .sort({ updatedAt: -1 })
            .limit(parameters.limit || 20);

        return {
            objects,
            count: objects.length,
            searchQuery,
            summary: `Found ${objects.length} objects matching criteria`
        };
    }

    /**
     * Execute object creation
     */
    async executeCreateStep(step, userId, contextData) {
        const { parameters } = step;
        
        // Enhance parameters with context data
        const objectData = {
            user: userId,
            title: parameters.title || contextData.title || "New Object",
            description: parameters.description || contextData.description || "",
            type: parameters.type || "todo",
            status: parameters.status || "null",
            ...parameters
        };

        // Create the object
        const object = await Object.create(objectData);
        
        // Save to search index
        await saveContent(object);

        return {
            object,
            created: true,
            summary: `Created ${object.type}: ${object.title}`
        };
    }

    /**
     * Execute object updates
     */
    async executeUpdateStep(step, userId, contextData) {
        const { parameters } = step;
        
        if (!parameters.objectId && !contextData.objectId) {
            throw new Error("No object ID provided for update");
        }

        const objectId = parameters.objectId || contextData.objectId;
        const updateData = { ...parameters.updates };

        const object = await Object.findByIdAndUpdate(
            objectId,
            updateData,
            { new: true }
        );

        if (!object) {
            throw new Error("Object not found for update");
        }

        return {
            object,
            updated: true,
            summary: `Updated ${object.type}: ${object.title}`
        };
    }

    /**
     * Execute delete operations
     */
    async executeDeleteStep(step, userId, contextData) {
        const { parameters } = step;
        
        if (!parameters.objectId && !contextData.objectId) {
            throw new Error("No object ID provided for deletion");
        }

        const objectId = parameters.objectId || contextData.objectId;
        
        const object = await Object.findByIdAndUpdate(
            objectId,
            { isDeleted: true },
            { new: true }
        );

        if (!object) {
            throw new Error("Object not found for deletion");
        }

        return {
            object,
            deleted: true,
            summary: `Deleted ${object.type}: ${object.title}`
        };
    }

    /**
     * Execute calendar operations
     */
    async executeCalendarStep(step, userId, contextData) {
        // This would integrate with calendar services
        // For now, create a meeting object
        const meetingData = {
            user: userId,
            type: "meeting",
            title: step.parameters.title || "New Meeting",
            description: step.parameters.description || "",
            due: {
                date: step.parameters.date || new Date().toISOString(),
                string: step.parameters.dateString || "Today"
            },
            metadata: {
                calendar: true,
                attendees: step.parameters.attendees || [],
                location: step.parameters.location || ""
            }
        };

        const meeting = await Object.create(meetingData);
        await saveContent(meeting);

        return {
            meeting,
            created: true,
            summary: `Created calendar event: ${meeting.title}`
        };
    }

    /**
     * Execute analysis operations
     */
    async executeAnalyzeStep(step, userId, contextData) {
        const analysisPrompt = `
        Analyze the following data and provide insights:
        Parameters: ${JSON.stringify(step.parameters, null, 2)}
        Context: ${JSON.stringify(contextData, null, 2)}
        
        Provide a helpful analysis and recommendations.`;

        const result = await this.model.generateContent(analysisPrompt);
        const analysis = result.response.text();

        return {
            analysis,
            insights: true,
            summary: "Analysis completed"
        };
    }

    /**
     * Handle step failures with appropriate fallbacks
     */
    async handleStepFailure(step, error, userId) {
        console.log(`Handling failure for step ${step.stepNumber}: ${error.message}`);
        
        // Generate a helpful error response
        const fallbackPrompt = `
        Step failed: ${step.action}
        Error: ${error.message}
        Expected outcome: ${step.expectedOutcome}
        
        Provide a helpful explanation and suggest alternatives.`;

        try {
            const result = await this.model.generateContent(fallbackPrompt);
            return {
                error: true,
                message: error.message,
                suggestion: result.response.text(),
                summary: `Step ${step.stepNumber} failed but handled gracefully`
            };
        } catch (fallbackError) {
            return {
                error: true,
                message: error.message,
                suggestion: "I encountered an issue completing this step. Please try again or rephrase your request.",
                summary: "Step failed with fallback error"
            };
        }
    }

    /**
     * Synthesize final result from all steps
     */
    synthesizeFinalResult(results) {
        const successfulSteps = results.filter(r => r.success);
        const failedSteps = results.filter(r => !r.success);

        if (successfulSteps.length === 0) {
            return {
                success: false,
                message: "I wasn't able to complete your request. Please try rephrasing or breaking it into smaller parts.",
                details: failedSteps.map(s => s.result.suggestion).join(" ")
            };
        }

        // Extract meaningful results
        const createdObjects = successfulSteps
            .filter(s => s.result.created || s.result.object)
            .map(s => s.result.object || s.result.meeting);

        const foundObjects = successfulSteps
            .filter(s => s.result.objects)
            .flatMap(s => s.result.objects);

        const analyses = successfulSteps
            .filter(s => s.result.analysis)
            .map(s => s.result.analysis);

        return {
            success: true,
            createdObjects,
            foundObjects,
            analyses,
            summary: successfulSteps.map(s => s.result.summary).join(". "),
            stepCount: results.length,
            successCount: successfulSteps.length
        };
    }

    /**
     * Generate execution summary
     */
    generateExecutionSummary(results) {
        const total = results.length;
        const successful = results.filter(r => r.success).length;
        const failed = total - successful;

        return {
            totalSteps: total,
            successfulSteps: successful,
            failedSteps: failed,
            successRate: (successful / total * 100).toFixed(1) + "%",
            executionTime: new Date().toISOString()
        };
    }

    /**
     * Update conversation context for continuity
     */
    updateConversationContext(userId, contextData) {
        const userContext = this.conversationContext.get(userId) || [];
        userContext.push(contextData);
        
        // Keep only last 10 interactions to manage memory
        if (userContext.length > 10) {
            userContext.shift();
        }
        
        this.conversationContext.set(userId, userContext);
    }

    /**
     * Get conversation context for user
     */
    getConversationContext(userId) {
        return this.conversationContext.get(userId) || [];
    }

    /**
     * Clear conversation context
     */
    clearConversationContext(userId) {
        this.conversationContext.delete(userId);
    }
}
