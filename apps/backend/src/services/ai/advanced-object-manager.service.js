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
     * Intelligent object finder with semantic search and source awareness
     */
    async findObjects(query, userId, options = {}) {
        try {
            // Parse the search intent
            const searchIntent = await this.parseSearchIntent(query);
            
            // Handle new items queries with source-specific logic
            if (searchIntent.entities.isNewItemsQuery) {
                return await this.findNewItemsBySource(
                    searchIntent.entities.sources || [searchIntent.entities.source],
                    userId,
                    options.timeframe || '24h'
                );
            }
            
            // Build smart search query
            const searchQuery = await this.buildSmartSearchQuery(searchIntent, userId, options);
            
            // Execute search
            const results = await this.executeSmartSearch(searchQuery);
            
            // Rank and filter results with source awareness
            const rankedResults = await this.rankSearchResults(results, searchIntent, query);
            
            return {
                objects: rankedResults,
                searchIntent,
                query: searchQuery,
                totalFound: results.length,
                message: this.generateSearchSummary(rankedResults, searchIntent),
                sourceBreakdown: this.generateSourceBreakdown(rankedResults)
            };

        } catch (error) {
            console.error("Error in findObjects:", error);
            throw error;
        }
    }

    /**
     * Find new items by source for "any new Gmail" type queries
     */
    async findNewItemsBySource(sources, userId, timeframe = '24h') {
        try {
            const validSources = ['march', 'march-ai', 'linear', 'twitter', 'gmail', 'github', 'cal'];
            const sourcesToSearch = Array.isArray(sources) ? sources : [sources];
            const filteredSources = sourcesToSearch.filter(source => validSources.includes(source));
            
            if (filteredSources.length === 0) {
                return {
                    objects: [],
                    totalFound: 0,
                    message: "No valid sources specified for new items search",
                    sourceBreakdown: {}
                };
            }

            // Calculate time threshold based on timeframe
            const timeThreshold = this.calculateTimeThreshold(timeframe);
            
            // Build query for new items
            const query = {
                user: userId,
                isDeleted: false,
                source: { $in: filteredSources },
                createdAt: { $gte: timeThreshold }
            };

            // Execute search with source-aware sorting
            const results = await Object.find(query)
                .populate(['labels', 'user'])
                .sort({ createdAt: -1, source: 1 })
                .limit(50)
                .exec();

            // Generate source breakdown
            const sourceBreakdown = this.generateSourceBreakdown(results);
            
            // Generate summary message
            const message = this.generateNewItemsSummary(results, filteredSources, timeframe);

            return {
                objects: results.map(obj => ({ ...obj.toObject(), relevanceScore: this.calculateFreshnessScore(obj) })),
                totalFound: results.length,
                message,
                sourceBreakdown,
                timeframe,
                searchedSources: filteredSources
            };

        } catch (error) {
            console.error("Error in findNewItemsBySource:", error);
            throw error;
        }
    }

    /**
     * Calculate time threshold for new items queries
     */
    calculateTimeThreshold(timeframe) {
        const now = new Date();
        
        switch (timeframe) {
            case '1h':
                return new Date(now.getTime() - (1 * 60 * 60 * 1000));
            case '6h':
                return new Date(now.getTime() - (6 * 60 * 60 * 1000));
            case '12h':
                return new Date(now.getTime() - (12 * 60 * 60 * 1000));
            case '24h':
            case '1d':
                return new Date(now.getTime() - (24 * 60 * 60 * 1000));
            case '3d':
                return new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
            case '1w':
            case '7d':
                return new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            default:
                return new Date(now.getTime() - (24 * 60 * 60 * 1000)); // Default to 24h
        }
    }

    /**
     * Calculate freshness score for new items
     */
    calculateFreshnessScore(obj) {
        const now = new Date();
        const createdAt = new Date(obj.createdAt);
        const hoursOld = (now - createdAt) / (1000 * 60 * 60);
        
        // Higher score for newer items
        return Math.max(0, 100 - hoursOld);
    }

    /**
     * Generate source breakdown for results
     */
    generateSourceBreakdown(results) {
        return results.reduce((breakdown, obj) => {
            const source = obj.source || 'unknown';
            if (!breakdown[source]) {
                breakdown[source] = {
                    count: 0,
                    items: []
                };
            }
            breakdown[source].count++;
            breakdown[source].items.push({
                id: obj._id,
                title: obj.title,
                type: obj.type,
                createdAt: obj.createdAt
            });
            return breakdown;
        }, {});
    }

    /**
     * Generate summary message for new items
     */
    generateNewItemsSummary(results, sources, timeframe) {
        if (results.length === 0) {
            const sourceStr = sources.length === 1 ? sources[0] : `${sources.length} sources`;
            return `No new items found from ${sourceStr} in the last ${timeframe}.`;
        }

        const sourceBreakdown = this.generateSourceBreakdown(results);
        const sourceDetails = Object.entries(sourceBreakdown)
            .map(([source, data]) => `${data.count} from ${source}`)
            .join(', ');

        return `Found ${results.length} new items (${sourceDetails}) in the last ${timeframe}.`;
    }

    /**
     * Search across multiple platforms with source breakdown
     */
    async searchAcrossPlatforms(query, userId, sources = []) {
        try {
            const integrationSources = sources.length > 0 ? sources : ['linear', 'twitter', 'gmail', 'github', 'cal'];
            const results = {};
            const integrationStatus = await this.checkIntegrationStatus(userId, integrationSources);
            
            // Search each platform individually for better breakdown
            for (const source of integrationSources) {
                try {
                    const sourceQuery = {
                        user: userId,
                        isDeleted: false,
                        source: source
                    };

                    // Add keyword search if provided
                    if (query && query.trim()) {
                        const keywordRegex = new RegExp(query.split(' ').join('|'), 'i');
                        sourceQuery.$or = [
                            { title: keywordRegex },
                            { description: keywordRegex }
                        ];
                    }

                    const sourceResults = await Object.find(sourceQuery)
                        .populate(['labels', 'user'])
                        .sort({ createdAt: -1 })
                        .limit(20)
                        .exec();

                    results[source] = {
                        items: sourceResults.map(obj => ({ 
                            ...obj.toObject(), 
                            relevanceScore: this.calculateSourceRelevance(obj, query),
                            freshness: this.calculateFreshnessScore(obj)
                        })),
                        count: sourceResults.length,
                        status: integrationStatus[source] || 'unknown'
                    };
                } catch (error) {
                    console.error(`Error searching ${source}:`, error);
                    results[source] = {
                        items: [],
                        count: 0,
                        status: 'error',
                        error: error.message
                    };
                }
            }

            // Combine and rank all results
            const allItems = [];
            Object.entries(results).forEach(([source, data]) => {
                data.items.forEach(item => {
                    allItems.push({
                        ...item,
                        sourceInfo: {
                            name: source,
                            status: data.status,
                            priority: this.getSourcePriority(source)
                        }
                    });
                });
            });

            // Sort by combined relevance and freshness
            const rankedItems = allItems.sort((a, b) => {
                const scoreA = (a.relevanceScore || 0) + (a.freshness || 0) + (a.sourceInfo.priority || 0);
                const scoreB = (b.relevanceScore || 0) + (b.freshness || 0) + (b.sourceInfo.priority || 0);
                return scoreB - scoreA;
            });

            return {
                crossPlatformResults: rankedItems,
                sourceBreakdown: results,
                totalFound: allItems.length,
                integrationStatus,
                message: this.generateCrossPlatformSummary(results, query)
            };

        } catch (error) {
            console.error("Error in searchAcrossPlatforms:", error);
            throw error;
        }
    }

    /**
     * Check integration status and freshness
     */
    async checkIntegrationStatus(userId, sources) {
        const status = {};
        
        for (const source of sources) {
            try {
                // Check if we have recent items from this source
                const recentItems = await Object.countDocuments({
                    user: userId,
                    source: source,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
                });

                // Check total items from this source
                const totalItems = await Object.countDocuments({
                    user: userId,
                    source: source,
                    isDeleted: false
                });

                status[source] = {
                    status: totalItems > 0 ? 'connected' : 'no_data',
                    totalItems,
                    recentItems,
                    lastActivity: await this.getLastActivity(userId, source),
                    healthScore: this.calculateIntegrationHealth(totalItems, recentItems)
                };
            } catch (error) {
                console.error(`Error checking status for ${source}:`, error);
                status[source] = {
                    status: 'error',
                    totalItems: 0,
                    recentItems: 0,
                    lastActivity: null,
                    healthScore: 0,
                    error: error.message
                };
            }
        }

        return status;
    }

    /**
     * Get last activity timestamp for a source
     */
    async getLastActivity(userId, source) {
        try {
            const lastItem = await Object.findOne({
                user: userId,
                source: source,
                isDeleted: false
            }).sort({ createdAt: -1 }).select('createdAt');

            return lastItem ? lastItem.createdAt : null;
        } catch (error) {
            console.error(`Error getting last activity for ${source}:`, error);
            return null;
        }
    }

    /**
     * Calculate integration health score
     */
    calculateIntegrationHealth(totalItems, recentItems) {
        if (totalItems === 0) return 0;
        
        const recentRatio = recentItems / Math.max(totalItems, 1);
        const baseScore = Math.min(totalItems / 10, 50); // Up to 50 points for having items
        const freshnessScore = recentRatio * 50; // Up to 50 points for recent activity
        
        return Math.round(baseScore + freshnessScore);
    }

    /**
     * Calculate source relevance score
     */
    calculateSourceRelevance(obj, query) {
        if (!query || !query.trim()) return 50; // Base score for no query
        
        let score = 0;
        const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
        
        // Title matches
        const titleMatches = queryWords.filter(word => 
            obj.title.toLowerCase().includes(word)
        ).length;
        score += titleMatches * 20;
        
        // Description matches
        if (obj.description) {
            const descStr = obj.description.toString().toLowerCase();
            const descMatches = queryWords.filter(word => descStr.includes(word)).length;
            score += descMatches * 10;
        }
        
        return Math.min(score, 100);
    }

    /**
     * Get source priority for ranking
     */
    getSourcePriority(source) {
        const priorities = {
            'march': 10,      // User-created items get highest priority
            'march-ai': 8,    // AI-created items
            'linear': 7,      // Work tasks
            'github': 6,      // Code-related
            'gmail': 5,       // Email items
            'cal': 4,         // Calendar events
            'twitter': 3      // Social media
        };
        
        return priorities[source] || 0;
    }

    /**
     * Generate cross-platform search summary
     */
    generateCrossPlatformSummary(results, query) {
        const totalItems = Object.values(results).reduce((sum, data) => sum + data.count, 0);
        
        if (totalItems === 0) {
            return query 
                ? `No items found matching "${query}" across your connected platforms.`
                : `No items found across your connected platforms.`;
        }

        const sourceDetails = Object.entries(results)
            .filter(([_, data]) => data.count > 0)
            .map(([source, data]) => `${data.count} from ${source}`)
            .join(', ');

        const queryStr = query ? ` matching "${query}"` : '';
        return `Found ${totalItems} items${queryStr} across platforms: ${sourceDetails}`;
    }

    /**
     * Prioritize results by freshness for integration queries
     */
    prioritizeByFreshness(results, sources) {
        // Add freshness boost for integration sources
        return results.map(obj => {
            let freshnessBoost = 0;
            
            if (sources.includes(obj.source)) {
                const hoursOld = (new Date() - new Date(obj.createdAt)) / (1000 * 60 * 60);
                freshnessBoost = Math.max(0, 24 - hoursOld); // Boost for items less than 24 hours old
            }
            
            return {
                ...obj,
                relevanceScore: (obj.relevanceScore || 0) + freshnessBoost,
                freshnessBoost
            };
        }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    /**
     * Parse search intent from natural language with source detection
     */
    async parseSearchIntent(query) {
        const intentPrompt = `
        Analyze this search query: "${query}"
        
        Extract search intent and return JSON:
        {
            "intent": "find_specific|find_by_criteria|find_similar|find_recent|find_overdue|find_by_source|find_new_items",
            "entities": {
                "keywords": ["important", "keywords"],
                "type": "todo|note|meeting|bookmark",
                "status": "null|todo|in progress|done|archive",
                "timeFrame": "today|this_week|last_week|overdue|specific_date|recent|new",
                "priority": "urgent|high|medium|low",
                "source": "github|linear|gmail|twitter|march|march-ai|cal",
                "sources": ["multiple", "sources", "if", "applicable"],
                "labels": ["tag1", "tag2"],
                "specificDate": "ISO date if mentioned",
                "person": "person name if mentioned",
                "project": "project name if mentioned",
                "isNewItemsQuery": false,
                "isCrossPlatformQuery": false,
                "sourceSpecific": false
            },
            "searchType": "exact|fuzzy|semantic|hybrid",
            "sortBy": "relevance|date|priority|title|source|freshness",
            "limit": 20,
            "confidence": 0.95
        }
        
        Source Detection Examples:
        "find my urgent tasks" -> intent: "find_by_criteria", entities: {priority: "urgent", type: "todo"}
        "show me Linear tasks" -> intent: "find_by_source", entities: {source: "linear", type: "todo", sourceSpecific: true}
        "any new Gmail items?" -> intent: "find_new_items", entities: {source: "gmail", timeFrame: "new", isNewItemsQuery: true}
        "what's from GitHub?" -> intent: "find_by_source", entities: {source: "github", sourceSpecific: true}
        "show me Twitter posts" -> intent: "find_by_source", entities: {source: "twitter", sourceSpecific: true}
        "any Calendar events today?" -> intent: "find_by_source", entities: {source: "cal", timeFrame: "today", sourceSpecific: true}
        "what's new from all integrations?" -> intent: "find_new_items", entities: {sources: ["linear", "twitter", "gmail", "github", "cal"], isCrossPlatformQuery: true, timeFrame: "new"}
        "show me AI-created tasks" -> intent: "find_by_source", entities: {source: "march-ai", sourceSpecific: true}
        "what's overdue?" -> intent: "find_overdue", entities: {timeFrame: "overdue"}
        `;

        try {
            const result = await this.model.generateContent(intentPrompt);
            const response = result.response.text();
            const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
            
            // Post-process to ensure source arrays are properly handled
            if (parsed.entities.source && !parsed.entities.sources) {
                parsed.entities.sources = [parsed.entities.source];
            }
            
            return parsed;
        } catch (error) {
            console.error("Error parsing search intent:", error);
            return this.getDefaultSearchIntent(query);
        }
    }

    /**
     * Build smart search query based on intent with source awareness
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

        // Add source filtering with enhanced logic
        const sourceFilter = this.buildSourceFilter(searchIntent.entities);
        if (sourceFilter) {
            Object.assign(baseQuery, sourceFilter);
        }

        // Add time-based filters with source awareness
        if (searchIntent.entities.timeFrame) {
            const timeFilter = this.buildTimeFilter(
                searchIntent.entities.timeFrame, 
                searchIntent.entities.specificDate,
                searchIntent.entities.isNewItemsQuery
            );
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
            sort: this.buildSortOptions(searchIntent.sortBy, searchIntent.entities.sourceSpecific),
            limit: Math.min(searchIntent.limit || 20, 50),
            searchType: searchIntent.searchType,
            populate: ['labels', 'user'],
            sourceContext: {
                isSourceSpecific: searchIntent.entities.sourceSpecific,
                isCrossPlatform: searchIntent.entities.isCrossPlatformQuery,
                sources: searchIntent.entities.sources || []
            }
        };
    }

    /**
     * Build source filter for platform-specific queries
     */
    buildSourceFilter(entities) {
        const validSources = ['march', 'march-ai', 'linear', 'twitter', 'gmail', 'github', 'cal'];
        
        // Single source filter
        if (entities.source && validSources.includes(entities.source)) {
            return { source: entities.source };
        }
        
        // Multiple sources filter
        if (entities.sources && entities.sources.length > 0) {
            const filteredSources = entities.sources.filter(source => validSources.includes(source));
            if (filteredSources.length > 0) {
                return { source: { $in: filteredSources } };
            }
        }
        
        // Cross-platform query (all integration sources)
        if (entities.isCrossPlatformQuery) {
            const integrationSources = ['linear', 'twitter', 'gmail', 'github', 'cal'];
            return { source: { $in: integrationSources } };
        }
        
        return null;
    }

    /**
     * Build time-based filters with support for new items queries
     */
    buildTimeFilter(timeFrame, specificDate, isNewItemsQuery = false) {
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

            case 'recent':
            case 'new':
                // For new items queries, focus on creation time
                startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // Last 24 hours
                endDate = now;
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
            // For new items queries, prioritize creation time
            if (isNewItemsQuery || timeFrame === 'recent' || timeFrame === 'new') {
                return {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                };
            }
            
            // For regular queries, check both due date and creation date
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
     * Build sort options with source awareness
     */
    buildSortOptions(sortBy, isSourceSpecific = false) {
        switch (sortBy) {
            case 'date':
                return { 'due.date': -1, updatedAt: -1 };
            case 'priority':
                return { priority: -1, updatedAt: -1 };
            case 'title':
                return { title: 1 };
            case 'source':
                return { source: 1, updatedAt: -1 };
            case 'freshness':
                return { createdAt: -1, updatedAt: -1 };
            case 'relevance':
            default:
                // For source-specific queries, prioritize freshness
                if (isSourceSpecific) {
                    return { createdAt: -1, updatedAt: -1 };
                }
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
     * Rank search results by relevance with source priority and freshness
     */
    async rankSearchResults(results, searchIntent, originalQuery) {
        if (results.length === 0) return [];

        try {
            // Calculate comprehensive relevance scores
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

                // Source priority boost
                const sourcePriority = this.getSourcePriority(obj.source);
                score += sourcePriority;

                // Freshness boost (prioritize recent items from integrations)
                const hoursOld = (new Date() - new Date(obj.createdAt)) / (1000 * 60 * 60);
                const freshnessScore = Math.max(0, 48 - hoursOld) / 2; // Up to 24 points for very fresh items
                score += freshnessScore;

                // Integration source freshness bonus
                const integrationSources = ['linear', 'twitter', 'gmail', 'github', 'cal'];
                if (integrationSources.includes(obj.source)) {
                    const integrationFreshnessBonus = Math.max(0, 24 - hoursOld); // Extra boost for fresh integration items
                    score += integrationFreshnessBonus * 0.5;
                }

                // Recency boost for updates
                const daysSinceUpdate = (new Date() - new Date(obj.updatedAt)) / (1000 * 60 * 60 * 24);
                score += Math.max(0, 10 - daysSinceUpdate);

                // Priority boost
                const priorityScores = { urgent: 15, high: 10, medium: 5, low: 2 };
                score += priorityScores[obj.priority] || 0;

                // Status relevance
                if (searchIntent.entities.status && obj.status === searchIntent.entities.status) {
                    score += 8;
                }

                // Source-specific query boost
                if (searchIntent.entities.sourceSpecific && obj.source === searchIntent.entities.source) {
                    score += 20; // Significant boost for source-specific queries
                }

                // Cross-platform query handling
                if (searchIntent.entities.isCrossPlatformQuery) {
                    const integrationBonus = integrationSources.includes(obj.source) ? 10 : 0;
                    score += integrationBonus;
                }

                // Favorite items boost
                if (obj.isFavorite) {
                    score += 5;
                }

                return { 
                    ...obj.toObject(), 
                    relevanceScore: Math.round(score),
                    freshnessScore: Math.round(freshnessScore),
                    sourcePriority: sourcePriority
                };
            });

            // Sort by relevance score with secondary sorting
            return scoredResults.sort((a, b) => {
                // Primary sort by relevance score
                if (b.relevanceScore !== a.relevanceScore) {
                    return b.relevanceScore - a.relevanceScore;
                }
                
                // Secondary sort by freshness for ties
                if (b.freshnessScore !== a.freshnessScore) {
                    return b.freshnessScore - a.freshnessScore;
                }
                
                // Tertiary sort by creation date
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

        } catch (error) {
            console.error("Error ranking results:", error);
            return results.map(obj => ({ ...obj.toObject(), relevanceScore: 0 }));
        }
    }

    /**
     * Intelligent object creation with context understanding and source awareness
     */
    async createIntelligentObject(userPrompt, userId, context = {}) {
        try {
            // Parse creation intent
            const creationIntent = await this.parseCreationIntent(userPrompt);
            
            // Determine appropriate source based on creation context
            const sourceInfo = this.determineObjectSource(context, creationIntent);
            
            // Generate object data with source awareness
            const objectData = await this.generateObjectData(creationIntent, userId, context, sourceInfo);
            
            // Validate and enhance data with source-specific patterns
            const enhancedData = await this.enhanceObjectData(objectData, context, sourceInfo);
            
            // Create the object
            const createdObject = await this.createObject(enhancedData, userId);
            
            // Generate follow-up suggestions
            const suggestions = await this.generateFollowUpSuggestions(createdObject, creationIntent);
            
            return {
                object: createdObject,
                suggestions,
                creationIntent,
                sourceInfo,
                message: `Created ${createdObject.type}: ${createdObject.title}`,
                success: true
            };

        } catch (error) {
            console.error("Error in createIntelligentObject:", error);
            throw error;
        }
    }

    /**
     * Determine appropriate source for object creation based on context
     */
    determineObjectSource(context = {}, creationIntent = {}) {
        // Check if this is an AI-generated object (created by AI assistant)
        const isAIGenerated = context.isAIGenerated !== false && (
            context.intentPrediction || 
            context.originalQuery || 
            context.aiAssisted === true
        );

        // Check for platform-specific context or references
        const platformContext = this.detectPlatformContext(context, creationIntent);

        // Determine source value
        let source = "march"; // Default for user-created objects
        
        if (isAIGenerated) {
            source = "march-ai"; // AI-generated objects
        }

        // If there's platform context but object is created in March, keep march/march-ai
        // Platform-specific sources (linear, twitter, gmail, github, cal) are for imported objects
        
        return {
            source,
            isAIGenerated,
            platformContext,
            creationMethod: isAIGenerated ? "ai-assisted" : "user-direct"
        };
    }

    /**
     * Detect platform context from creation intent and context
     */
    detectPlatformContext(context, creationIntent) {
        const platformKeywords = {
            linear: ['linear', 'issue', 'ticket', 'sprint', 'backlog'],
            twitter: ['twitter', 'tweet', 'x.com', 'social media'],
            gmail: ['gmail', 'email', 'message', 'inbox'],
            github: ['github', 'repository', 'repo', 'pull request', 'pr', 'commit'],
            cal: ['calendar', 'meeting', 'appointment', 'schedule', 'event']
        };

        const textToAnalyze = [
            context.originalQuery || '',
            creationIntent.title || '',
            creationIntent.description || '',
            creationIntent.context || ''
        ].join(' ').toLowerCase();

        const detectedPlatforms = [];
        
        for (const [platform, keywords] of Object.entries(platformKeywords)) {
            if (keywords.some(keyword => textToAnalyze.includes(keyword))) {
                detectedPlatforms.push(platform);
            }
        }

        return {
            detectedPlatforms,
            hasExternalReference: detectedPlatforms.length > 0,
            primaryPlatform: detectedPlatforms[0] || null
        };
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
     * Generate comprehensive object data with source awareness
     */
    async generateObjectData(creationIntent, userId, context, sourceInfo) {
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

        // Apply source-specific smart defaults
        const sourceDefaults = this.getSourceSpecificDefaults(sourceInfo, creationIntent);

        return {
            title: creationIntent.title || "New Object",
            description: enhancedDescription,
            type: creationIntent.type || sourceDefaults.type || "todo",
            status: sourceDefaults.status || "null",
            priority: creationIntent.priority || sourceDefaults.priority || "medium",
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
                category: creationIntent.category || sourceDefaults.category || "general",
                complexity: creationIntent.complexity || "simple",
                estimatedTime: creationIntent.estimatedTime || sourceDefaults.estimatedTime || null,
                dependencies: creationIntent.dependencies || [],
                tags: creationIntent.tags || [],
                actionRequired: creationIntent.actionRequired !== false,
                aiGenerated: sourceInfo.isAIGenerated,
                originalPrompt: context.originalPrompt || "",
                creationMethod: sourceInfo.creationMethod,
                platformContext: sourceInfo.platformContext,
                sourceInfo: {
                    source: sourceInfo.source,
                    detectedPlatforms: sourceInfo.platformContext?.detectedPlatforms || [],
                    hasExternalReference: sourceInfo.platformContext?.hasExternalReference || false
                }
            },
            source: sourceInfo.source,
            user: userId
        };
    }

    /**
     * Get source-specific smart defaults
     */
    getSourceSpecificDefaults(sourceInfo, creationIntent) {
        const defaults = {
            type: "todo",
            status: "null",
            priority: "medium",
            category: "general",
            estimatedTime: null
        };

        // AI-generated objects get enhanced defaults
        if (sourceInfo.isAIGenerated) {
            defaults.priority = "medium"; // AI tends to create medium priority by default
            defaults.category = "ai-assisted";
        }

        // Platform-specific defaults based on detected context
        if (sourceInfo.platformContext?.hasExternalReference) {
            const primaryPlatform = sourceInfo.platformContext.primaryPlatform;
            
            switch (primaryPlatform) {
                case 'linear':
                    defaults.type = "todo";
                    defaults.category = "development";
                    defaults.priority = "high";
                    defaults.estimatedTime = 120; // 2 hours default for dev tasks
                    break;
                    
                case 'github':
                    defaults.type = "todo";
                    defaults.category = "development";
                    defaults.priority = "medium";
                    defaults.estimatedTime = 90; // 1.5 hours for code reviews/issues
                    break;
                    
                case 'gmail':
                    defaults.type = "todo";
                    defaults.category = "communication";
                    defaults.priority = "medium";
                    defaults.estimatedTime = 30; // 30 minutes for email follow-ups
                    break;
                    
                case 'cal':
                    defaults.type = "meeting";
                    defaults.category = "meeting";
                    defaults.priority = "high";
                    defaults.estimatedTime = 60; // 1 hour default for meetings
                    break;
                    
                case 'twitter':
                    defaults.type = "note";
                    defaults.category = "social";
                    defaults.priority = "low";
                    defaults.estimatedTime = 15; // 15 minutes for social media tasks
                    break;
            }
        }

        // Override with creation intent specifics
        if (creationIntent.type === "meeting") {
            defaults.estimatedTime = 60;
            defaults.category = "meeting";
        } else if (creationIntent.type === "note") {
            defaults.estimatedTime = 15;
            defaults.priority = "low";
        }

        return defaults;
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
     * Enhance object data with additional intelligence and source-specific patterns
     */
    async enhanceObjectData(objectData, context, sourceInfo) {
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

        // Add smart tags based on content and source
        const smartTags = await this.generateSmartTags(objectData.title, objectData.description, sourceInfo);
        objectData.metadata.tags = [...(objectData.metadata.tags || []), ...smartTags];

        // Apply source-specific enhancements
        await this.applySourceSpecificEnhancements(objectData, sourceInfo, context);

        return objectData;
    }

    /**
     * Generate smart tags based on content and source context
     */
    async generateSmartTags(title, description, sourceInfo) {
        const sourceContext = sourceInfo?.platformContext?.detectedPlatforms?.join(', ') || '';
        const creationMethod = sourceInfo?.creationMethod || 'unknown';
        
        const tagPrompt = `
        Generate relevant tags for this content:
        Title: "${title}"
        Description: "${description}"
        Source: "${sourceInfo?.source || 'march'}"
        Creation Method: "${creationMethod}"
        Platform Context: "${sourceContext}"
        
        Return 3-5 relevant tags as JSON array: ["tag1", "tag2", "tag3"]
        
        Focus on:
        - Topic/subject matter
        - Action type
        - Context/category
        - Priority indicators
        - Source/platform context (if relevant)
        - Creation method context
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
     * Apply source-specific enhancements to object data
     */
    async applySourceSpecificEnhancements(objectData, sourceInfo, context) {
        // AI-generated object enhancements
        if (sourceInfo?.isAIGenerated) {
            // Add AI-specific metadata
            objectData.metadata.aiConfidence = context.intentPrediction?.confidence || 0.8;
            objectData.metadata.aiModel = "gemini-pro"; // or whatever model is being used
            objectData.metadata.enhancementApplied = true;
            
            // Add AI-generated tag
            if (!objectData.metadata.tags.includes('ai-generated')) {
                objectData.metadata.tags.push('ai-generated');
            }
        }

        // Platform-specific enhancements
        if (sourceInfo?.platformContext?.hasExternalReference) {
            const primaryPlatform = sourceInfo.platformContext.primaryPlatform;
            
            // Add platform-specific metadata and tags
            objectData.metadata.externalPlatform = primaryPlatform;
            objectData.metadata.platformContext = sourceInfo.platformContext;
            
            // Add platform-specific tags
            if (primaryPlatform && !objectData.metadata.tags.includes(primaryPlatform)) {
                objectData.metadata.tags.push(primaryPlatform);
            }
            
            // Platform-specific enhancements
            switch (primaryPlatform) {
                case 'linear':
                    objectData.metadata.workflowType = 'development';
                    objectData.metadata.suggestedLabels = ['development', 'task', 'linear'];
                    break;
                    
                case 'github':
                    objectData.metadata.workflowType = 'development';
                    objectData.metadata.suggestedLabels = ['development', 'code', 'github'];
                    break;
                    
                case 'gmail':
                    objectData.metadata.workflowType = 'communication';
                    objectData.metadata.suggestedLabels = ['email', 'communication', 'follow-up'];
                    break;
                    
                case 'cal':
                    objectData.metadata.workflowType = 'meeting';
                    objectData.metadata.suggestedLabels = ['meeting', 'calendar', 'appointment'];
                    // Ensure meeting type objects have proper time allocation
                    if (objectData.type === 'meeting' && !objectData.metadata.estimatedTime) {
                        objectData.metadata.estimatedTime = 60;
                    }
                    break;
                    
                case 'twitter':
                    objectData.metadata.workflowType = 'social';
                    objectData.metadata.suggestedLabels = ['social-media', 'twitter', 'content'];
                    break;
            }
        }

        // User-created object enhancements (source: "march")
        if (sourceInfo?.source === 'march' && !sourceInfo?.isAIGenerated) {
            objectData.metadata.userCreated = true;
            objectData.metadata.directInput = true;
        }

        // Add integration context linking
        await this.addIntegrationContextLinking(objectData, sourceInfo, context);

        return objectData;
    }

    /**
     * Add integration context linking for platform-referenced content
     */
    async addIntegrationContextLinking(objectData, sourceInfo, context) {
        if (!sourceInfo?.platformContext?.hasExternalReference) {
            return;
        }

        const detectedPlatforms = sourceInfo.platformContext.detectedPlatforms || [];
        const originalQuery = context.originalQuery || '';
        
        // Extract potential external references from the query
        const externalReferences = this.extractExternalReferences(originalQuery, detectedPlatforms);
        
        if (externalReferences.length > 0) {
            objectData.metadata.externalReferences = externalReferences;
            objectData.metadata.linkedPlatforms = detectedPlatforms;
            
            // Add reference information to description if not already present
            const referenceInfo = this.formatReferenceInfo(externalReferences);
            if (referenceInfo && !objectData.description.includes(referenceInfo)) {
                // Ensure description is an array (as per schema)
                if (typeof objectData.description === 'string') {
                    objectData.description = [{ type: 'text', content: objectData.description }];
                } else if (!Array.isArray(objectData.description)) {
                    objectData.description = [];
                }
                
                // Add reference info as a separate block
                objectData.description.push({
                    type: 'reference',
                    content: referenceInfo,
                    platforms: detectedPlatforms
                });
            }
        }
    }

    /**
     * Extract external references from query text
     */
    extractExternalReferences(query, platforms) {
        const references = [];
        const lowerQuery = query.toLowerCase();
        
        // URL patterns
        const urlPattern = /(https?:\/\/[^\s]+)/gi;
        const urls = query.match(urlPattern) || [];
        
        urls.forEach(url => {
            let platform = 'web';
            if (url.includes('linear.app')) platform = 'linear';
            else if (url.includes('github.com')) platform = 'github';
            else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
            else if (url.includes('gmail.com') || url.includes('mail.google.com')) platform = 'gmail';
            else if (url.includes('calendar.google.com')) platform = 'cal';
            
            references.push({
                type: 'url',
                value: url,
                platform: platform
            });
        });
        
        // Platform-specific ID patterns
        platforms.forEach(platform => {
            switch (platform) {
                case 'linear':
                    // Linear issue patterns like "LIN-123" or "issue 123"
                    const linearMatches = query.match(/(?:LIN-\d+|issue\s+#?\d+)/gi) || [];
                    linearMatches.forEach(match => {
                        references.push({
                            type: 'issue_id',
                            value: match,
                            platform: 'linear'
                        });
                    });
                    break;
                    
                case 'github':
                    // GitHub issue/PR patterns like "#123" or "PR 456"
                    const githubMatches = query.match(/(?:#\d+|PR\s+#?\d+|pull\s+request\s+#?\d+)/gi) || [];
                    githubMatches.forEach(match => {
                        references.push({
                            type: 'issue_pr_id',
                            value: match,
                            platform: 'github'
                        });
                    });
                    break;
                    
                case 'gmail':
                    // Email subject or thread references
                    const emailMatches = query.match(/(?:email|message|thread)(?:\s+about|\s+regarding)?\s+["']([^"']+)["']/gi) || [];
                    emailMatches.forEach(match => {
                        references.push({
                            type: 'email_subject',
                            value: match,
                            platform: 'gmail'
                        });
                    });
                    break;
            }
        });
        
        return references;
    }

    /**
     * Format reference information for display
     */
    formatReferenceInfo(references) {
        if (references.length === 0) return '';
        
        const referenceTexts = references.map(ref => {
            switch (ref.type) {
                case 'url':
                    return `🔗 ${ref.platform.toUpperCase()}: ${ref.value}`;
                case 'issue_id':
                    return `🎯 Linear Issue: ${ref.value}`;
                case 'issue_pr_id':
                    return `🔧 GitHub: ${ref.value}`;
                case 'email_subject':
                    return `📧 Email: ${ref.value}`;
                default:
                    return `🔗 ${ref.platform}: ${ref.value}`;
            }
        });
        
        return `\n\nReferences:\n${referenceTexts.join('\n')}`;
    }

    /**
     * Create object with validation and source-specific checks
     */
    async createObject(objectData, userId) {
        try {
            // Apply source-specific validation
            const validatedData = await this.validateObjectData(objectData);
            
            const object = await Object.create(validatedData);
            await saveContent(object);
            return object;
        } catch (error) {
            console.error("Error creating object:", error);
            throw error;
        }
    }

    /**
     * Validate object data with source-specific rules
     */
    async validateObjectData(objectData) {
        const validatedData = { ...objectData };
        
        // Ensure required fields are present
        if (!validatedData.title || validatedData.title.trim() === '') {
            validatedData.title = 'Untitled Object';
        }
        
        // Validate source field
        const validSources = ['march', 'march-ai', 'linear', 'twitter', 'gmail', 'github', 'cal'];
        if (!validSources.includes(validatedData.source)) {
            console.warn(`Invalid source: ${validatedData.source}, defaulting to 'march'`);
            validatedData.source = 'march';
        }
        
        // Source-specific validation
        switch (validatedData.source) {
            case 'march-ai':
                // AI-generated objects should have AI metadata
                if (!validatedData.metadata.aiGenerated) {
                    validatedData.metadata.aiGenerated = true;
                }
                if (!validatedData.metadata.creationMethod) {
                    validatedData.metadata.creationMethod = 'ai-assisted';
                }
                break;
                
            case 'march':
                // User-created objects should not have AI metadata
                if (validatedData.metadata.aiGenerated === undefined) {
                    validatedData.metadata.aiGenerated = false;
                }
                if (!validatedData.metadata.creationMethod) {
                    validatedData.metadata.creationMethod = 'user-direct';
                }
                break;
                
            case 'linear':
            case 'github':
                // Development platform objects should have development category
                if (!validatedData.metadata.category || validatedData.metadata.category === 'general') {
                    validatedData.metadata.category = 'development';
                }
                break;
                
            case 'gmail':
                // Email objects should have communication category
                if (!validatedData.metadata.category || validatedData.metadata.category === 'general') {
                    validatedData.metadata.category = 'communication';
                }
                break;
                
            case 'cal':
                // Calendar objects should be meetings with proper time allocation
                if (validatedData.type !== 'meeting') {
                    validatedData.type = 'meeting';
                }
                if (!validatedData.metadata.estimatedTime) {
                    validatedData.metadata.estimatedTime = 60;
                }
                if (!validatedData.metadata.category || validatedData.metadata.category === 'general') {
                    validatedData.metadata.category = 'meeting';
                }
                break;
                
            case 'twitter':
                // Social media objects should have social category
                if (!validatedData.metadata.category || validatedData.metadata.category === 'general') {
                    validatedData.metadata.category = 'social';
                }
                break;
        }
        
        // Ensure description is in correct format (array)
        if (typeof validatedData.description === 'string') {
            validatedData.description = [{ type: 'text', content: validatedData.description }];
        } else if (!Array.isArray(validatedData.description)) {
            validatedData.description = [];
        }
        
        // Validate due date format
        if (validatedData.due && validatedData.due.date) {
            try {
                const dueDate = new Date(validatedData.due.date);
                if (isNaN(dueDate.getTime())) {
                    console.warn('Invalid due date, removing due date');
                    validatedData.due = {
                        date: null,
                        string: null,
                        timezone: "UTC"
                    };
                }
            } catch (error) {
                console.warn('Error validating due date:', error);
                validatedData.due = {
                    date: null,
                    string: null,
                    timezone: "UTC"
                };
            }
        }
        
        // Ensure metadata exists
        if (!validatedData.metadata) {
            validatedData.metadata = {};
        }
        
        // Ensure tags array exists
        if (!validatedData.metadata.tags) {
            validatedData.metadata.tags = [];
        }
        
        // Remove duplicate tags
        validatedData.metadata.tags = [...new Set(validatedData.metadata.tags)];
        
        return validatedData;
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
     * Generate search summary with source breakdown and integration-specific formatting
     */
    generateSearchSummary(results, searchIntent) {
        if (results.length === 0) {
            const sourceHint = searchIntent.entities.sourceSpecific 
                ? ` from ${searchIntent.entities.source}` : '';
            return `No ${searchIntent.entities.type || 'objects'} found${sourceHint} matching your criteria. Try broadening your search.`;
        }

        // Generate type breakdown
        const typeCount = results.reduce((acc, obj) => {
            acc[obj.type] = (acc[obj.type] || 0) + 1;
            return acc;
        }, {});

        // Generate source breakdown
        const sourceCount = results.reduce((acc, obj) => {
            acc[obj.source] = (acc[obj.source] || 0) + 1;
            return acc;
        }, {});

        // Build summary based on query type
        let summary = `Found ${results.length} objects`;

        // Add type breakdown
        const typeStr = Object.entries(typeCount)
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');
        summary += `: ${typeStr}`;

        // Add source breakdown for multi-source results or cross-platform queries
        const sourceEntries = Object.entries(sourceCount);
        if (sourceEntries.length > 1 || searchIntent.entities.isCrossPlatformQuery) {
            const sourceStr = sourceEntries
                .sort(([, a], [, b]) => b - a) // Sort by count descending
                .map(([source, count]) => `${count} from ${this.getSourceDisplayName(source)}`)
                .join(', ');
            summary += ` (${sourceStr})`;
        } else if (searchIntent.entities.sourceSpecific) {
            // For single-source queries, mention the source
            const sourceName = this.getSourceDisplayName(searchIntent.entities.source);
            summary += ` from ${sourceName}`;
        }

        // Add freshness information for integration queries
        const integrationSources = ['linear', 'twitter', 'gmail', 'github', 'cal'];
        const integrationItems = results.filter(obj => integrationSources.includes(obj.source));
        if (integrationItems.length > 0) {
            const recentItems = integrationItems.filter(obj => {
                const hoursOld = (new Date() - new Date(obj.createdAt)) / (1000 * 60 * 60);
                return hoursOld <= 24;
            });
            
            if (recentItems.length > 0) {
                summary += `. ${recentItems.length} recent integration items`;
            }
        }

        // Add priority information if relevant
        const highPriorityItems = results.filter(obj => 
            obj.priority === 'urgent' || obj.priority === 'high'
        );
        if (highPriorityItems.length > 0) {
            summary += `. ${highPriorityItems.length} high priority`;
        }

        return summary + '.';
    }

    /**
     * Get display name for source
     */
    getSourceDisplayName(source) {
        const displayNames = {
            'march': 'March',
            'march-ai': 'AI Assistant',
            'linear': 'Linear',
            'twitter': 'Twitter/X',
            'gmail': 'Gmail',
            'github': 'GitHub',
            'cal': 'Calendar'
        };
        
        return displayNames[source] || source;
    }

    /**
     * Generate integration-specific result formatting
     */
    formatIntegrationResults(results, source) {
        const sourceDisplayName = this.getSourceDisplayName(source);
        
        if (results.length === 0) {
            return {
                formatted: [],
                summary: `No items found from ${sourceDisplayName}`,
                metadata: {
                    source,
                    count: 0,
                    lastSync: null
                }
            };
        }

        // Add source-specific formatting
        const formatted = results.map(obj => ({
            ...obj,
            sourceFormatted: {
                displayName: sourceDisplayName,
                icon: this.getSourceIcon(source),
                color: this.getSourceColor(source),
                freshness: this.calculateFreshnessScore(obj),
                isRecent: this.isRecentItem(obj)
            }
        }));

        // Calculate metadata
        const recentCount = formatted.filter(obj => obj.sourceFormatted.isRecent).length;
        const lastSync = formatted.length > 0 
            ? Math.max(...formatted.map(obj => new Date(obj.createdAt))) : null;

        return {
            formatted,
            summary: `${results.length} items from ${sourceDisplayName}${recentCount > 0 ? ` (${recentCount} recent)` : ''}`,
            metadata: {
                source,
                count: results.length,
                recentCount,
                lastSync: lastSync ? new Date(lastSync) : null
            }
        };
    }

    /**
     * Get source icon for UI display
     */
    getSourceIcon(source) {
        const icons = {
            'march': '📝',
            'march-ai': '🤖',
            'linear': '📋',
            'twitter': '🐦',
            'gmail': '📧',
            'github': '🐙',
            'cal': '📅'
        };
        
        return icons[source] || '📄';
    }

    /**
     * Get source color for UI display
     */
    getSourceColor(source) {
        const colors = {
            'march': '#3b82f6',      // Blue
            'march-ai': '#8b5cf6',   // Purple
            'linear': '#5e6ad2',     // Linear purple
            'twitter': '#1da1f2',    // Twitter blue
            'gmail': '#ea4335',      // Gmail red
            'github': '#24292e',     // GitHub dark
            'cal': '#34a853'         // Google green
        };
        
        return colors[source] || '#6b7280';
    }

    /**
     * Check if item is recent (within 24 hours)
     */
    isRecentItem(obj) {
        const hoursOld = (new Date() - new Date(obj.createdAt)) / (1000 * 60 * 60);
        return hoursOld <= 24;
    }

    /**
     * Default search intent fallback with source awareness
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
                sources: [],
                labels: [],
                specificDate: null,
                person: null,
                project: null,
                isNewItemsQuery: false,
                isCrossPlatformQuery: false,
                sourceSpecific: false
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
