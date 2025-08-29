import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Enhanced Intent Understanding Service
 * Uses multiple LLM strategies for superior intent recognition
 */
export class EnhancedIntentUnderstandingService {
    constructor (apiKey) {
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
    async understandUserIntent (query, userId, context = {}) {
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
    async performPrimaryIntentAnalysis (query, context) {
        const prompt = `
You are an advanced AI assistant that understands user intent with human-like comprehension. 
Your PRIMARY TASK is to correctly distinguish between SEARCH queries and CREATE requests.

User Query: "${query}"
Context: ${JSON.stringify(context)}

CRITICAL DISTINCTION RULES:
1. SEARCH QUERIES - User wants to find/view existing items:
   - "do I have any tasks" → SEARCH (find_items)
   - "show me my tasks" → SEARCH (find_items)  
   - "what tasks do I have" → SEARCH (find_items)
   - "find my overdue items" → SEARCH (find_items)
   - "any new emails" → SEARCH (find_items)
   - "show me what's due today" → SEARCH (find_items)

2. CREATE QUERIES - User wants to make new items:
   - "create a task" → CREATE (create_task)
   - "add a new task" → CREATE (create_task)
   - "make a task to call John" → CREATE (create_task)
   - "I need to add a reminder" → CREATE (create_task)

3. QUESTION WORDS indicate SEARCH:
   - "do I have..." → SEARCH
   - "what..." → SEARCH  
   - "show me..." → SEARCH
   - "find..." → SEARCH
   - "any..." → SEARCH

4. ACTION WORDS indicate CREATE:
   - "create..." → CREATE
   - "add..." → CREATE
   - "make..." → CREATE
   - "I need to..." → CREATE

Analyze this request and respond with a JSON object:
{
    "intent": "one of: create_task, create_note, create_meeting, find_items, update_items, delete_items, schedule_event, general_question, conversational, complex_workflow",
    "confidence": 0.0-1.0,
    "reasoning": "detailed explanation focusing on search vs create distinction",
    "parameters": {
        "action": "specific action to take",
        "object_type": "task|note|meeting|event|etc",
        "title": "extracted or inferred title",
        "description": "extracted or inferred description", 
        "priority": "high|medium|low",
        "due_date": "extracted date information",
        "search_terms": "terms to search for",
        "update_fields": "fields to update",
        "time_context": "when this should happen",
        "source_filter": "specific source if mentioned (linear, gmail, github, twitter, calendar)"
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

SEARCH EXAMPLES:
- "do I have any tasks" → intent: "find_items", search_terms: "tasks", reasoning: "Question word 'do I have' indicates search for existing items"
- "show me my items" → intent: "find_items", search_terms: "items", reasoning: "Show me indicates search/display request"
- "what's overdue" → intent: "find_items", search_terms: "overdue", reasoning: "What's indicates search query"
- "any new Linear tasks" → intent: "find_items", search_terms: "tasks", source_filter: "linear"

CREATE EXAMPLES:
- "create a task to call John" → intent: "create_task", title: "Call John", reasoning: "Create indicates new item creation"
- "add a reminder for tomorrow" → intent: "create_task", title: "Reminder", due_date: "tomorrow"
- "I need to make a note" → intent: "create_note", reasoning: "Make indicates creation intent"

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
    async enhanceWithReasoning (query, primaryAnalysis, context) {
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
    async applyUserContext (analysis, userId, context) {
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
     * Fallback rule-based intent analysis with improved search detection
     */
    fallbackIntentAnalysis (query) {
        const lowerQuery = query.toLowerCase().trim();

        // SEARCH PATTERNS - High priority to fix the core issue
        if (this.matchesPattern(lowerQuery, [
            /^(?:do i have|do we have|have i got|have we got)/i,
            /^(?:show me|show us|display|list)/i,
            /^(?:what|which|where|when|how many)/i,
            /^(?:find|search|get|fetch|retrieve)/i,
            /^(?:any|are there|is there)/i,
            /(?:tasks|items|notes|meetings|events|reminders)(?:\s+(?:do|are|exist|available))?$/i
        ])) {
            return {
                success: true,
                intent: 'find_items',
                confidence: 0.9,
                reasoning: 'Matched search/query patterns - user wants to find existing items',
                parameters: {
                    action: 'search',
                    search_terms: this.extractSearchTerms(query),
                    object_type: this.extractObjectType(query)
                },
                suggestedResponse: "Let me search for your items.",
                actionPlan: ['Search existing items', 'Present results', 'Offer refinement options']
            };
        }

        // OVERDUE/UPCOMING SEARCH PATTERNS
        if (this.matchesPattern(lowerQuery, [
            /(?:overdue|past due|late|missed)/i,
            /(?:upcoming|due soon|due today|due tomorrow)/i,
            /(?:what's due|what is due)/i
        ])) {
            return {
                success: true,
                intent: 'find_items',
                confidence: 0.9,
                reasoning: 'Time-based search query for overdue or upcoming items',
                parameters: {
                    action: 'search',
                    search_terms: this.extractSearchTerms(query),
                    time_filter: this.extractTimeFilter(query)
                },
                suggestedResponse: "Let me find your time-sensitive items.",
                actionPlan: ['Search by time criteria', 'Present results with urgency', 'Suggest actions']
            };
        }

        // SOURCE-SPECIFIC SEARCH PATTERNS
        if (this.matchesPattern(lowerQuery, [
            /(?:linear|github|gmail|twitter|calendar|cal)\s+(?:tasks|items|issues|emails|events)/i,
            /(?:any|new|recent)\s+(?:linear|github|gmail|twitter|calendar)/i,
            /from\s+(?:linear|github|gmail|twitter|calendar)/i
        ])) {
            return {
                success: true,
                intent: 'find_items',
                confidence: 0.9,
                reasoning: 'Source-specific search query',
                parameters: {
                    action: 'search',
                    search_terms: this.extractSearchTerms(query),
                    source_filter: this.extractSourceFilter(query)
                },
                suggestedResponse: "Let me search your integrated platforms.",
                actionPlan: ['Search specific source', 'Present results', 'Show integration status']
            };
        }

        // TASK CREATION PATTERNS - Only clear creation intents
        if (this.matchesPattern(lowerQuery, [
            /^(?:create|add|make|new)\s+(?:a\s+)?(?:task|todo|reminder)/i,
            /^(?:i need to|i want to|i have to)\s+(?:create|add|make)/i,
            /^(?:can you|could you|please)\s+(?:create|add|make)\s+(?:a\s+)?(?:task|todo)/i
        ])) {
            return {
                success: true,
                intent: 'create_task',
                confidence: 0.8,
                reasoning: 'Clear task creation request with explicit action words',
                parameters: {
                    action: 'create',
                    object_type: 'task',
                    title: this.extractTitle(query) || 'New task'
                },
                suggestedResponse: "I'd be happy to create a task for you! What would you like the task to be about?",
                actionPlan: ['Extract task details', 'Create the task', 'Confirm creation']
            };
        }

        // NOTE CREATION PATTERNS
        if (this.matchesPattern(lowerQuery, [
            /^(?:create|add|make|new)\s+(?:a\s+)?note/i,
            /^(?:take|write)\s+(?:a\s+)?note/i,
            /^(?:i need to|i want to)\s+(?:note|write down|jot down)/i
        ])) {
            return {
                success: true,
                intent: 'create_note',
                confidence: 0.8,
                reasoning: 'Clear note creation request',
                parameters: {
                    action: 'create',
                    object_type: 'note'
                },
                suggestedResponse: "I'll help you create a note. What would you like to note down?",
                actionPlan: ['Ask for note content', 'Create the note', 'Confirm creation']
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
    matchesPattern (query, patterns) {
        return patterns.some(pattern => pattern.test(query));
    }

    /**
     * Extract search terms from query
     */
    extractSearchTerms (query) {
        return query
            .replace(/(?:find|search|show|get|what|my|the|a|an|do|i|have|any|are|there)\s+/gi, '')
            .replace(/(?:tasks|items|notes|meetings|events|reminders)$/gi, '')
            .trim();
    }

    /**
     * Extract object type from query
     */
    extractObjectType (query) {
        const lowerQuery = query.toLowerCase();
        if (/tasks?|todos?/i.test(lowerQuery)) return 'task';
        if (/notes?/i.test(lowerQuery)) return 'note';
        if (/meetings?|events?/i.test(lowerQuery)) return 'meeting';
        if (/reminders?/i.test(lowerQuery)) return 'task';
        return 'item';
    }

    /**
     * Extract time filter from query
     */
    extractTimeFilter (query) {
        const lowerQuery = query.toLowerCase();
        if (/overdue|past due|late|missed/i.test(lowerQuery)) return 'overdue';
        if (/due today|today/i.test(lowerQuery)) return 'today';
        if (/due tomorrow|tomorrow/i.test(lowerQuery)) return 'tomorrow';
        if (/upcoming|due soon/i.test(lowerQuery)) return 'upcoming';
        return null;
    }

    /**
     * Extract source filter from query
     */
    extractSourceFilter (query) {
        const lowerQuery = query.toLowerCase();
        if (/linear/i.test(lowerQuery)) return 'linear';
        if (/github/i.test(lowerQuery)) return 'github';
        if (/gmail/i.test(lowerQuery)) return 'gmail';
        if (/twitter/i.test(lowerQuery)) return 'twitter';
        if (/calendar|cal/i.test(lowerQuery)) return 'cal';
        return null;
    }

    /**
     * Extract title from creation query
     */
    extractTitle (query) {
        const match = query.match(/(?:create|add|make)\s+(?:a\s+)?(?:task|todo|note|reminder)\s+(?:to\s+|for\s+|about\s+)?(.+)/i);
        return match ? match[1].trim() : null;
    }

    /**
     * Generate contextual follow-up questions
     */
    generateFollowUpQuestions (intent, parameters) {
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