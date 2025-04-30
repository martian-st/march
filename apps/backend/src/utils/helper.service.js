import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Initialize services with API keys
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

export const pineconeIndex = pinecone.index("my-ai-index");

// Model for converting text to vectors
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

export const readTemplateFile = async (name, data) => {
    const content = fs
        .readFileSync(path.resolve("src", "templates", `${name}.hbs`))
        .toString("utf8");
    // const template = handlebars.compile(content, {
    //     // noEscape: true
    // });
    const template = handlebars.compile(content);

    return template(data);
};

// metadata extraction for vector storage
export const extractMetadata = (object) => {
    return {
        objectId: object._id?.toString() || "",
        title: object.title || "",
        description: object.description || "",
        type: object.type || "",
        source: object.source || "",
        status: object.status || "",
        isCompleted: Boolean(object.isCompleted),
        isArchived: Boolean(object.isArchived),
        isFavorite: Boolean(object.isFavorite),
        completedAt: object.completedAt ? new Date(object.completedAt).toISOString() : "",
        dueDate: object.dueDate ? new Date(object.dueDate).toISOString() : "",
        createdAt: object.createdAt ? new Date(object.createdAt).toISOString() : "",
        updatedAt: object.updatedAt ? new Date(object.updatedAt).toISOString() : "",
        cycleStart: object.cycle?.startsAt ? new Date(object.cycle.startsAt).toISOString() : "",
        cycleEnd: object.cycle?.endsAt ? new Date(object.cycle.endsAt).toISOString() : "",
        userId: object.user ? object.user.toString() : "",
        parentId: object.parent ? object.parent.toString() : "",
        labelIds: Array.isArray(object.labels) ? object.labels.map(id => id.toString()) : [],
        arrayIds: Array.isArray(object.arrays) ? object.arrays.map(id => id.toString()) : []
    };
};

// Retry failed operations with exponential backoff
export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries) break;

            const shouldRetry = error.message.includes('503') ||
                              error.message.includes('overloaded') ||
                              error.message.includes('timeout');

            if (!shouldRetry) throw error;

            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
        }
    }
    throw lastError;
}

// Convert text to vector representation for semantic search
export const generateEmbedding = async (text) => {
    return withRetry(async () => {
        try {
            const result = await embeddingModel.embedContent(text);
            const embedding = result.embedding.values;

            if (!embedding?.length) {
                throw new Error("Invalid embedding generated");
            }

            return embedding;
        } catch (error) {
            console.error("Embedding generation failed:", error);
            throw error;
        }
    });
}

export const generateEnhancedEmbedding = async (text, context = {}) => {
    //  a rich contextual string by combining the text with relevant context
    const contextualText = [
        text,
        context.type && `type:${context.type}`,
        context.source && `platform:${context.source}`,
        context.status && `status:${context.status}`,
        context.dueDate && `due:${new Date(context.dueDate).toISOString()}`,
        context.priority && `priority:${context.priority}`,
        context.labels?.length && `labels:${context.labels.join(',')}`,
        context.isCompleted && 'state:completed',
        context.isArchived && 'state:archived',
        context.relatedTasks?.map(task => `related:${task}`).join(' ')
    ]
        .filter(Boolean)
        .join(' ');

    return await generateEmbedding(contextualText);
}

export const saveContent = async (object) => {
    if (!object?._id) {
        throw new Error("Invalid object: missing _id");
    }

    const context = {
        type: object.type,
        source: object.source,
        status: object.status,
        dueDate: object.dueDate,
        priority: object.metadata?.priority || 'medium',
        labels: object.labels?.map(label => label.toString()),
        isCompleted: object.isCompleted,
        completedAt: object.completedAt || 'null',
        isArchived: object.isArchived,
        relatedTasks: object.arrays?.map(id => id.toString())
    };

    const embedding = await generateEnhancedEmbedding(
        `${object.title} ${object.description}`,
        context
    );
    const enhancedMetadata = extractMetadata(object);

    // save to Pinecone with retry
    await withRetry(async () => {
        await pineconeIndex.upsert([{
            id: object._id.toString(),
            values: embedding,
            metadata: enhancedMetadata
        }]);
    });

    return object;
}

