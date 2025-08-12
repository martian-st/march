import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Enhanced Intent Understanding Service
 * Uses multiple LLM strategies for superior intent recognition
 */
export class EnhancedIntentUnderstandingService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.primaryModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.reasoningModel = this.genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: { temperature: 0.1 } // Lower temperature for more consistent reasoning
        });
    }

    /**
     * Multi-stage intent understanding with fallback strategies
     */
    async understandUserIntent(query, userId, context = {}) {
        try {
            // Stage 1: Primary intent analysis with detailed reasoning
            const primaryAnalysis = await this.performPrimaryIntentAnalysis(query, context);
            
            // Stage 2: Validate and enhance with reasoning model
            const enhancedAnalysis = await this.enhanceWithReasoning(query, primaryAnalysis, context);
            
            // Stage 3: Apply user context and learning
            const contextualAnalysis = await this.applyUserContext(enhancedAnalysis, userId, context);
            
            return {
                success: true,
                intent: contextualAnalysis.intent,
                confidence: contextualAnalysis.confidence,
                reasoning: contextualAnalysis.reasoning,
                parameters: contextualAnalysis.parameters,
                suggestedResponse: contextualAnalysis.suggestedResponse,
                actionPlan: contextualAnalysis.actionPlan
            };
        } catch (error) {
            console.error('Enhanced intent understanding error:', error);
            
            // Fallback to rule-based analysis
            return this.fallbackIntentAnalysis(query);
        }
    }

    /**
     * Primary intent analysis with comprehensive understanding
     */
    async performPrimaryIntentAnalysis(query, context) {
        const prompt = `
You are an advanced AI assistant that understands user intent with human-like comprehension. 
Analyze this user request and provide detailed intent understanding.

User Query: "${query}"
Context: ${JSON.stringify(context)}

Analyze this request and respond with a JSON object:
{
    "intent": "one of: create_task, create_note, create_meeting, find_items, update_items, delete_items, schedule_event, general_question, conversational, complex_workflow",
    "confidence": 0.0-1.0,
    "reasoning": "detailed explanation of why you chose this intent",
    "parameters": {
        "action": "specific action to take",
        "object_type": "task|note|meeting|event|etc",
        "title": "extracted or inferred title",
        "description": "extracted or inferred description", 
        "priority": "high|medium|low",
        "due_date": "extracted date information",
        "search_terms": "terms to search for",
        "update_fields": "fields to update",
        "time_context": "when this should happen"
    },
    "suggestedResponse": "natural, conversational response to acknowledge the request",
    "actionPlan": [
        "step 1: what to do first",
        "step 2: what to do next",
        "etc"
    ],
    "needsClarification": false,
    "clarificationQuestions": []
}

Key principles:
1. UNDERSTAND CONTEXT: "hey can you add a task for me" is clearly a task creation request, not a greeting
2. BE HELPFUL: If the request is vague, make reasonable assumptions and offer to refine later
3. EXTRACT MEANING: Look beyond keywords to understand true intent
4. CONVERSATIONAL: Respond naturally like a human assistant would
5. PROACTIVE: Anticipate what the user might need

Examples:
- "hey can you add a task for me" → intent: "create_task", response: "Of course! I'd be happy to create a task for you. What would you like the task to be about?"
- "create a task to call John tomorrow" → intent: "create_task", title: "Call John", due_date: "tomorrow"
- "find my urgent tasks" → intent: "find_items", search_terms: "urgent tasks"
- "schedule a meeting with the team" → intent: "create_meeting", title: "Team meeting"

Respond only with valid JSON.
        `;

        const result = await this.primaryModel.generateContent(prompt);
        const response = result.response.text();
        
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('Failed to parse primary analysis:', parseError);
            throw new Error('Failed to parse intent analysis');
        }
    }

    /**
     * Enhance analysis with reasoning model for validation
     */
    async enhanceWithReasoning(query, primaryAnalysis, context) {
        const prompt = `
You are a reasoning validator. Review this intent analysis and improve it if needed.

Original Query: "${query}"
Primary Analysis: ${JSON.stringify(primaryAnalysis)}

Validate and enhance this analysis. Consider:
1. Is the intent classification correct?
2. Are the parameters reasonable?
3. Is the suggested response helpful and natural?
4. Can we make better assumptions to be more helpful?

Respond with an improved JSON object with the same structure, or confirm the original if it's already good.
Focus on being maximally helpful while maintaining accuracy.

Respond only with valid JSON.
        `;

        try {
            const result = await this.reasoningModel.generateContent(prompt);
            const response = result.response.text();
            
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return primaryAnalysis; // Fallback to primary if validation fails
            }
            
            const enhanced = JSON.parse(jsonMatch[0]);
            
            // Ensure confidence is reasonable
            enhanced.confidence = Math.max(0.7, Math.min(1.0, enhanced.confidence || 0.8));
            
            return enhanced;
        } catch (error) {
            console.error('Reasoning enhancement failed:', error);
            return primaryAnalysis; // Fallback to primary analysis
        }
    }

    /**
     * Apply user context and learning patterns
     */
    async applyUserContext(analysis, userId, context) {
        // For now, return the enhanced analysis
        // In the future, this could incorporate user patterns, preferences, etc.
        
        // Add user-specific enhancements
        if (context.userPreferences) {
            // Apply user preferences to the analysis
            if (context.userPreferences.defaultPriority) {
                analysis.parameters.priority = analysis.parameters.priority || context.userPreferences.defaultPriority;
            }
        }
        
        // Enhance confidence based on user patterns
        if (context.previousInteractions) {
            // If user frequently creates tasks, boost confidence for task creation
            const taskCreationFrequency = context.previousInteractions.filter(i => i.intent === 'create_task').length;
            if (taskCreationFrequency > 5 && analysis.intent === 'create_task') {
                analysis.confidence = Math.min(1.0, analysis.confidence + 0.1);
            }
        }
        
        return analysis;
    }

    /**
     * Fallback rule-based intent analysis
     */
    fallbackIntentAnalysis(query) {
        const lowerQuery = query.toLowerCase().trim();
        
        // Task creation patterns
        if (this.matchesPattern(lowerQuery, [
            /(?:can you |could you |please )?(?:add|create|make) (?:a )?task/i,
            /(?:i need|i want) (?:to )?(?:add|create|make) (?:a )?task/i,
            /task for me/i
        ])) {
            return {
                success: true,
                intent: 'create_task',
                confidence: 0.8,
                reasoning: 'Matched task creation patterns',
                parameters: {
                    action: 'create',
                    object_type: 'task',
                    title: 'New task'
                },
                suggestedResponse: "I'd be happy to create a task for you! What would you like the task to be about?",
                actionPlan: ['Ask for task details', 'Create the task', 'Confirm creation']
            };
        }
        
        // Note creation patterns
        if (this.matchesPattern(lowerQuery, [
            /(?:add|create|make) (?:a )?note/i,
            /take (?:a )?note/i
        ])) {
            return {
                success: true,
                intent: 'create_note',
                confidence: 0.8,
                reasoning: 'Matched note creation patterns',
                parameters: {
                    action: 'create',
                    object_type: 'note'
                },
                suggestedResponse: "I'll help you create a note. What would you like to note down?",
                actionPlan: ['Ask for note content', 'Create the note', 'Confirm creation']
            };
        }
        
        // Search patterns
        if (this.matchesPattern(lowerQuery, [
            /(?:find|search|show|get) (?:my )?(?:tasks|notes|items)/i,
            /what (?:tasks|notes|items)/i
        ])) {
            return {
                success: true,
                intent: 'find_items',
                confidence: 0.7,
                reasoning: 'Matched search patterns',
                parameters: {
                    action: 'search',
                    search_terms: this.extractSearchTerms(query)
                },
                suggestedResponse: "I'll search for your items. Let me find what you're looking for.",
                actionPlan: ['Search items', 'Present results', 'Offer refinement options']
            };
        }
        
        // Default conversational fallback
        return {
            success: true,
            intent: 'conversational',
            confidence: 0.5,
            reasoning: 'No specific patterns matched, treating as conversation',
            parameters: {},
            suggestedResponse: "I'm here to help! Could you tell me more about what you'd like to do?",
            actionPlan: ['Ask for clarification', 'Understand intent', 'Provide assistance']
        };
    }

    /**
     * Check if query matches any of the given patterns
     */
    matchesPattern(query, patterns) {
        return patterns.some(pattern => pattern.test(query));
    }

    /**
     * Extract search terms from query
     */
    extractSearchTerms(query) {
        return query
            .replace(/(?:find|search|show|get|what|my|the|a|an)\s+/gi, '')
            .trim();
    }

    /**
     * Generate contextual follow-up questions
     */
    generateFollowUpQuestions(intent, parameters) {
        switch (intent) {
            case 'create_task':
                return [
                    "What should the task be about?",
                    "When would you like this completed?",
                    "How important is this task?"
                ];
            case 'create_note':
                return [
                    "What would you like to note down?",
                    "Is this related to a specific project?"
                ];
            case 'find_items':
                return [
                    "What specific items are you looking for?",
                    "Any particular time period?",
                    "Should I filter by priority or status?"
                ];
            default:
                return [
                    "Could you tell me more about what you need?",
                    "What would you like me to help you with?"
                ];
        }
    }
}