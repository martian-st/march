const INTENTS = {
    SEARCH: 'search',
    CREATE: 'create',
    // UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    QUERY: 'query',
    PRIORITIZE: 'prioritize',
    CALENDAR: 'calendar', // Added calendar intent to recognize but handle properly
    UNSUPPORTED: 'unsupported', // New intent for explicitly unsupported functionality
    LIST_ALL: 'list_all' // New intent for listing all objects of a specific type
};

// const ENTITY_TYPES = {
//     SOURCE: 'source',
//     TYPE: 'type',
//     STATUS: 'status',
//     TIME_RANGE: 'time',
//     DUE_DATE: 'dueDate',
//     LABEL: 'label',
//     PRIORITY: 'priority'
// };

const TYPE_CHOICES = {
    NOTE: 'note',
    TODO: 'todo',
    MEETING: 'meeting',
    BOOKMARK: 'bookmark'
};

const STATUS_CHOICES = {
    NULL: 'null',
    TODO: 'todo',
    IN_PROGRESS: 'in progress',
    DONE: 'done',
    ARCHIVE: 'archive'
};

const SEARCH_PARAMS = {
    SORT_OPTIONS: {
        PRIORITY: 'priority',
        DUE_DATE: 'dueDate',
        CREATED: 'createdAt',
        UPDATED: 'updatedAt',
        RELEVANCE: 'relevance'
    },
    TIME_RANGES: {
        TODAY: 'today',
        YESTERDAY: 'yesterday',
        THIS_WEEK: 'this_week',
        LAST_WEEK: 'last_week',
        THIS_MONTH: 'this_month',
        NEXT_WEEK: 'next_week',
        NEXT_MONTH: 'next_month',
        OVERDUE: 'overdue'
    },
    PRIORITY_LEVELS: ['urgent', 'high', 'medium', 'low'],
    SOURCES: ['github', 'linear', 'gmail', 'twitter', 'march'],
    SOURCE_ALIASES: {
        'x': 'twitter',
        'tweet': 'twitter',
        'tweets': 'twitter',
        'gh': 'github',
        'git': 'github',
        'mail': 'gmail',
        'email': 'gmail',
        'emails': 'gmail'
    }
};

// Define explicitly unsupported functionalities
const UNSUPPORTED_FEATURES = {
    CALENDAR: {
        keywords: ['calendar', 'schedule', 'appointment', 'meeting time', 'event'],
        message: "I don't currently have calendar functionality. I can help you create tasks or notes about meetings, but I can't access or modify your calendar."
    },
    EMAIL: {
        keywords: ['send email', 'send mail', 'compose email', 'write email'],
        message: "I can't send emails on your behalf. However, I can help you draft content for an email that you can copy and send yourself."
    },
    CALL: {
        keywords: ['make call', 'phone call', 'dial', 'call someone'],
        message: "I don't have the ability to make phone calls. I can help you create a reminder to call someone instead."
    }
};

export class QueryUnderstanding {
    constructor (chatModel) {
        this.chatModel = chatModel;
        this.searchCache = new Map(); // Adds caching for frequent searches
    }

    validateType (type) {
        const normalizedType = type?.toLowerCase();
        return TYPE_CHOICES[normalizedType] ||
            Object.values(TYPE_CHOICES).includes(normalizedType)
            ? normalizedType : TYPE_CHOICES.TODO;
    }

    validateStatus (status) {
        const normalizedStatus = status?.toLowerCase();
        return STATUS_CHOICES[normalizedStatus] ||
            Object.values(STATUS_CHOICES).includes(normalizedStatus)
            ? normalizedStatus : STATUS_CHOICES.NULL;
    }

    validatePriority (priority) {
        if (!priority) return null;
        const normalizedPriority = priority?.toLowerCase();
        return SEARCH_PARAMS.PRIORITY_LEVELS.includes(normalizedPriority) ? normalizedPriority : null;
    }

    validateSource (source) {
        if (!source) return null;
        const normalizedSource = source.toLowerCase();

        // Check for direct source match
        if (SEARCH_PARAMS.SOURCES.includes(normalizedSource)) {
            return normalizedSource;
        }

        // Check for source aliases (e.g., 'x' -> 'twitter')
        if (SEARCH_PARAMS.SOURCE_ALIASES[normalizedSource]) {
            return SEARCH_PARAMS.SOURCE_ALIASES[normalizedSource];
        }

        return null;
    }

    getCacheKey (query, userId) {
        return `${userId}:${query.toLowerCase().trim()}`;
    }

    checkForUnsupportedFeatures (query) {
        query = query.toLowerCase();

        for (const [feature, details] of Object.entries(UNSUPPORTED_FEATURES)) {
            for (const keyword of details.keywords) {
                if (query.includes(keyword.toLowerCase())) {
                    return {
                        feature,
                        message: details.message
                    };
                }
            }
        }

        return null;
    }