export const updateContent = async (object) => {
    if (!object?._id) {
        throw new Error("Invalid object: missing _id");
    }

    const context = {
        type: object.type,
        source: object.source,
        status: object.status,
        dueDate: object.dueDate,
        priority: object.metadata?.priority || 'medium',
        labels: object.labels?.map(label => label.toString()),
        isCompleted: object.isCompleted,
        completedAt: object.completedAt || 'null',
        isArchived: object.isArchived,
        relatedTasks: object.arrays?.map(id => id.toString())
    };

    const embedding = await generateEnhancedEmbedding(
        `${object.title} ${object.description}`,
        context
    );
    const enhancedMetadata = extractMetadata(object);

    await withRetry(async () => {
        await pineconeIndex.upsert([{
            id: object._id.toString(),
            values: embedding,
            metadata: enhancedMetadata
        }]);
    });

    return object;
}

export const deleteContent = async (objectId) => {
    if (!objectId) {
        throw new Error("Invalid objectId: missing objectId");
    }

    await withRetry(async () => {
        await pineconeIndex.deleteOne(objectId.toString());
    });

    return { success: true, id: objectId };
}

const SEARCH_PARAMS = {
    SORT_OPTIONS: {
        PRIORITY: 'priority',
        DUE_DATE: 'dueDate',
        CREATED: 'createdAt',
        UPDATED: 'updatedAt'
    },
    TIME_RANGES: {
        TODAY: 'today',
        YESTERDAY: 'yesterday',
        THIS_WEEK: 'this_week',
        LAST_WEEK: 'last_week',
        THIS_MONTH: 'this_month',
        OVERDUE: 'overdue'
    },
    PRIORITY_LEVELS: ['high', 'medium', 'low']
};

export class SearchHandler {
    constructor (pineconeIndex) {
        this.pineconeIndex = pineconeIndex;
        this.cacheEnabled = true;
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache lifetime
    }

    /**
     * Search content based on query and parameters
     * @param {string} query - User query string
     * @param {string} userId - User ID for filtering
     * @param {Object} parameters - Search parameters from QueryUnderstanding
     * @returns {Promise<Array>} - Processed search results
     */
    async searchContent (query, userId, parameters) {
        // Check cache for identical searches
        const cacheKey = this.getCacheKey(query, userId, parameters);
        if (this.cacheEnabled && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Use filters directly from QueryUnderstanding without rebuilding them
        const rawFilter = { userId, ...parameters.filters };
        const filter = this.preprocessFilters(rawFilter);
        // const filter = { userId, ...parameters.filters };

        try {
            // Generate embedding for semantic search
            const queryEmbedding = await generateEnhancedEmbedding(query, {
                userId,
                ...parameters.filters
            });
            // Perform vector search with metadata filtering...
            const searchResults = await this.pineconeIndex.query({
                vector: queryEmbedding,
                filter,
                topK: parameters.limit || 10,
                includeMetadata: true
            });
            // console.log("seaech result:", searchResults)
            // Apply post-processing and sorting
            // const processedResults = this.processSearchResults(
            //     searchResults,
            //     parameters.sortBy || SEARCH_PARAMS.SORT_OPTIONS.RELEVANCE
            // );
            const processedResults = this.processSearchResults(
                searchResults,
                parameters.sortBy || SEARCH_PARAMS.SORT_OPTIONS.RELEVANCE
            );

            // Cache results
            if (this.cacheEnabled) {
                this.cache.set(cacheKey, processedResults);
                setTimeout(() => this.cache.delete(cacheKey), this.cacheTTL);
            }

            return processedResults;
        } catch (error) {
            console.error("Search error:", error);
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * Generate cache key for query caching
     */
    getCacheKey (query, userId, parameters) {
        const filterString = JSON.stringify(parameters.filters || {});
        const sortBy = parameters.sortBy || 'relevance';
        const limit = parameters.limit || 10;
        return `${userId}:${query.toLowerCase().trim()}:${filterString}:${sortBy}:${limit}`;
    }

    preprocessFilters (filters) {
        const processedFilters = JSON.parse(JSON.stringify(filters));

        // Process date fields in filters
        const processObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    processObject(obj[key]);
                } else if (
                // Check if value looks like a date string...
                    typeof obj[key] === 'string' &&
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj[key])
                ) {
                    obj[key] = new Date(obj[key]).getTime();
                }
            }
        };

