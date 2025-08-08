import { GoogleGenerativeAI } from "@google/generative-ai";
import { Object } from "../../models/lib/object.model.js";
import { saveContent } from "../../utils/helper.service.js";

/**
 * Advanced Object Manager Service
 * Handles complex object finding, creation, and management with AI assistance
 */
export class AdvancedObjectManagerService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.4,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 3072
            }
        });
    }

    /**
     * Intelligent object finder with semantic search
     */
    async findObjects(query, userId, options = {}) {
        try {
            // Parse the search intent
            const searchIntent = await this.parseSearchIntent(query);
            
            // Build smart search query
            const searchQuery = await this.buildSmartSearchQuery(searchIntent, userId, options);
            
            // Execute search
            const results = await this.executeSmartSearch(searchQuery);
            
            // Rank and filter results
            const rankedResults = await this.rankSearchResults(results, searchIntent, query);
            
            return {
                objects: rankedResults,
                searchIntent,
                query: searchQuery,
                totalFound: results.length,
                message: this.generateSearchSummary(rankedResults, searchIntent)
            };

        } catch (error) {
            console.error("Error in findObjects:", error);
            throw error;
        }
    }

    /**
     * Parse search intent from natural language
     */
    async parseSearchIntent(query) {
        const intentPrompt = `
        Analyze this search query: "${query}"
        
        Extract search intent and return JSON:
        {
            "intent": "find_specific|find_by_criteria|find_similar|find_recent|find_overdue",
            "entities": {
                "keywords": ["important", "keywords"],
                "type": "todo|note|meeting|bookmark",
                "status": "null|todo|in progress|done|archive",
                "timeFrame": "today|this_week|last_week|overdue|specific_date",
                "priority": "urgent|high|medium|low",
                "source": "github|linear|gmail|twitter|march",
                "labels": ["tag1", "tag2"],
                "specificDate": "ISO date if mentioned",
                "person": "person name if mentioned",
                "project": "project name if mentioned"
            },
            "searchType": "exact|fuzzy|semantic|hybrid",
            "sortBy": "relevance|date|priority|title",
            "limit": 20,
            "confidence": 0.95
        }
        
        Examples:
        "find my urgent tasks" -> intent: "find_by_criteria", entities: {priority: "urgent", type: "todo"}
        "show me notes about the project" -> intent: "find_similar", entities: {keywords: ["project"], type: "note"}
        "what's overdue?" -> intent: "find_overdue", entities: {timeFrame: "overdue"}
        `;

        try {
            const result = await this.model.generateContent(intentPrompt);
            const response = result.response.text();
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (error) {
            console.error("Error parsing search intent:", error);
            return this.getDefaultSearchIntent(query);
        }
    }

    /**
     * Build smart search query based on intent
     */
    async buildSmartSearchQuery(searchIntent, userId, options) {
        const baseQuery = { user: userId, isDeleted: false };
        
        // Add type filter
        if (searchIntent.entities.type) {
            baseQuery.type = searchIntent.entities.type;
        }

        // Add status filter
        if (searchIntent.entities.status) {
            baseQuery.status = searchIntent.entities.status;
        }

        // Add priority filter
        if (searchIntent.entities.priority) {
            baseQuery.priority = searchIntent.entities.priority;
        }

        // Add source filter
        if (searchIntent.entities.source) {
            baseQuery.source = searchIntent.entities.source;
        }

        // Add time-based filters
        if (searchIntent.entities.timeFrame) {
            const timeFilter = this.buildTimeFilter(searchIntent.entities.timeFrame, searchIntent.entities.specificDate);
            Object.assign(baseQuery, timeFilter);
        }

        // Add text search for keywords
        if (searchIntent.entities.keywords && searchIntent.entities.keywords.length > 0) {
            const keywordRegex = new RegExp(searchIntent.entities.keywords.join('|'), 'i');
            baseQuery.$or = [
                { title: keywordRegex },
                { description: keywordRegex }
            ];
        }

        // Handle overdue items
        if (searchIntent.intent === 'find_overdue') {
            const now = new Date();
            baseQuery['due.date'] = { $lt: now.toISOString() };
            baseQuery.status = { $ne: 'done' };
        }

        return {
            query: baseQuery,
            sort: this.buildSortOptions(searchIntent.sortBy),
            limit: Math.min(searchIntent.limit || 20, 50),
            searchType: searchIntent.searchType,
            populate: ['labels', 'user']
        };
    }

    /**
     * Build time-based filters
     */
    buildTimeFilter(timeFrame, specificDate) {
        const now = new Date();
        let startDate, endDate;

        switch (timeFrame) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;

            case 'this_week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay());
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;

            case 'last_week':
                endDate = new Date(now);
                endDate.setDate(now.getDate() - now.getDay() - 1);
                endDate.setHours(23, 59, 59, 999);
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                break;

            case 'overdue':
                return {
                    'due.date': { $lt: now.toISOString() },
                    status: { $ne: 'done' }
                };

            case 'specific_date':
                if (specificDate) {
                    const date = new Date(specificDate);
                    startDate = new Date(date);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(date);
                    endDate.setHours(23, 59, 59, 999);
                }
                break;

            default:
                return {};
        }

        if (startDate && endDate) {
            return {
                $or: [
                    {
                        'due.date': {
                            $gte: startDate.toISOString(),
                            $lte: endDate.toISOString()
                        }
                    },
                    {
                        createdAt: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                ]
            };
        }

        return {};
    }

    /**
     * Build sort options
     */
    buildSortOptions(sortBy) {
        switch (sortBy) {
            case 'date':
                return { 'due.date': -1, updatedAt: -1 };
            case 'priority':
                return { priority: -1, updatedAt: -1 };
            case 'title':
                return { title: 1 };
            case 'relevance':
            default:
                return { updatedAt: -1, createdAt: -1 };
        }
    }

    /**
     * Execute smart search
     */
    async executeSmartSearch(searchQuery) {
        try {
            let query = Object.find(searchQuery.query);

            if (searchQuery.populate) {
                searchQuery.populate.forEach(field => {
                    query = query.populate(field);
                });
            }

            query = query.sort(searchQuery.sort).limit(searchQuery.limit);

            const results = await query.exec();
            return results;
        } catch (error) {
            console.error("Error executing smart search:", error);
            return [];
        }
    }

    /**
     * Rank search results by relevance
     */
    async rankSearchResults(results, searchIntent, originalQuery) {
        if (results.length === 0) return [];

        try {
            // Calculate relevance scores
            const scoredResults = results.map(obj => {
                let score = 0;

                // Title relevance
                if (searchIntent.entities.keywords) {
                    const titleMatches = searchIntent.entities.keywords.filter(keyword =>
                        obj.title.toLowerCase().includes(keyword.toLowerCase())
                    ).length;
                    score += titleMatches * 10;
                }

                // Description relevance
                if (obj.description && searchIntent.entities.keywords) {
                    const descMatches = searchIntent.entities.keywords.filter(keyword =>
                        obj.description.toString().toLowerCase().includes(keyword.toLowerCase())
                    ).length;
                    score += descMatches * 5;
                }

                // Recency boost
                const daysSinceUpdate = (new Date() - new Date(obj.updatedAt)) / (1000 * 60 * 60 * 24);
                score += Math.max(0, 10 - daysSinceUpdate);

                // Priority boost
                const priorityScores = { urgent: 15, high: 10, medium: 5, low: 2 };
                score += priorityScores[obj.priority] || 0;

                // Status relevance
                if (searchIntent.entities.status && obj.status === searchIntent.entities.status) {
                    score += 8;
                }

                return { ...obj.toObject(), relevanceScore: score };
            });

            // Sort by relevance score
            return scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

        } catch (error) {
            console.error("Error ranking results:", error);
            return results.map(obj => ({ ...obj.toObject(), relevanceScore: 0 }));
        }
    }

    /**
     * Intelligent object creation with context understanding
     */
    async createIntelligentObject(userPrompt, userId, context = {}) {
        try {
            // Parse creation intent
            const creationIntent = await this.parseCreationIntent(userPrompt);
            
            // Generate object data
            const objectData = await this.generateObjectData(creationIntent, userId, context);
            
            // Validate and enhance data
            const enhancedData = await this.enhanceObjectData(objectData, context);
            
            // Create the object
            const createdObject = await this.createObject(enhancedData, userId);
            
            // Generate follow-up suggestions
            const suggestions = await this.generateFollowUpSuggestions(createdObject, creationIntent);
            
            return {
                object: createdObject,
                suggestions,
                creationIntent,
                message: `Created ${createdObject.type}: ${createdObject.title}`,
                success: true
            };

        } catch (error) {
            console.error("Error in createIntelligentObject:", error);
            throw error;
        }
    }

    /**
     * Parse creation intent from user prompt
     */
    async parseCreationIntent(userPrompt) {
        const intentPrompt = `
        Parse this object creation request: "${userPrompt}"
        
        Extract and return JSON:
        {
            "type": "todo|note|meeting|bookmark",
            "title": "extracted title",
            "description": "extracted description",
            "priority": "urgent|high|medium|low",
            "dueDate": "ISO date string if mentioned",
            "dueDateString": "natural language date",
            "tags": ["extracted", "tags"],
            "category": "work|personal|project|idea",
            "actionRequired": true,
            "complexity": "simple|moderate|complex",
            "estimatedTime": "time in minutes if mentioned",
            "dependencies": ["other tasks this depends on"],
            "context": "additional context information",
            "confidence": 0.95
        }
        
        Examples:
        "Create a task to review the proposal by Friday" -> type: "todo", title: "Review the proposal", dueDate: "next Friday"
        "Note about the meeting with John yesterday" -> type: "note", title: "Meeting with John", description: "meeting notes"
        "Remind me to call mom tomorrow" -> type: "todo", title: "Call mom", dueDate: "tomorrow"
        `;

        try {
            const result = await this.model.generateContent(intentPrompt);
            const response = result.response.text();
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (error) {
            console.error("Error parsing creation intent:", error);
            return this.getDefaultCreationIntent(userPrompt);
        }
    }

    /**
     * Generate comprehensive object data
     */
    async generateObjectData(creationIntent, userId, context) {
        const now = new Date();
        
        // Process due date
        let dueDate = null;
        if (creationIntent.dueDate) {
            dueDate = this.processDueDate(creationIntent.dueDate, creationIntent.dueDateString);
        }

        // Generate enhanced description
        const enhancedDescription = await this.generateEnhancedDescription(
            creationIntent.description,
            creationIntent.context,
            context
        );

        return {
            title: creationIntent.title || "New Object",
            description: enhancedDescription,
            type: creationIntent.type || "todo",
            status: "null",
            priority: creationIntent.priority || "medium",
            due: dueDate ? {
                date: dueDate.toISOString(),
                string: creationIntent.dueDateString || dueDate.toLocaleDateString(),
                timezone: "UTC"
            } : {
                date: null,
                string: null,
                timezone: "UTC"
            },
            metadata: {
                category: creationIntent.category || "general",
                complexity: creationIntent.complexity || "simple",
                estimatedTime: creationIntent.estimatedTime || null,
                dependencies: creationIntent.dependencies || [],
                tags: creationIntent.tags || [],
                actionRequired: creationIntent.actionRequired !== false,
                aiGenerated: true,
                originalPrompt: context.originalPrompt || ""
            },
            source: "march",
            user: userId
        };
    }

    /**
     * Process due date from various formats
     */
    processDueDate(dateStr, naturalStr) {
        try {
            // Handle relative dates
            const now = new Date();
            
            if (naturalStr) {
                if (naturalStr.includes("today")) {
                    return now;
                } else if (naturalStr.includes("tomorrow")) {
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow;
                } else if (naturalStr.includes("next week")) {
                    const nextWeek = new Date(now);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    return nextWeek;
                } else if (naturalStr.includes("next month")) {
                    const nextMonth = new Date(now);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    return nextMonth;
                }
            }

            // Try to parse the date string directly
            return new Date(dateStr);
        } catch (error) {
            console.error("Error processing due date:", error);
            return null;
        }
    }

    /**
     * Generate enhanced description with AI
     */
    async generateEnhancedDescription(originalDescription, context, additionalContext) {
        if (!originalDescription && !context) return "";

        const enhancePrompt = `
        Enhance this description with helpful details:
        
        Original: "${originalDescription || ""}"
        Context: "${context || ""}"
        Additional Context: ${JSON.stringify(additionalContext, null, 2)}
        
        Create a clear, actionable description that includes:
        - Key details and requirements
        - Relevant context
        - Next steps if applicable
        
        Keep it concise but comprehensive.`;

        try {
            const result = await this.model.generateContent(enhancePrompt);
            return result.response.text();
        } catch (error) {
            console.error("Error enhancing description:", error);
            return originalDescription || context || "";
        }
    }

    /**
     * Enhance object data with additional intelligence
     */
    async enhanceObjectData(objectData, context) {
        // Add smart defaults based on type
        if (objectData.type === "meeting" && !objectData.metadata.estimatedTime) {
            objectData.metadata.estimatedTime = 60; // Default 1 hour for meetings
        }

        // Add priority based on due date urgency
        if (objectData.due.date && !objectData.priority) {
            const dueDate = new Date(objectData.due.date);
            const now = new Date();
            const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);

            if (daysUntilDue <= 1) {
                objectData.priority = "urgent";
            } else if (daysUntilDue <= 3) {
                objectData.priority = "high";
            } else if (daysUntilDue <= 7) {
                objectData.priority = "medium";
            } else {
                objectData.priority = "low";
            }
        }

        // Add smart tags based on content
        const smartTags = await this.generateSmartTags(objectData.title, objectData.description);
        objectData.metadata.tags = [...(objectData.metadata.tags || []), ...smartTags];

        return objectData;
    }

    /**
     * Generate smart tags based on content
     */
    async generateSmartTags(title, description) {
        const tagPrompt = `
        Generate relevant tags for this content:
        Title: "${title}"
        Description: "${description}"
        
        Return 3-5 relevant tags as JSON array: ["tag1", "tag2", "tag3"]
        
        Focus on:
        - Topic/subject matter
        - Action type
        - Context/category
        - Priority indicators
        `;

        try {
            const result = await this.model.generateContent(tagPrompt);
            const response = result.response.text();
            return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
        } catch (error) {
            console.error("Error generating smart tags:", error);
            return [];
        }
    }

    /**
     * Create object with validation
     */
    async createObject(objectData, userId) {
        try {
            const object = await Object.create(objectData);
            await saveContent(object);
            return object;
        } catch (error) {
            console.error("Error creating object:", error);
            throw error;
        }
    }

    /**
     * Generate follow-up suggestions
     */
    async generateFollowUpSuggestions(createdObject, creationIntent) {
        const suggestions = [];

        // Suggest breaking down complex tasks
        if (creationIntent.complexity === "complex") {
            suggestions.push({
                type: "breakdown",
                message: "This seems like a complex task. Would you like me to help break it down into smaller steps?",
                action: "breakdown_task"
            });
        }

        // Suggest setting reminders
        if (createdObject.due.date) {
            suggestions.push({
                type: "reminder",
                message: "Would you like me to set up reminders for this task?",
                action: "set_reminder"
            });
        }

        // Suggest related objects
        if (creationIntent.dependencies && creationIntent.dependencies.length > 0) {
            suggestions.push({
                type: "dependencies",
                message: "I noticed this task has dependencies. Would you like me to help create or find related tasks?",
                action: "manage_dependencies"
            });
        }

        return suggestions;
    }

    /**
     * Generate search summary
     */
    generateSearchSummary(results, searchIntent) {
        if (results.length === 0) {
            return `No ${searchIntent.entities.type || 'objects'} found matching your criteria. Try broadening your search.`;
        }

        const typeCount = results.reduce((acc, obj) => {
            acc[obj.type] = (acc[obj.type] || 0) + 1;
            return acc;
        }, {});

        const typeStr = Object.entries(typeCount)
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');

        return `Found ${results.length} objects: ${typeStr}`;
    }

    /**
     * Default search intent fallback
     */
    getDefaultSearchIntent(query) {
        return {
            intent: "find_by_criteria",
            entities: {
                keywords: query.split(' ').filter(word => word.length > 2),
                type: null,
                status: null,
                timeFrame: null,
                priority: null,
                source: null,
                labels: [],
                specificDate: null,
                person: null,
                project: null
            },
            searchType: "hybrid",
            sortBy: "relevance",
            limit: 20,
            confidence: 0.5
        };
    }

    /**
     * Default creation intent fallback
     */
    getDefaultCreationIntent(userPrompt) {
        return {
            type: "todo",
            title: userPrompt.substring(0, 100),
            description: "",
            priority: "medium",
            dueDate: null,
            dueDateString: null,
            tags: [],
            category: "general",
            actionRequired: true,
            complexity: "simple",
            estimatedTime: null,
            dependencies: [],
            context: "",
            confidence: 0.3
        };
    }
}