    async analyzeQuery (query, userId) {
        console.log("Analyzing query:", query);

        // First check if the query is asking for an unsupported feature
        const unsupportedFeature = this.checkForUnsupportedFeatures(query);
        if (unsupportedFeature) {
            return {
                type: 'unsupported_feature',
                feature: unsupportedFeature.feature,
                message: unsupportedFeature.message,
                metadata: {
                    originalQuery: query
                }
            };
        }
        
        // Check for "list all" type queries
        const listAllPattern = /^(show|give|list|get)\s+(me\s+)?(all|my)\s+(my\s+)?(todos?|tasks?|notes?|objects?|items?)$/i;
        if (listAllPattern.test(query.trim())) {
            const typeMatch = query.match(/(todos?|tasks?|notes?|objects?|items?)/i);
            let type = 'todo';
            
            if (typeMatch) {
                const matchedType = typeMatch[0].toLowerCase();
                if (matchedType.startsWith('note')) {
                    type = 'note';
                } else if (matchedType.startsWith('todo') || matchedType.startsWith('task')) {
                    type = 'todo';
                }
            }
            
            return {
                type: 'search',
                intent: {
                    primary: INTENTS.LIST_ALL,
                    confidence: 0.95,
                    action: `list_all_${type}s`
                },
                parameters: {
                    filters: {
                        type,
                        isDeleted: false,
                        isArchived: false
                    },
                    limit: 100,
                    sortBy: SEARCH_PARAMS.SORT_OPTIONS.DUE_DATE
                },
                metadata: {
                    originalQuery: query,
                    listAll: true
                }
            };
        }
        
        // Check cache first
        const cacheKey = this.getCacheKey(query, userId);
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        try {
            const analysisPrompt = `
            You are an advanced natural language understanding system for a task management app called March. Your job is to analyze user queries and extract structured information about their intent and any relevant entities.
            
            The user query is: "${query}"
            
            Analyze this query with human-like understanding. Don't just look for keywords or patterns - understand the underlying intent and meaning like a human would. Think about what the user is really trying to accomplish.
            
            IMPORTANT: March integrates with multiple external services. When users mention these services, they're likely referring to data from those sources:
            - GitHub: Issues and PRs from GitHub repositories
            - Linear: Tasks and issues from Linear project management
            - Twitter/X: Both "Twitter" and "X" refer to the same source (stored as "twitter")
            - Gmail: Email content from Gmail
            - March: Native tasks created within the March app itself
            
            Return a JSON object (no markdown, no code blocks) with this structure:
            {
              "intent": {
                "primary": "One of: search, create, update, delete, list, query, prioritize, calendar, unsupported",
                "confidence": "Number between 0-1",
                "action": "Specific action being requested"
              },
              "entities": {
                "source": ["detected sources like github, linear, gmail, twitter, march"],
                "type": ["detected types like todo, note, meeting, bookmark"],
                "status": ["detected status like todo, in progress, done, archive"],
                "timeRange": ["detected time references like today, this_week, next_week, overdue"],
                "dueDate": "specific due date if mentioned",
                "labels": ["detected labels"],
                "priority": "detected priority level (urgent, high, medium, low)",
                "workStart": "detected work start time",
                "workEnd": "detected work end time",
                "prioritizationCriteria": ["detected prioritization criteria like due date, importance, effort"],
                "completionStatus": "detected completion status (completed, not completed)",
                "favoriteStatus": "detected favorite status (favorite, not favorite)",
                "archiveStatus": "detected archive status (archived, not archived)",
                "title": "detected title or main subject of the task/note",
                "description": "detected description or content"
              },
              "parameters": {
                "filters": {},
                "sortBy": "One of: priority, dueDate, createdAt, updatedAt, relevance", 
                "limit": null,
                "searchMode": "One of: exact, fuzzy, semantic",
                "format": "One of: default, title_only, summary"
              },
              "context": {
                "isTimeSpecific": boolean,
                "requiresSourceContext": boolean,
                "needsDisambiguation": boolean,
                "isSimpleList": boolean,
                "isDayPlanning": boolean,
                "isPrioritization": boolean,
                "isCalendarRequest": boolean,
                "isUnsupportedFeature": boolean,
                "isUpdateRequest": boolean,
                "isCreationRequest": boolean,
                "isSearchRequest": boolean,
                "isGeneralQuery": boolean
              },
              "unsupportedDetails": {
                "feature": "Name of the unsupported feature being requested",
                "reason": "Why this feature is not supported"
              }
            }
            
            IMPORTANT GUIDELINES:
            1. Be flexible and intelligent in your understanding - don't just match patterns
            2. Understand natural language variations and colloquial expressions
            3. Infer intent even when it's not explicitly stated
            4. Extract all relevant entities even if they're expressed in unusual ways
            5. Handle ambiguity by setting appropriate confidence levels
            6. For search queries, identify all implied filters
            7. For creation queries, extract title and any attributes
            8. For update queries, identify both the target item and what's changing
            9. For prioritization, understand criteria even when expressed informally
            10. Recognize when a query is about an unsupported feature
            
            EXAMPLES OF INTENT RECOGNITION (these are just examples to guide your thinking):
            
            # Search intent examples:
            - "I need to find my important tasks" -> search intent
            - "Where are my notes about the project?" -> search intent
            - "Do I have any meetings tomorrow?" -> search intent
            - "Show me what I've starred" -> search intent
            - "What's due soon?" -> search intent
            - "Show me my GitHub issues" -> search intent, source: ["github"]
            - "What's new on Linear?" -> search intent, source: ["linear"]
            - "Find my X posts" -> search intent, source: ["twitter"]
            - "Show tweets from last week" -> search intent, source: ["twitter"], timeRange: ["last_week"]
            - "Check my Gmail tasks" -> search intent, source: ["gmail"]
            
            # Create intent examples:
            - "I need to remember to call John" -> create intent
            - "Make a note that the meeting is postponed" -> create intent
            - "Add this website to my bookmarks" -> create intent
            - "I should finish the report by Friday" -> create intent
            - "Remind me to buy milk" -> create intent
            
            # Update intent examples:
            - "This task is done" -> update intent
            - "Move this to my important list" -> update intent
            - "Change the deadline to next week" -> update intent
            - "I've completed the first three items" -> update intent
            - "Star this for later" -> update intent
            
            # Prioritization intent examples:
            - "What should I work on now?" -> prioritize intent
            - "Help me organize my day" -> prioritize intent
            - "I'm feeling overwhelmed with tasks" -> prioritize intent
            - "What's most important right now?" -> prioritize intent
            - "Sort my tasks by urgency" -> prioritize intent
            
            # General query examples:
            - "How does this app work?" -> query intent
            - "What can you help me with?" -> query intent
            - "Tell me about task management" -> query intent
            - "How many tasks do I have?" -> query intent
            
            Remember to focus on understanding the true intent behind the query, not just matching patterns from these examples.
            `;

            const result = await this.chatModel.generateContent(analysisPrompt);
            const responseText = result.response.text();

            // Clean the response text by removing markdown code blocks....
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();

            try {
                const analysis = JSON.parse(cleanJson);
                const processedResult = await this.processAnalysis(analysis, query, userId);

                // Cache result for 5 minutes
                this.searchCache.set(cacheKey, processedResult);
                setTimeout(() => this.searchCache.delete(cacheKey), 5 * 60 * 1000);

                return processedResult;
            } catch (parseError) {
                // If still can't parse, try to extract JSON using regex...
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const analysis = JSON.parse(jsonMatch[0]);
                    return this.processAnalysis(analysis, query, userId);
                }
                throw parseError;
            }
        } catch (error) {
            console.error("Error analyzing query:", error);
            throw error;
        }
    }

    async processAnalysis (analysis, originalQuery, userId) {
        console.log("Processing analysis:", analysis);
        const queryContext = {
            intent: analysis.intent,
            originalQuery,
            userId,
            timestamp: new Date()
        };

        switch (analysis.intent.primary) {
        case 'plan':
            return this.handlePlanningIntent(analysis, queryContext);

        case INTENTS.CREATE:
            return this.handleCreationIntent(analysis, queryContext);

        case INTENTS.SEARCH:
        case INTENTS.LIST:
            return this.handleSearchIntent(analysis, queryContext);

        case INTENTS.PRIORITIZE:
            return this.handlePrioritizationIntent(analysis, queryContext);

        case INTENTS.UPDATE:
            return this.handleUpdateIntent(analysis, queryContext);

        case INTENTS.CALENDAR: {
            return this.handleUnsupportedFeature(
                'calendar',
                "I don't currently have calendar functionality. I can help you create tasks or notes about meetings, but I can't access or modify your calendar.",
                queryContext
            );
        }

        case INTENTS.UNSUPPORTED: {
            const feature = analysis.unsupportedDetails?.feature || 'requested functionality';
            const reason = analysis.unsupportedDetails?.reason || "This feature is not currently supported.";
            return this.handleUnsupportedFeature(feature, reason, queryContext);
        }

        case INTENTS.QUERY:
            return this.handleGeneralQuery(analysis, queryContext);

        default:
            return {
                type: 'clarification_needed',
                message: "I'm not sure what you'd like to do. Could you please rephrase your request?",
                suggestedActions: this.getSuggestedActions(analysis)
            };
        }
    }

    async handleSearchIntent (analysis, context) {
        const searchParams = {
            filters: {
                ...this.buildSourceFilters(analysis.entities.source),
                ...this.buildTypeFilters(analysis.entities.type),
                ...this.buildStatusFilters(analysis.entities.status),
                ...this.buildTimeFilters(analysis.entities.timeRange),
                ...this.buildDueDateFilter(analysis.entities.dueDate),
                ...this.buildPriorityFilter(analysis.entities.priority),
                ...this.buildLabelFilters(analysis.entities.labels),
                ...this.buildCompletionStatusFilter(analysis.entities.completionStatus),
                ...this.buildFavoriteStatusFilter(analysis.entities.favoriteStatus),
                ...this.buildArchiveStatusFilter(analysis.entities.archiveStatus)
            },
            userId: context.userId,
            sortBy: analysis.parameters.sortBy || SEARCH_PARAMS.SORT_OPTIONS.RELEVANCE,
            limit: analysis.parameters.limit || 10
            // searchMode: analysis.parameters.searchMode || 'semantic' --> improve the search model
        };

        return {
            type: 'search',
            parameters: searchParams,
            metadata: {
                confidence: analysis.intent.confidence,
                requiresSourceContext: analysis.context.requiresSourceContext,
                originalQuery: context.originalQuery
            }
        };
    }

    async handlePrioritizationIntent (analysis, context) {
        const criteria = analysis.entities.prioritizationCriteria || ['importance', 'urgency', 'due date'];

        const taskFilters = {
            status: { $ne: 'done' },
            userId: context.userId,
            ...this.buildSourceFilters(analysis.entities.source),
            ...this.buildTypeFilters(analysis.entities.type),
            ...this.buildTimeFilters(analysis.entities.timeRange),
            ...this.buildLabelFilters(analysis.entities.labels)
        };

        const prioritizationPrompt = await this.buildPrioritizationPrompt(criteria, context);

        return {
            type: 'prioritization',
            parameters: {
                filters: taskFilters,
                criteria,
                prompt: prioritizationPrompt,
                userId: context.userId
            },
            metadata: {
                confidence: analysis.intent.confidence,
                originalQuery: context.originalQuery
            }
        };
    }

    buildSourceFilters (sources) {
        if (!sources || sources.length === 0) return {};

        // Validate all sources
        const validSources = sources
            .map(source => this.validateSource(source))
            .filter(source => source !== null);

        if (validSources.length === 0) return {};

        // Handle special case for Twitter/X - ensure we're searching for the right source name
        const normalizedSources = validSources.map(source => {
            // If the source is an alias, convert it to the actual source name
            return SEARCH_PARAMS.SOURCE_ALIASES[source] || source;
        });

        return {
            source: { $in: normalizedSources }
        };
    }

    buildTypeFilters (types) {
        if (!types || types.length === 0) return {};

        // Validate all types
        const validTypes = types
            .map(type => this.validateType(type))
            .filter(type => type !== null);

        if (validTypes.length === 0) return {};

        return {
            type: { $in: validTypes }
        };
    }

    buildStatusFilters (statuses) {
        if (!statuses || statuses.length === 0) return {};

        // Validate all statuses
        const validStatuses = statuses
            .map(status => this.validateStatus(status))
            .filter(status => status !== null);

        if (validStatuses.length === 0) return {};

        return {
            status: { $in: validStatuses }
        };
    }

    buildPriorityFilter (priority) {
        if (!priority || priority.length === 0) return {};

        const validPriority = this.validatePriority(priority);
        if (!validPriority) return {};

        return { priority: validPriority };
    }

    // TODO: Need improvment
    buildLabelFilters (labels) {
        if (!labels || labels.length === 0) return {};

        return { labels: { $in: labels } };
    }

    buildCompletionStatusFilter (completionStatus) {
        if (!completionStatus || !completionStatus.length) return {};

        // Handle array of completion statuses
        if (Array.isArray(completionStatus)) {
            // Check if 'completed' is in the array (case insensitive)
            const isCompleted = completionStatus.some(status => 
                typeof status === 'string' && status.toLowerCase() === 'completed'
            );
            return { isCompleted };
        }

        // Handle single string (legacy support)
        if (typeof completionStatus === 'string') {
            const isCompleted = completionStatus.toLowerCase() === 'completed';
            return { isCompleted };
        }

        return {};
    }
    
    buildFavoriteStatusFilter (favoriteStatus) {
        if (!favoriteStatus || !favoriteStatus.length) return {};

        // Handle array of favorite statuses
        if (Array.isArray(favoriteStatus)) {
            // Check if 'favorite' is in the array (case insensitive)
            const isFavorite = favoriteStatus.some(status => 
                typeof status === 'string' && status.toLowerCase() === 'favorite'
            );
            return { isFavorite };
        }

        // Handle single string (legacy support)
        if (typeof favoriteStatus === 'string') {
            const isFavorite = favoriteStatus.toLowerCase() === 'favorite';
            return { isFavorite };
        }

        return {};
    }

    buildArchiveStatusFilter (archiveStatus) {
        if (!archiveStatus || !archiveStatus.length) return {};

        // Handle array of archive statuses
        if (Array.isArray(archiveStatus)) {
            // Check if 'archived' is in the array (case insensitive)
            const isArchived = archiveStatus.some(status => 
                typeof status === 'string' && status.toLowerCase() === 'archived'
            );
            return { isArchived };
        }

        // Handle single string (legacy support)
        if (typeof archiveStatus === 'string') {
            const isArchived = archiveStatus.toLowerCase() === 'archived';
            return { isArchived };
        }

        return {};
    }

    buildDueDateFilter (dueDate) {
        if (!dueDate) return {};

        // Handle specific due date (assuming ISO format)
        try {
            const date = new Date(dueDate);
            if (!isNaN(date.getTime())) {
                const startOfDay = new Date(date.setHours(0, 0, 0, 0));
                const endOfDay = new Date(date.setHours(23, 59, 59, 999));

                return {
                    dueDate: {
                        $gte: startOfDay.toISOString(),
                        $lte: endOfDay.toISOString()
                    }
                };
            }
        } catch (e) {
            console.warn("Invalid due date format:", dueDate);
        }

        return {};
    }

    buildTimeFilters (timeRanges) {
        if (!timeRanges || timeRanges.length === 0) return {};

        const now = new Date();
        const timeFilters = { $or: [] };

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        timeRanges.forEach(range => {
            const filter = {};

            switch (range.toLowerCase()) {
            case SEARCH_PARAMS.TIME_RANGES.TODAY:
                filter.dueDate = {
                    $gte: startOfDay,
                    $lt: endOfDay
                };
                break;
            case SEARCH_PARAMS.TIME_RANGES.YESTERDAY:
                // eslint-disable-next-line no-case-declarations
                const yesterdayStart = new Date(now);
                yesterdayStart.setDate(now.getDate() - 1);
                yesterdayStart.setHours(0, 0, 0, 0);
                // eslint-disable-next-line no-case-declarations
                const yesterdayEnd = new Date(now);
                yesterdayEnd.setDate(now.getDate() - 1);
                yesterdayEnd.setHours(23, 59, 59, 999);

                filter.dueDate = {
                    $gte: yesterdayStart.toISOString(),
                    $lte: yesterdayEnd.toISOString()
                };
                break;

            case SEARCH_PARAMS.TIME_RANGES.THIS_WEEK:
                // eslint-disable-next-line no-case-declarations
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                // eslint-disable-next-line no-case-declarations
                const weekEnd = new Date(now);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);

                filter.dueDate = {
                    $gte: weekStart.toISOString(),
                    $lte: weekEnd.toISOString()
                };
                break;

            case SEARCH_PARAMS.TIME_RANGES.NEXT_WEEK:
                // eslint-disable-next-line no-case-declarations
                const nextWeekStart = new Date(now);
                nextWeekStart.setDate(now.getDate() - now.getDay() + 7);
                nextWeekStart.setHours(0, 0, 0, 0);
                // eslint-disable-next-line no-case-declarations
                const nextWeekEnd = new Date(now);
                nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
                nextWeekEnd.setHours(23, 59, 59, 999);

                filter.dueDate = {
                    $gte: nextWeekStart.toISOString(),
                    $lte: nextWeekEnd.toISOString()
                };
                break;

            case SEARCH_PARAMS.TIME_RANGES.THIS_MONTH:
                // eslint-disable-next-line no-case-declarations
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                // eslint-disable-next-line no-case-declarations
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

                filter.dueDate = {
                    $gte: monthStart.toISOString(),
                    $lte: monthEnd.toISOString()
                };
                break;

            case SEARCH_PARAMS.TIME_RANGES.NEXT_MONTH:
                // eslint-disable-next-line no-case-declarations
                const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                // eslint-disable-next-line no-case-declarations
                const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

                filter.dueDate = {
                    $gte: nextMonthStart.toISOString(),
                    $lte: nextMonthEnd.toISOString()
                };
                break;

            case SEARCH_PARAMS.TIME_RANGES.OVERDUE:
                filter.dueDate = { $lt: now.toISOString() };
                filter.isCompleted = false;
                break;
            }

            if (Object.keys(filter).length > 0) {
                timeFilters.$or.push(filter);
            }
        });

        // If no valid time ranges were found, return empty object
        return timeFilters.$or.length > 0 ? timeFilters : {};
    }

    async buildPrioritizationPrompt (criteria, context) {
        const criteriaStr = criteria.join(', ');

        return `
        Analyze and prioritize the user's tasks based on the following criteria: ${criteriaStr}.
        
        For each task, consider:
        1. Urgency: How soon does this need to be completed?
        2. Importance: How significant is this task to the user's goals?
        3. Effort: How much time/energy will this task require?
        4. Dependencies: Are other tasks dependent on this one?
        
        Original query: "${context.originalQuery}"
        
        Return a prioritized list with brief explanations for why each task is ranked where it is.
        Also include suggested next steps or action items for the top 3 tasks.
        `;
    }

    async handleUnsupportedFeature(feature, message, context) {
        return {
            type: 'unsupported_feature',
            feature,
            message,
            metadata: {
                originalQuery: context.originalQuery
            },
            alternatives: this.getSuggestedAlternatives(feature)
        };
    }

    getSuggestedAlternatives(feature) {
        const alternatives = [];

        switch(feature.toLowerCase()) {
        case 'calendar':
            alternatives.push(
                { action: 'create', description: 'Create a task about your meeting' },
                { action: 'create', description: 'Make a note with meeting details' }
            );
            break;
        case 'email':
            alternatives.push(
                { action: 'create', description: 'Draft content for an email' },
                { action: 'create', description: 'Create a reminder to send an email' }
            );
            break;
        case 'call':
            alternatives.push(
                { action: 'create', description: 'Create a reminder to call someone' },
                { action: 'create', description: 'Make a note about call details' }
            );
            break;
        default:
            alternatives.push(
                { action: 'query', description: 'Ask how I can help you' },
                { action: 'create', description: 'Create a note or task instead' }
            );
        }

        return alternatives;
    }

    async handleUpdateIntent(result, userId) {
        // Extract task identifier from the query result
        const taskIdentifier = await this.extractTaskIdentifier(result, userId);

        if (!taskIdentifier) {
            return {
                success: false,
                message: "I couldn't identify which task you want to update. Please specify the task more clearly."
            };
        }

        // Prepare update data
        const updateData = {};

        // Extract fields to update
        if (result.entities.title) {
            updateData.title = result.entities.title;
        }

        if (result.entities.description) {
            updateData.description = result.entities.description;
        }

        // Handle due date with proper error handling
        if (result.entities.dueDate) {
            try {
                updateData.dueDate = new Date(result.entities.dueDate).toISOString();
            } catch (e) {
                console.warn("Invalid due date format:", result.entities.dueDate);
                // Try to parse natural language dates
                try {
                    const dateText = result.entities.dueDate.toLowerCase();
                    if (dateText.includes('tomorrow')) {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        updateData.dueDate = tomorrow.toISOString();
                    } else if (dateText.includes('next week')) {
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        updateData.dueDate = nextWeek.toISOString();
                    } else if (dateText.includes('friday')) {
                        const targetDay = 5; // 0 = Sunday, 5 = Friday
                        const today = new Date();
                        const daysUntilTarget = (targetDay + 7 - today.getDay()) % 7;
                        const nextOccurrence = new Date();
                        nextOccurrence.setDate(today.getDate() + daysUntilTarget);
                        updateData.dueDate = nextOccurrence.toISOString();
                    }
                    // Add more date parsing logic as needed
                } catch (parseError) {
                    console.warn("Failed to parse natural language date:", parseError);
                }
            }
        }

        if (result.entities.priority) {
            updateData.priority = result.entities.priority;
        }

        if (result.entities.completed !== undefined) {
            updateData.completed = result.entities.completed;
            if (updateData.completed) {
                updateData.completedAt = new Date();
                updateData.status = 'done';
            }
        }

        if (result.entities.favorite !== undefined) {
            updateData.favorite = result.entities.favorite;
        }

        if (result.entities.archived !== undefined) {
            updateData.archived = result.entities.archived;
        }

        if (result.entities.labels && result.entities.labels.length > 0) {
            // In a real implementation, you would need to handle label references properly
            updateData.labels = result.entities.labels;
        }
        
        // Handle time ranges for due date updates
        if (result.entities.timeRange && result.entities.timeRange.length > 0 && !updateData.dueDate) {
            const timeRange = result.entities.timeRange[0];
            const now = new Date();
            
            switch (timeRange) {
                case 'today':
                    updateData.dueDate = now.toISOString();
                    break;
                case 'tomorrow':
                    now.setDate(now.getDate() + 1);
                    updateData.dueDate = now.toISOString();
                    break;
                case 'this_week':
                    // Set due date to end of current week (Sunday)
                    const daysToSunday = 7 - now.getDay();
                    now.setDate(now.getDate() + daysToSunday);
                    updateData.dueDate = now.toISOString();
                    break;
                case 'next_week':
                    // Set due date to middle of next week (Wednesday)
                    now.setDate(now.getDate() + 7 + (3 - now.getDay() + 7) % 7);
                    updateData.dueDate = now.toISOString();
                    break;
            }
        }
        
        // In a real implementation, you would update the task in the database here
        // For now, just return success and the update data
        return {
            success: true,
            message: `Updated task ${taskIdentifier}`,
            data: updateData
        };
    }

    async extractTaskIdentifier(result, userId) {
        // This is a sophisticated method to identify which task the user is referring to
        // It uses multiple strategies:

        // 1. Check for explicit task identifiers
        if (result.entities.taskId) {
            return result.entities.taskId;
        }

        // 2. Check for task titles in quotes
        const titlePattern = /["']([^"']+)["']/;
        const titleMatch = result.query ? result.query.match(titlePattern) : null;
        
        if (titleMatch) {
            // Search for task by title
            return titleMatch[1];
        }

        // 3. Check for contextual references ("this task", "that item")
        if (result.query && (result.query.toLowerCase().includes('this task') || 
            result.query.toLowerCase().includes('that item'))) {
            // In a real implementation, you would retrieve the most recently discussed task
            return 'most_recent_task';
        }

        // 4. Try to infer the task from the query
        // This is the most complex strategy and would involve semantic matching
        if (result.entities.title) {
            return result.entities.title;
        }
        
        // If we can't identify the task, return null
        return null;
    }

    async handleGeneralQuery (analysis, context) {
        // Check for potential unsupported feature requests in the original query
        const unsupportedFeature = this.checkForUnsupportedFeatures(context.originalQuery);
        if (unsupportedFeature) {
            return this.handleUnsupportedFeature(
                unsupportedFeature.feature,
                unsupportedFeature.message,
                context
            );
        }

        const conversationPrompt = `
          Based on user query: "${context.originalQuery}"
          Provide a brief, direct response. Keep it short and natural.
          If the query is a greeting or simple acknowledgment, respond casually and briefly.
          If it's a question, provide a clear, concise answer.
          
          Important: If the user is asking about functionality I don't have (like calendars, emails, phone calls), 
          clearly state that I don't have that capability rather than pretending the user has an empty calendar/inbox/etc.`;

        const result = await this.chatModel.generateContent(conversationPrompt);

        return {
            type: 'conversation',
            response: result.response.text(),
            metadata: {
                confidence: analysis.intent.confidence
            }
        };
    }

    async generateTitle (query, analysis) {
        const titlePrompt = `
        Given this user request: "${query}"
        Context: ${JSON.stringify(analysis.entities)}
        
        Generate a clear, concise title for this ${analysis.entities.type[0] || 'task'}.
        
        Requirements:
        - Keep it meaningful and easy to understand
        - Make it descriptive and specific
        - Don't include words like "TODO" or "BUG" unless they're part of the actual title
        - Return ONLY the title text, nothing else
        
        Example outputs:
        - "Website Navigation Menu Broken"
        - "Update User Profile Page"
        - "Fix Payment Gateway Error"`;

        try {
            const result = await this.chatModel.generateContent(titlePrompt);

            return result.response.text()
                .trim()
                .replace(/^["']|["']$/g, '')
                .replace(/```/g, '')
                .replace(/\n/g, '');
        } catch (error) {
            console.warn("Title generation failed:", error);
            // Fallback to a basic title extraction
            return query
                .replace(/^(create|add|make)\s+(a|an)?\s*/i, '')
                .replace(/\s*(in|on|at|for)\s+(linear|notion|github)\s*/i, '')
                .replace(/\s*(as|like|type)\s+(a|an)?\s*(bug|todo|note|task)\s*/i, '') ||
                'Untitled';
        }
    }

    async handleCreationIntent (analysis, context) {
        // Use the title from entities if available, otherwise generate one
        let title = analysis.entities.title;
        if (!title) {
            title = await this.generateTitle(context.originalQuery, analysis);
        }

        // Create the base object with the title
        const baseObject = {
            title,
            type: analysis.entities.type && analysis.entities.type.length > 0
                ? analysis.entities.type[0].toLowerCase()
                : 'todo',
            source: analysis.entities.source && analysis.entities.source.length > 0
                ? analysis.entities.source[0]
                : 'march',
            status: 'todo',
            isCompleted: false,
            isArchived: false,
            isFavorite: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: context.userId,
            labels: analysis.entities.labels || []
        };

        // Add description based on entities or context
        if (analysis.entities.description) {
            baseObject.description = analysis.entities.description;
        } else if (analysis.entities.labels?.length > 0) {
            baseObject.description = `Issue related to ${analysis.entities.labels.join(', ')}`;
        }

        // Add priority if specified
        if (analysis.entities.priority) {
            baseObject.priority = this.validatePriority(analysis.entities.priority) || 'medium';
        }

        // Add due date if specified
        if (analysis.entities.dueDate) {
            try {
                baseObject.dueDate = new Date(analysis.entities.dueDate).toISOString();
            } catch (e) {
                console.warn("Invalid due date format:", analysis.entities.dueDate);
                // Try to parse natural language dates
                try {
                    const dateText = analysis.entities.dueDate.toLowerCase();
                    if (dateText.includes('tomorrow')) {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        baseObject.dueDate = tomorrow.toISOString();
                    } else if (dateText.includes('next week')) {
                        const nextWeek = new Date();
                        nextWeek.setDate(nextWeek.getDate() + 7);
                        baseObject.dueDate = nextWeek.toISOString();
                    }
                    // Add more date parsing logic as needed
                } catch (parseError) {
                    console.warn("Failed to parse natural language date:", parseError);
                }
            }
        }

        // Handle time ranges
        if (analysis.entities.timeRange && analysis.entities.timeRange.length > 0) {
            const timeRange = analysis.entities.timeRange[0].toLowerCase();
            if (timeRange === 'today' && !baseObject.dueDate) {
                baseObject.dueDate = new Date().toISOString();
            } else if (timeRange === 'this_week' && !baseObject.dueDate) {
                const endOfWeek = new Date();
                const daysToEndOfWeek = 6 - endOfWeek.getDay(); // Assuming Sunday is end of week
                endOfWeek.setDate(endOfWeek.getDate() + daysToEndOfWeek);
                baseObject.dueDate = endOfWeek.toISOString();
            }
            // Add more time range handling as needed
        }

        return {
            type: 'creation',
            data: baseObject,
            source: baseObject.source,
            metadata: {
                confidence: analysis.intent.confidence,
                needsConfirmation: false,
                originalQuery: context.originalQuery
            }
        };
    }

    async handlePlanningIntent (analysis, context) {
        // Extracting planning parameters from the analysis
        const planningParams = {
            workHours: {
                start: this.extractTimeFromText(analysis.entities.workStart) || "9:00",
                end: this.extractTimeFromText(analysis.entities.workEnd) || "17:00"
            },
            focusAreas: analysis.entities.labels || []

        };

        return {
            type: 'day_planning',
            parameters: planningParams,
            userId: context.userId,
            metadata: {
                confidence: analysis.intent.confidence,
                originalQuery: context.originalQuery
            }
        };
    }

    /**
       * Helper method to extract time from text
       */
    extractTimeFromText (timeText) {
        if (!timeText) return null;

        // Simple regex to match common time formats like "9am", "10:30", "3 pm", etc.
        const timeRegex = /(\d{1,2})(?::(\d{2}))?(?:\s*)?(am|pm)?/i;
        const match = timeText.match(timeRegex);

        if (!match) return null;

        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const period = match[3] ? match[3].toLowerCase() : null;

        // Handle 12-hour format conversion
        if (period === 'pm' && hours < 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;

        // Format as HH:MM
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    getSuggestedActions (analysis) {
        return {
            primaryAction: {
                type: analysis.intent.primary,
                confidence: analysis.intent.confidence,
                suggestion: `Did you want to ${analysis.intent.action}?`
            },
            alternatives: this.generateAlternatives(analysis)
        };
    }

    generateAlternatives (analysis) {
        const alternatives = [];

        if (analysis.entities.source && analysis.entities.source.length > 0) {
            alternatives.push({
                action: 'search',
                description: `Search in ${analysis.entities.source.join(', ')}`
            });
        }

        if (analysis.entities.type && analysis.entities.type.length > 0) {
            alternatives.push({
                action: 'create',
                description: `Create a new ${analysis.entities.type[0]}`
            });
        }

        if (analysis.entities.timeRange && analysis.entities.timeRange.length > 0) {
            alternatives.push({
                action: 'search',
                description: `Show items due ${analysis.entities.timeRange[0]}`
            });
        }

        if (analysis.entities.priority) {
            alternatives.push({
                action: 'search',
                description: `Show ${analysis.entities.priority} priority items`
            });
        }

        return alternatives;
    }
}

// const INTENTS = {
//     SEARCH: 'search',
//     CREATE: 'create',
//     // UPDATE: 'update',
//     DELETE: 'delete',
//     LIST: 'list',
//     QUERY: 'query',
//     PRIORITIZE: 'prioritize',
//     CALENDAR: 'calendar',  // Added calendar intent to recognize but handle properly
//     UNSUPPORTED: 'unsupported'  // New intent for explicitly unsupported functionality
// };

// // const ENTITY_TYPES = {
// //     SOURCE: 'source',
// //     TYPE: 'type',
// //     STATUS: 'status',
// //     TIME_RANGE: 'time',
// //     DUE_DATE: 'dueDate',
// //     LABEL: 'label',
// //     PRIORITY: 'priority'
// // };

// const TYPE_CHOICES = {
//     NOTE: 'note',
//     TODO: 'todo',
//     MEETING: 'meeting',
//     BOOKMARK: 'bookmark'
// };

// const STATUS_CHOICES = {
//     NULL: 'null',
//     TODO: 'todo',
//     IN_PROGRESS: 'in progress',
//     DONE: 'done',
//     ARCHIVE: 'archive'
// };

// const SEARCH_PARAMS = {
//     SORT_OPTIONS: {
//         PRIORITY: 'priority',
//         DUE_DATE: 'dueDate',
//         CREATED: 'createdAt',
//         UPDATED: 'updatedAt',
//         RELEVANCE: 'relevance'
//     },
//     TIME_RANGES: {
//         TODAY: 'today',
//         YESTERDAY: 'yesterday',
//         THIS_WEEK: 'this_week',
//         LAST_WEEK: 'last_week',
//         THIS_MONTH: 'this_month',
//         NEXT_WEEK: 'next_week',
//         NEXT_MONTH: 'next_month',
//         OVERDUE: 'overdue'
//     },
//     PRIORITY_LEVELS: ['urgent', 'high', 'medium', 'low'],
//     SOURCES: ['github', 'linear', 'gmail', 'twitter', 'march']
// };

// // Define explicitly unsupported functionalities
// const UNSUPPORTED_FEATURES = {
//     CALENDAR: {
//         keywords: ['calendar', 'schedule', 'appointment', 'meeting time', 'event'],
//         message: "I don't currently have calendar functionality. I can help you create tasks or notes about meetings, but I can't access or modify your calendar."
//     },
//     EMAIL: {
//         keywords: ['send email', 'send mail', 'compose email', 'write email'],
//         message: "I can't send emails on your behalf. However, I can help you draft content for an email that you can copy and send yourself."
//     },
//     CALL: {
//         keywords: ['make call', 'phone call', 'dial', 'call someone'],
//         message: "I don't have the ability to make phone calls. I can help you create a reminder to call someone instead."
//     }
// };

// export class QueryUnderstanding {
//     constructor (chatModel) {
//         this.chatModel = chatModel;
//         this.searchCache = new Map(); // Adds caching for frequent searches
//     }

//     validateType (type) {
//         const normalizedType = type?.toLowerCase();
//         return TYPE_CHOICES[normalizedType] ||
//             Object.values(TYPE_CHOICES).includes(normalizedType)
//             ? normalizedType : TYPE_CHOICES.TODO;
//     }

//     validateStatus (status) {
//         const normalizedStatus = status?.toLowerCase();
//         return STATUS_CHOICES[normalizedStatus] ||
//             Object.values(STATUS_CHOICES).includes(normalizedStatus)
//             ? normalizedStatus : STATUS_CHOICES.NULL;
//     }

//     validatePriority (priority) {
//         if (!priority) return null;
//         const normalizedPriority = priority?.toLowerCase();
//         return SEARCH_PARAMS.PRIORITY_LEVELS.includes(normalizedPriority) ? normalizedPriority : null;
//     }

//     validateSource (source) {
//         if (!source) return null;
//         const normalizedSource = source.toLowerCase();
//         return SEARCH_PARAMS.SOURCES.includes(normalizedSource) ? normalizedSource : null;
//     }

//     getCacheKey (query, userId) {
//         return `${userId}:${query.toLowerCase().trim()}`;
//     }

//     checkForUnsupportedFeatures(query) {
//         query = query.toLowerCase();
        
//         for (const [feature, details] of Object.entries(UNSUPPORTED_FEATURES)) {
//             for (const keyword of details.keywords) {
//                 if (query.includes(keyword.toLowerCase())) {
//                     return {
//                         feature,
//                         message: details.message
//                     };
//                 }
//             }
//         }
        
//         return null;
//     }

//     async analyzeQuery (query, userId) {
//         console.log("Analyzing query:", query);
        
//         // First check if the query is asking for an unsupported feature
//         const unsupportedFeature = this.checkForUnsupportedFeatures(query);
//         if (unsupportedFeature) {
//             return {
//                 type: 'unsupported_feature',
//                 feature: unsupportedFeature.feature,
//                 message: unsupportedFeature.message,
//                 metadata: {
//                     originalQuery: query
//                 }
//             };
//         }
        
//         // Check cache first
//         const cacheKey = this.getCacheKey(query, userId);
//         if (this.searchCache.has(cacheKey)) {
//             return this.searchCache.get(cacheKey);
//         }

//         try {
//             const analysisPrompt = `
//             Analyze this user query: "${query}"
            
//             Return only a JSON object (no markdown, no code blocks) with this structure:
//             {
//               "intent": {
//                 "primary": "One of: search, create, update, delete, list, query, prioritize, calendar, unsupported",
//                 "confidence": "Number between 0-1",
//                 "action": "Specific action being requested"
//               },
//               "entities": {
//                 "source": ["detected sources like github, linear, gmail, twitter, march"],
//                 "type": ["detected types like todo, note, meeting, bookmark"],
//                 "status": ["detected status like todo, in progress, done, archive"],
//                 "timeRange": ["detected time references like today, this_week, next_week, overdue"],
//                 "dueDate": "specific due date if mentioned",
//                 "labels": ["detected labels"],
//                 "priority": "detected priority level (urgent, high, medium, low)",
//                 "workStart": "detected work start time",
//                 "workEnd": "detected work end time",
//                 "prioritizationCriteria": ["detected prioritization criteria like due date, importance, effort"]
//               },
//               "parameters": {
//                 "filters": {},
//                 "sortBy": "One of: priority, dueDate, createdAt, updatedAt, relevance", 
//                 "limit": null,
//                 "searchMode": "One of: exact, fuzzy, semantic",
//                 "format": "One of: default, title_only, summary"
//               },
//               "context": {
//                 "isTimeSpecific": boolean,
//                 "requiresSourceContext": boolean,
//                 "needsDisambiguation": boolean,
//                 "isSimpleList": boolean,
//                 "isDayPlanning": boolean,
//                 "isPrioritization": boolean,
//                 "isCalendarRequest": boolean,
//                 "isUnsupportedFeature": boolean
//               },
//               "unsupportedDetails": {
//                 "feature": "Name of the unsupported feature being requested",
//                 "reason": "Why this feature is not supported"
//               }
//             }

//             Example queries to understand:
//             - "show high priority tasks" -> priority: "high"
//             - "find urgent todos" -> priority: "high", type: ["todo"]
//             - "show tasks due this week" -> timeRange: ["this_week"]
//             - "find overdue items" -> timeRange: ["overdue"]
//             - "show github issues" -> source: ["github"]
//             - "whats new on linear" -> source: ["linear], timeRange: ["today"]
//             - "show high priority tasks from github due this week" -> priority: "high", source: ["github"], timeRange: ["this_week"]
//             - "find overdue items sorted by priority" -> timeRange: ["overdue"], sortBy: "priority"
//             - "show pending pr assigned to me" -> source:["github"]
//             - "show all my tasks" -> intent: "list", type: ["todo"]
//             - "plan my day" -> intent: "plan", context.isDayPlanning: true
//             - "organize my tasks for today" -> intent: "plan", context.isDayPlanning: true
//             - "help me schedule my day with my todos" -> intent: "plan", context.isDayPlanning: true
//             - "create a schedule from 9am to 5pm with my tasks" -> intent: "plan", workStart: "9am", workEnd: "5pm"
//             - "prioritize my tasks" -> intent: "prioritize", context.isPrioritization: true
//             - "organize my todos based on importance" -> intent: "prioritize", prioritizationCriteria: ["importance"]
//             - "sort my tasks by deadline" -> intent: "prioritize", prioritizationCriteria: ["due date"]
//             - "help me sort out my most important work" -> intent: "prioritize", prioritizationCriteria: ["importance"]
//             - "what should I work on first?" -> intent: "prioritize", context.isPrioritization: true
//             - "what's in my calendar?" -> intent: "calendar", context.isCalendarRequest: true
//             - "show my calendar for today" -> intent: "calendar", context.isCalendarRequest: true
//             - "check my email" -> intent: "unsupported", context.isUnsupportedFeature: true
//             `;

//             const result = await this.chatModel.generateContent(analysisPrompt);
//             const responseText = result.response.text();

//             // Clean the response text by removing markdown code blocks....
//             const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();

//             try {
//                 const analysis = JSON.parse(cleanJson);
//                 const processedResult = await this.processAnalysis(analysis, query, userId);

//                 // Cache result for 5 minutes
//                 this.searchCache.set(cacheKey, processedResult);
//                 setTimeout(() => this.searchCache.delete(cacheKey), 5 * 60 * 1000);

//                 return processedResult;
//             } catch (parseError) {
//                 // If still can't parse, try to extract JSON using regex...
//                 const jsonMatch = responseText.match(/\{[\s\S]*\}/);
//                 if (jsonMatch) {
//                     const analysis = JSON.parse(jsonMatch[0]);
//                     return this.processAnalysis(analysis, query, userId);
//                 }
//                 throw parseError;
//             }
//         } catch (error) {
//             console.error("Error analyzing query:", error);
//             throw error;
//         }
//     }

//     async processAnalysis (analysis, originalQuery, userId) {
//         console.log("Processing analysis:", analysis);
//         const queryContext = {
//             intent: analysis.intent,
//             originalQuery,
//             userId,
//             timestamp: new Date()
//         };

//         switch (analysis.intent.primary) {
//         case 'plan':
//             return this.handlePlanningIntent(analysis, queryContext);

//         case INTENTS.CREATE:
//             return this.handleCreationIntent(analysis, queryContext);

//         case INTENTS.SEARCH:
//         case INTENTS.LIST:
//             return this.handleSearchIntent(analysis, queryContext);

//         case INTENTS.PRIORITIZE:
//             return this.handlePrioritizationIntent(analysis, queryContext);

//         case INTENTS.CALENDAR:
//             return this.handleUnsupportedFeature(
//                 'calendar',
//                 "I don't currently have calendar functionality. I can help you create tasks or notes about meetings, but I can't access or modify your calendar.",
//                 queryContext
//             );

//         case INTENTS.UNSUPPORTED:
//             const feature = analysis.unsupportedDetails?.feature || 'requested functionality';
//             const reason = analysis.unsupportedDetails?.reason || "This feature is not currently supported.";
//             return this.handleUnsupportedFeature(feature, reason, queryContext);

//         case INTENTS.QUERY:
//             return this.handleGeneralQuery(analysis, queryContext);

//         default:
//             return {
//                 type: 'clarification_needed',
//                 message: "I'm not sure what you'd like to do. Could you please rephrase your request?",
//                 suggestedActions: this.getSuggestedActions(analysis)
//             };
//         }
//     }

//     async handleUnsupportedFeature(feature, message, context) {
//         return {
//             type: 'unsupported_feature',
//             feature: feature,
//             message: message,
//             metadata: {
//                 originalQuery: context.originalQuery
//             },
//             alternatives: this.getSuggestedAlternatives(feature)
//         };
//     }

//     getSuggestedAlternatives(feature) {
//         const alternatives = [];

//         switch(feature.toLowerCase()) {
//         case 'calendar':
//             alternatives.push(
//                 { action: 'create', description: 'Create a task about your meeting' },
//                 { action: 'create', description: 'Make a note with meeting details' }
//             );
//             break;
//         case 'email':
//             alternatives.push(
//                 { action: 'create', description: 'Draft content for an email' },
//                 { action: 'create', description: 'Create a reminder to send an email' }
//             );
//             break;
//         case 'call':
//             alternatives.push(
//                 { action: 'create', description: 'Create a reminder to call someone' },
//                 { action: 'create', description: 'Make a note about call details' }
//             );
//             break;
//         default:
//             alternatives.push(
//                 { action: 'query', description: 'Ask how I can help you' },
//                 { action: 'create', description: 'Create a note or task instead' }
//             );
//         }

//         return alternatives;
//     }

//     async handleSearchIntent (analysis, context) {
//         const searchParams = {
//             filters: {
//                 ...this.buildSourceFilters(analysis.entities.source),
//                 ...this.buildTypeFilters(analysis.entities.type),
//                 ...this.buildStatusFilters(analysis.entities.status),
//                 ...this.buildTimeFilters(analysis.entities.timeRange),
//                 ...this.buildDueDateFilter(analysis.entities.dueDate),
//                 ...this.buildPriorityFilter(analysis.entities.priority),
//                 ...this.buildLabelFilters(analysis.entities.labels)
//             },
//             userId: context.userId,
//             sortBy: analysis.parameters.sortBy || SEARCH_PARAMS.SORT_OPTIONS.RELEVANCE,
//             limit: analysis.parameters.limit || 10
//             // searchMode: analysis.parameters.searchMode || 'semantic' --> improve the search model
//         };

//         return {
//             type: 'search',
//             parameters: searchParams,
//             metadata: {
//                 confidence: analysis.intent.confidence,
//                 requiresSourceContext: analysis.context.requiresSourceContext,
//                 originalQuery: context.originalQuery
//             }
//         };
//     }

//     async handlePrioritizationIntent (analysis, context) {
//         const criteria = analysis.entities.prioritizationCriteria || ['importance', 'urgency', 'due date'];

//         const taskFilters = {
//             status: { $ne: 'done' },
//             userId: context.userId,
//             ...this.buildSourceFilters(analysis.entities.source),
//             ...this.buildTypeFilters(analysis.entities.type),
//             ...this.buildTimeFilters(analysis.entities.timeRange),
//             ...this.buildLabelFilters(analysis.entities.labels)
//         };

//         const prioritizationPrompt = await this.buildPrioritizationPrompt(criteria, context);

//         return {
//             type: 'prioritization',
//             parameters: {
//                 filters: taskFilters,
//                 criteria,
//                 prompt: prioritizationPrompt,
//                 userId: context.userId
//             },
//             metadata: {
//                 confidence: analysis.intent.confidence,
//                 originalQuery: context.originalQuery
//             }
//         };
//     }

//     buildSourceFilters (sources) {
//         if (!sources || sources.length === 0) return {};

//         // Validate all sources
//         const validSources = sources
//             .map(source => this.validateSource(source))
//             .filter(source => source !== null);

//         if (validSources.length === 0) return {};

//         return {
//             source: { $in: validSources }
//         };
//     }

//     buildTypeFilters (types) {
//         if (!types || types.length === 0) return {};

//         // Validate all types
//         const validTypes = types
//             .map(type => this.validateType(type))
//             .filter(type => type !== null);

//         if (validTypes.length === 0) return {};

//         return {
//             type: { $in: validTypes }
//         };
//     }

//     buildStatusFilters (statuses) {
//         if (!statuses || statuses.length === 0) return {};

//         // Validate all statuses
//         const validStatuses = statuses
//             .map(status => this.validateStatus(status))
//             .filter(status => status !== null);

//         if (validStatuses.length === 0) return {};

//         return {
//             status: { $in: validStatuses }
//         };
//     }

//     buildPriorityFilter (priority) {
//         if (!priority || priority.length === 0) return {};

//         const validPriority = this.validatePriority(priority);
//         if (!validPriority) return {};

//         return { priority: validPriority };
//     }

//     buildLabelFilters (labels) {
//         if (!labels || labels.length === 0) return {};

//         return { labels: { $in: labels } };
//     }

//     buildDueDateFilter (dueDate) {
//         if (!dueDate) return {};

//         // Handle specific due date (assuming ISO format)
//         try {
//             const date = new Date(dueDate);
//             if (!isNaN(date.getTime())) {
//                 const startOfDay = new Date(date.setHours(0, 0, 0, 0));
//                 const endOfDay = new Date(date.setHours(23, 59, 59, 999));

//                 return {
//                     dueDate: {
//                         $gte: startOfDay.toISOString(),
//                         $lte: endOfDay.toISOString()
//                     }
//                 };
//             }
//         } catch (e) {
//             console.warn("Invalid due date format:", dueDate);
//         }

//         return {};
//     }

//     buildTimeFilters (timeRanges) {
//         if (!timeRanges || timeRanges.length === 0) return {};

//         const now = new Date();
//         const timeFilters = { $or: [] };

//         const today = new Date();
//         const startOfDay = new Date(today.setHours(0, 0, 0, 0));
//         const endOfDay = new Date(today.setHours(23, 59, 59, 999));

//         timeRanges.forEach(range => {
//             const filter = {};

//             switch (range.toLowerCase()) {
//             case SEARCH_PARAMS.TIME_RANGES.TODAY:
//                 filter.dueDate = {
//                     $gte: startOfDay,
//                     $lt: endOfDay
//                 };
//                 break;
//             case SEARCH_PARAMS.TIME_RANGES.YESTERDAY:
//                 // eslint-disable-next-line no-case-declarations
//                 const yesterdayStart = new Date(now);
//                 yesterdayStart.setDate(now.getDate() - 1);
//                 yesterdayStart.setHours(0, 0, 0, 0);
//                 // eslint-disable-next-line no-case-declarations
//                 const yesterdayEnd = new Date(now);
//                 yesterdayEnd.setDate(now.getDate() - 1);
//                 yesterdayEnd.setHours(23, 59, 59, 999);

//                 filter.dueDate = {
//                     $gte: yesterdayStart.toISOString(),
//                     $lte: yesterdayEnd.toISOString()
//                 };
//                 break;

//             case SEARCH_PARAMS.TIME_RANGES.THIS_WEEK:
//                 // eslint-disable-next-line no-case-declarations
//                 const weekStart = new Date(now);
//                 weekStart.setDate(now.getDate() - now.getDay());
//                 weekStart.setHours(0, 0, 0, 0);
//                 // eslint-disable-next-line no-case-declarations
//                 const weekEnd = new Date(now);
//                 weekEnd.setDate(weekStart.getDate() + 6);
//                 weekEnd.setHours(23, 59, 59, 999);

//                 filter.dueDate = {
//                     $gte: weekStart.toISOString(),
//                     $lte: weekEnd.toISOString()
//                 };
//                 break;

//             case SEARCH_PARAMS.TIME_RANGES.NEXT_WEEK:
//                 // eslint-disable-next-line no-case-declarations
//                 const nextWeekStart = new Date(now);
//                 nextWeekStart.setDate(now.getDate() - now.getDay() + 7);
//                 nextWeekStart.setHours(0, 0, 0, 0);
//                 // eslint-disable-next-line no-case-declarations
//                 const nextWeekEnd = new Date(now);
//                 nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
//                 nextWeekEnd.setHours(23, 59, 59, 999);

//                 filter.dueDate = {
//                     $gte: nextWeekStart.toISOString(),
//                     $lte: nextWeekEnd.toISOString()
//                 };
//                 break;

//             case SEARCH_PARAMS.TIME_RANGES.THIS_MONTH:
//                 // eslint-disable-next-line no-case-declarations
//                 const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
//                 // eslint-disable-next-line no-case-declarations
//                 const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

//                 filter.dueDate = {
//                     $gte: monthStart.toISOString(),
//                     $lte: monthEnd.toISOString()
//                 };
//                 break;

//             case SEARCH_PARAMS.TIME_RANGES.NEXT_MONTH:
//                 // eslint-disable-next-line no-case-declarations
//                 const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
//                 // eslint-disable-next-line no-case-declarations
//                 const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

//                 filter.dueDate = {
//                     $gte: nextMonthStart.toISOString(),
//                     $lte: nextMonthEnd.toISOString()
//                 };
//                 break;

//             case SEARCH_PARAMS.TIME_RANGES.OVERDUE:
//                 filter.dueDate = { $lt: now.toISOString() };
//                 filter.isCompleted = false;
//                 break;
//             }

//             if (Object.keys(filter).length > 0) {
//                 timeFilters.$or.push(filter);
//             }
//         });

//         // If no valid time ranges were found, return empty object
//         return timeFilters.$or.length > 0 ? timeFilters : {};
//     }

//     async buildPrioritizationPrompt (criteria, context) {
//         const criteriaStr = criteria.join(', ');

//         return `
//         Analyze and prioritize the user's tasks based on the following criteria: ${criteriaStr}.
        
//         For each task, consider:
//         1. Urgency: How soon does this need to be completed?
//         2. Importance: How significant is this task to the user's goals?
//         3. Effort: How much time/energy will this task require?
//         4. Dependencies: Are other tasks dependent on this one?
        
//         Original query: "${context.originalQuery}"
        
//         Return a prioritized list with brief explanations for why each task is ranked where it is.
//         Also include suggested next steps or action items for the top 3 tasks.
//         `;
//     }

//     async handleGeneralQuery (analysis, context) {
//         // Check for potential unsupported feature requests in the original query
//         const unsupportedFeature = this.checkForUnsupportedFeatures(context.originalQuery);
//         if (unsupportedFeature) {
//             return this.handleUnsupportedFeature(
//                 unsupportedFeature.feature,
//                 unsupportedFeature.message,
//                 context
//             );
//         }

//         const conversationPrompt = `
//           Based on user query: "${context.originalQuery}"
//           Provide a brief, direct response. Keep it short and natural.
//           If the query is a greeting or simple acknowledgment, respond casually and briefly.
//           If it's a question, provide a clear, concise answer.
          
//           Important: If the user is asking about functionality I don't have (like calendars, emails, phone calls), 
//           clearly state that I don't have that capability rather than pretending the user has an empty calendar/inbox/etc.`;

//         const result = await this.chatModel.generateContent(conversationPrompt);

//         return {
//             type: 'conversation',
//             response: result.response.text(),
//             metadata: {
//                 confidence: analysis.intent.confidence
//             }
//         };
//     }

//     async generateTitle (query, analysis) {
//         const titlePrompt = `
//         Given this user request: "${query}"
//         Context: ${JSON.stringify(analysis.entities)}
        
//         Generate a clear, concise title for this ${analysis.entities.type[0] || 'task'}.
        
//         Requirements:
//         - Keep it meaningful and easy to understand
//         - Make it descriptive and specific
//         - Don't include words like "TODO" or "BUG" unless they're part of the actual title
//         - Return ONLY the title text, nothing else
        
//         Example outputs:
//         - "Website Navigation Menu Broken"
//         - "Update User Profile Page"
//         - "Fix Payment Gateway Error"`;

//         try {
//             const result = await this.chatModel.generateContent(titlePrompt);

//             return result.response.text()
//                 .trim()
//                 .replace(/^["']|["']$/g, '')
//                 .replace(/```/g, '')
//                 .replace(/\n/g, '');
//         } catch (error) {
//             console.warn("Title generation failed:", error);
//             // Fallback to a basic title extraction
//             return query
//                 .replace(/^(create|add|make)\s+(a|an)?\s*/i, '')
//                 .replace(/\s*(in|on|at|for)\s+(linear|notion|github)\s*/i, '')
//                 .replace(/\s*(as|like|type)\s+(a|an)?\s*(bug|todo|note|task)\s*/i, '') ||
//                 'Untitled';
//         }
//     }

//     async handleCreationIntent (analysis, context) {
//         const title = await this.generateTitle(context.originalQuery, analysis);

//         // Create the base object with the AI-generated title...
//         const baseObject = {
//             title,
//             type: analysis.entities.type[0]?.toLowerCase() || 'todo',
//             source: analysis.entities.source[0] || 'march',
//             status: 'todo',
//             isCompleted: false,
//             isArchived: false,
//             isFavorite: false,
//             createdAt: new Date(),
//             updatedAt: new Date(),
//             userId: context.userId,
//             labels: analysis.entities.labels || []
//         };

//         // Add description based on context
//         if (analysis.entities.labels?.length > 0) {
//             baseObject.description = `Issue related to ${analysis.entities.labels.join(', ')}`;
//         }

//         // Add priority if specified
//         if (analysis.entities.priority) {
//             baseObject.priority = this.validatePriority(analysis.entities.priority) || 'medium';
//         }

//         // Add due date if specified
//         if (analysis.entities.dueDate) {
//             try {
//                 baseObject.dueDate = new Date(analysis.entities.dueDate).toISOString();
//             } catch (e) {
//                 console.warn("Invalid due date format:", analysis.entities.dueDate);
//             }
//         }

//         return {
//             type: 'creation',
//             data: baseObject,
//             source: analysis.entities.source[0] || 'march',
//             metadata: {
//                 confidence: analysis.intent.confidence,
//                 needsConfirmation: false
//             }
//         };
//     }

//     async handlePlanningIntent (analysis, context) {
//         // Extracting planning parameters from the analysis
//         const planningParams = {
//             workHours: {
//                 start: this.extractTimeFromText(analysis.entities.workStart) || "9:00",
//                 end: this.extractTimeFromText(analysis.entities.workEnd) || "17:00"
//             },
//             focusAreas: analysis.entities.labels || []

//         };

//         return {
//             type: 'day_planning',
//             parameters: planningParams,
//             userId: context.userId,
//             metadata: {
//                 confidence: analysis.intent.confidence,
//                 originalQuery: context.originalQuery
//             }
//         };
//     }

//     /**
//        * Helper method to extract time from text
//        */
//     extractTimeFromText (timeText) {
//         if (!timeText) return null;

//         // Simple regex to match common time formats like "9am", "10:30", "3 pm", etc.
//         const timeRegex = /(\d{1,2})(?::(\d{2}))?(?:\s*)?(am|pm)?/i;
//         const match = timeText.match(timeRegex);

//         if (!match) return null;

//         let hours = parseInt(match[1]);
//         const minutes = match[2] ? parseInt(match[2]) : 0;
//         const period = match[3] ? match[3].toLowerCase() : null;

//         // Handle 12-hour format conversion
//         if (period === 'pm' && hours < 12) hours += 12;
//         if (period === 'am' && hours === 12) hours = 0;

//         // Format as HH:MM
//         return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
//     }

//     getSuggestedActions (analysis) {
//         return {
//             primaryAction: {
//                 type: analysis.intent.primary,
//                 confidence: analysis.intent.confidence,
//                 suggestion: `Did you want to ${analysis.intent.action}?`
//             },
//             alternatives: this.generateAlternatives(analysis)
//         };
//     }

//     generateAlternatives (analysis) {
//         const alternatives = [];

//         if (analysis.entities.source && analysis.entities.source.length > 0) {
//             alternatives.push({
//                 action: 'search',
//                 description: `Search in ${analysis.entities.source.join(', ')}`
//             });
//         }

//         if (analysis.entities.type && analysis.entities.type.length > 0) {
//             alternatives.push({
//                 action: 'create',
//                 description: `Create a new ${analysis.entities.type[0]}`
//             });
//         }

//         if (analysis.entities.timeRange && analysis.entities.timeRange.length > 0) {
//             alternatives.push({
//                 action: 'search',
//                 description: `Show items due ${analysis.entities.timeRange[0]}`
//             });
//         }

//         if (analysis.entities.priority) {
//             alternatives.push({
//                 action: 'search',
//                 description: `Show ${analysis.entities.priority} priority items`
//             });
//         }

//         return alternatives;
//     }
// }