        processObject(processedFilters);
        return processedFilters;
    }

    /**
     * Process and sort search results
     */
    processSearchResults (results, sortBy) {
        if (!results.matches || results.matches.length === 0) {
            return [];
        }

        // Extract metadata and scores
        const processedResults = results.matches.map(match => ({
            ...match.metadata,
            score: match.score,
            id: match.id
        }));

        // Apply sorting based on sortBy parameter
        switch (sortBy) {
        case SEARCH_PARAMS.SORT_OPTIONS.PRIORITY:
            return this.sortByPriority(processedResults);

        case SEARCH_PARAMS.SORT_OPTIONS.DUE_DATE:
            return this.sortByDueDate(processedResults);

        case SEARCH_PARAMS.SORT_OPTIONS.CREATED:
            return processedResults.sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

        case SEARCH_PARAMS.SORT_OPTIONS.UPDATED:
            return processedResults.sort((a, b) =>
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );

        case SEARCH_PARAMS.SORT_OPTIONS.RELEVANCE:
        default:
            // Default to relevance (vector similarity score)
            return processedResults.sort((a, b) => b.score - a.score);
        }
    }

    /**
     * Sort results by priority
     */
    sortByPriority (results) {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return results.sort((a, b) => {
            // First sort by priority
            const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            if (priorityDiff !== 0) return priorityDiff;

            // Then by score as tiebreaker
            return b.score - a.score;
        });
    }

    /**
     * Sort results by due date
     */
    sortByDueDate (results) {
        return results.sort((a, b) => {
            // Handle items without due dates
            if (!a.dueDate && !b.dueDate) return b.score - a.score;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;

            // Sort by due date, earliest first
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    }
}

/**
 * Add this class to implement day planning functionality
 */
export class DayPlanner {
    constructor (searchHandler, chatModel) {
        this.searchHandler = searchHandler;
        this.chatModel = chatModel;
    }

    /**
     * Plan the user's day based on their undone tasks
     * @param {string} userId - User ID
     * @param {Object} parameters - Planning parameters (timeBlocks, focus, etc)
     * @returns {Promise<Object>} - Day plan with scheduled tasks
     */
    async planDay (userId, parameters = {}) {
        try {
            // 1. Fetch all undone items for the user
            const undoneItems = await this.fetchUndoneItems(userId);
            if (!undoneItems || undoneItems.length === 0) {
                return {
                    status: "empty",
                    message: "You don't have any pending tasks to plan.",
                    plan: []
                };
            }

            // 2. Generate a day plan using AI
            const plan = await this.generatePlan(undoneItems, parameters);
            return {
                status: "success",
                message: "Here's your plan for today.",
                plan: plan
            };
        } catch (error) {
            console.error("Day planning error:", error);
            return {
                status: "error",
                message: `Failed to create plan: ${error.message}`,
                plan: []
            };
        }
    }

    /**
     * Fetch all undone items for a user
     */
    async fetchUndoneItems (userId) {
        // Use your existing search functionality but with specific filters
        const parameters = {
            filters: {
                status: { $ne: "done" },
                isCompleted: false,
                isArchived: false
            },
            sortBy: "priority",
            limit: 50 // Get a reasonable number of tasks
        };

        return await this.searchHandler.searchContent("", userId, parameters);
    }

    /**
     * Generate a day plan based on undone items and user preferences
     */
    async generatePlan (items, parameters) {
        // Extract important info from each item to reduce token usage
        const simplifiedItems = items.map(item => ({
            id: item.id,
            title: item.title,
            priority: item.priority || "medium",
            dueDate: item.dueDate,
            estimatedTime: item.estimatedTime || "unknown",
            type: item.type,
            labels: item.labels || []
        }));

        // Set up default parameters
        const planningParams = {
            workHours: parameters.workHours || { start: "9:00", end: "17:00" },
            breaks: parameters.breaks || [{ time: "12:00", duration: 60 }],
            focusAreas: parameters.focusAreas || [],
            timeBlocks: parameters.timeBlocks || 30, // minutes per block
            ...parameters
        };

        const prompt = `
        Create a day plan for a user based on their undone tasks:
        ${JSON.stringify(simplifiedItems)}
        
        Planning parameters:
        ${JSON.stringify(planningParams)}
        
        Return a JSON object with this structure:
        {
            "summary": "Brief 1-2 sentence summary of the day plan",
            "timeBlocks": [
            {
                "startTime": "HH:MM",
                "endTime": "HH:MM",
                "taskId": "id of the task (or null for breaks)",
                "title": "Task title or 'Break'",
                "notes": "Optional planning notes"
            }
            ],
            "unscheduled": [
            {
                "id": "task id",
                "title": "Task title",
                "reason": "Reason this couldn't be scheduled"
            }
            ]
        }
        
        Planning guidelines:
        - Prioritize tasks with approaching due dates
        - Prioritize high priority tasks
        - Group similar tasks together when possible
        - Add short breaks between different types of work
        - Suggest specific time blocks based on the task priority and complexity
        - Include all appropriate breaks specified in the parameters
        - If there are too many tasks to schedule, list the most important ones first and put the rest in "unscheduled"
        
        Return ONLY the JSON object, no introduction or explanation.
        `;

        try {
            const result = await this.chatModel.generateContent(prompt);
            const responseText = result.response.text();

            // Clean and parse the JSON response
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("Error generating plan:", error);
            throw new Error("Failed to generate day plan");
        }
    }
}

export class PrioritizationHandler {
    constructor (searchHandler, chatModel) {
        this.searchHandler = searchHandler;
        this.chatModel = chatModel;
    }

    async prioritizeTasks (userId, parameters) {
        try {
            const tasks = await this.searchHandler.searchContent("", userId, parameters.filters);

            if (!tasks || tasks.length === 0) {
                return {
                    status: "empty",
                    message: "No tasks found to prioritize. Try creating some tasks first."
                };
            }

            const prioritizedTasks = await this.generatePrioritization(tasks, parameters.criteria);
            return {
                status: "success",
                prioritizedTasks: prioritizedTasks
            };
        } catch (error) {
            console.error("Error prioritizing tasks:", error);
            return {
                status: "error",
                message: "Failed to prioritize tasks: " + error.message
            };
        }
    }

    async generatePrioritization (tasks, criteria) {
        const taskData = tasks.map(task => ({
            id: task._id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.dueDate,
            status: task.status,
            labels: task.labels
        }));

        // the prompt for the AI to prioritize
        const prompt = `
            I need to prioritize these tasks based on the following criteria: ${criteria.join(', ')}.
            
            Here are the tasks:
            ${JSON.stringify(taskData)}
            
            For each task, consider:
            1. Urgency: How soon does it need to be completed?
            2. Importance: How significant is this task to overall goals?
            3. Effort: How much time/energy will this task require?
            4. Dependencies: Are other tasks dependent on this one?
            
            Return a JSON object with:
            1. An array of prioritizedTasks with the following structure:
               [{
                  "id": "task id",
                  "title": "task title", 
                  "rank": number (1 being highest priority),
                  "rationale": "brief explanation of why this task has this rank"
               }]
            2. A "nextSteps" array with suggestions for the top 3 tasks
            3. A "summary" string that explains the prioritization logic
            
            IMPORTANT: Make sure to include the task "title" property in each prioritizedTask object.
        `;

        const result = await this.chatModel.generateContent(prompt);
        const responseText = result.response.text();

        // Extract the JSON from the response
        try {
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error) {
            console.error("Error parsing prioritization result:", error);
            // Attempt to extract JSON using regex as fallback
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error("Could not parse prioritization result");
        }
    }
}
