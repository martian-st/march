import { Object } from "../../models/lib/object.model.js";
import { User } from "../../models/core/user.model.js";

/**
 * Context Manager Service
 * Enhanced context management with integration awareness
 * Tracks source-specific interactions and cross-platform references
 */
export class ContextManager {
    constructor() {
        // In-memory context storage for active sessions
        this.userContexts = new Map();
        this.sourceHealthCache = new Map();
        this.crossPlatformReferences = new Map();
        
        // Source types supported by the system
        this.supportedSources = [
            'march',      // User-created in March app
            'march-ai',   // AI-generated objects
            'linear',     // Linear integration
            'twitter',    // Twitter/X integration
            'gmail',      // Gmail integration
            'github',     // GitHub integration
            'cal'         // Calendar integrations
        ];
    }

    /**
     * Update context to track source-specific interactions
     * Requirements: 5.1, 5.2, 5.3
     */
    async updateContext(userId, interaction) {
        try {
            const context = this.getUserContext(userId);
            
            // Extract source information from interaction
            const sourceInfo = this.extractSourceInfo(interaction);
            
            // Update conversation history with source context
            context.conversationHistory.push({
                timestamp: new Date().toISOString(),
                query: interaction.query,
                intent: interaction.intent,
                response: interaction.response,
                success: interaction.success,
                confidence: interaction.confidence,
                source: sourceInfo.source,
                sourceContext: sourceInfo.context,
                crossPlatformRefs: sourceInfo.crossPlatformRefs
            });

            // Keep only last 20 interactions
            if (context.conversationHistory.length > 20) {
                context.conversationHistory.shift();
            }

            // Update current session with source awareness
            context.currentSession.lastActivity = new Date().toISOString();
            context.currentSession.activeSource = sourceInfo.source;
            context.currentSession.sourcesUsed.add(sourceInfo.source);
            
            // Track source-specific activity
            if (!context.sourceActivity[sourceInfo.source]) {
                context.sourceActivity[sourceInfo.source] = {
                    interactions: 0,
                    lastUsed: null,
                    successRate: 0,
                    commonOperations: {}
                };
            }
            
            const sourceActivity = context.sourceActivity[sourceInfo.source];
            sourceActivity.interactions++;
            sourceActivity.lastUsed = new Date().toISOString();
            
            // Update success rate
            const recentSourceInteractions = context.conversationHistory
                .filter(h => h.source === sourceInfo.source)
                .slice(-10);
            const successCount = recentSourceInteractions.filter(h => h.success).length;
            sourceActivity.successRate = recentSourceInteractions.length > 0 
                ? successCount / recentSourceInteractions.length 
                : 0;
            
            // Track common operations for this source
            if (interaction.intent) {
                sourceActivity.commonOperations[interaction.intent] = 
                    (sourceActivity.commonOperations[interaction.intent] || 0) + 1;
            }

            // Update working objects with source context
            if (interaction.result && interaction.result.objects) {
                this.updateWorkingObjects(context, interaction.result.objects, sourceInfo.source);
            }

            // Store updated context
            this.userContexts.set(userId, context);
            
            return context;
        } catch (error) {
            console.error('Error updating context:', error);
            throw error;
        }
    } 
   /**
     * Enhance resolveReferences to handle platform-specific references
     * Requirements: 5.1, 5.2, 5.3
     */
    async resolveReferences(query, userId, context) {
        try {
            const userContext = context || this.getUserContext(userId);
            const resolvedQuery = query;
            const references = [];
            const sourceContext = {};
            let confidence = 1.0;

            // Detect platform-specific references
            const platformRefs = this.detectPlatformReferences(query);
            
            // Resolve "that task", "the meeting", etc. with source awareness
            const contextualRefs = await this.resolveContextualReferences(
                query, 
                userContext, 
                platformRefs
            );

            // Resolve cross-platform references
            const crossPlatformRefs = await this.resolveCrossPlatformReferences(
                query, 
                userId, 
                userContext
            );

            // Combine all references
            references.push(...contextualRefs.references);
            references.push(...crossPlatformRefs.references);

            // Build source context
            for (const source of this.supportedSources) {
                if (userContext.sourceActivity[source]) {
                    sourceContext[source] = {
                        lastUsed: userContext.sourceActivity[source].lastUsed,
                        successRate: userContext.sourceActivity[source].successRate,
                        commonOperations: userContext.sourceActivity[source].commonOperations,
                        isActive: this.isSourceActive(userContext, source)
                    };
                }
            }

            // Calculate confidence based on reference resolution success
            if (references.length > 0) {
                const resolvedCount = references.filter(ref => ref.resolved).length;
                confidence = resolvedCount / references.length;
            }

            return {
                resolvedQuery,
                references,
                sourceContext,
                confidence,
                platformReferences: platformRefs,
                crossPlatformReferences: crossPlatformRefs.references
            };
        } catch (error) {
            console.error('Error resolving references:', error);
            return {
                resolvedQuery: query,
                references: [],
                sourceContext: {},
                confidence: 0.5
            };
        }
    }

    /**
     * Get source-specific context for integration-specific queries
     * Requirements: 5.1, 5.2, 5.3
     */
    async getSourceContext(userId, source) {
        try {
            if (!this.supportedSources.includes(source)) {
                throw new Error(`Unsupported source: ${source}`);
            }

            const userContext = this.getUserContext(userId);
            const sourceActivity = userContext.sourceActivity[source] || {};

            // Get recent objects from this source
            const recentObjects = await Object.find({
                user: userId,
                source: source,
                isDeleted: false
            })
            .sort({ updatedAt: -1 })
            .limit(10)
            .lean();

            // Get integration health status
            const integrationHealth = await this.getIntegrationHealth(userId, source);

            // Get recent activity summary
            const recentActivity = this.getRecentSourceActivity(userContext, source);

            return {
                source,
                objects: recentObjects,
                activity: sourceActivity,
                health: integrationHealth,
                recentActivity,
                lastSync: integrationHealth.lastSync,
                isConnected: integrationHealth.isConnected,
                errorCount: integrationHealth.errorCount
            };
        } catch (error) {
            console.error(`Error getting source context for ${source}:`, error);
            return {
                source,
                objects: [],
                activity: {},
                health: { isConnected: false, status: 'error' },
                recentActivity: [],
                lastSync: null,
                isConnected: false,
                errorCount: 0
            };
        }
    }

    /**
     * Get user context with initialization
     */
    getUserContext(userId) {
        if (!this.userContexts.has(userId)) {
            this.userContexts.set(userId, this.initializeUserContext());
        }
        return this.userContexts.get(userId);
    }

    /**
     * Initialize user context structure
     */
    initializeUserContext() {
        return {
            conversationHistory: [],
            currentSession: {
                startTime: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                currentFocus: null,
                workingObjects: [],
                recentQueries: [],
                contextReferences: new Map(),
                activeSource: 'march',
                sourcesUsed: new Set(['march'])
            },
            sourceActivity: {},
            preferences: {
                defaultSource: 'march',
                preferredSources: ['march'],
                sourceNotifications: true
            },
            crossPlatformLinks: new Map()
        };
    } 
   /**
     * Extract source information from interaction
     */
    extractSourceInfo(interaction) {
        const sourceInfo = {
            source: 'march', // default
            context: {},
            crossPlatformRefs: []
        };

        // Extract source from query
        if (interaction.query) {
            const query = interaction.query.toLowerCase();
            
            // Detect source mentions in query
            for (const source of this.supportedSources) {
                if (query.includes(source) || 
                    (source === 'twitter' && query.includes('x')) ||
                    (source === 'cal' && (query.includes('calendar') || query.includes('meeting')))) {
                    sourceInfo.source = source;
                    break;
                }
            }
        }

        // Extract source from result objects
        if (interaction.result && interaction.result.objects) {
            const sources = [...new Set(interaction.result.objects.map(obj => obj.source))];
            if (sources.length === 1) {
                sourceInfo.source = sources[0];
            } else if (sources.length > 1) {
                sourceInfo.crossPlatformRefs = sources;
            }
        }

        // Extract source from intent parameters
        if (interaction.parameters && interaction.parameters.source_filter) {
            sourceInfo.source = interaction.parameters.source_filter;
        }

        return sourceInfo;
    }

    /**
     * Detect platform-specific references in query
     */
    detectPlatformReferences(query) {
        const platformRefs = [];
        const queryLower = query.toLowerCase();

        // Direct platform mentions
        const platformPatterns = {
            linear: ['linear', 'linear task', 'linear issue'],
            gmail: ['gmail', 'email', 'mail'],
            github: ['github', 'git', 'repository', 'repo', 'issue', 'pr', 'pull request'],
            twitter: ['twitter', 'x', 'tweet'],
            cal: ['calendar', 'meeting', 'appointment', 'event'],
            'march-ai': ['ai created', 'ai generated', 'ai task'],
            march: ['march', 'my task', 'my item']
        };

        for (const [source, patterns] of Object.entries(platformPatterns)) {
            for (const pattern of patterns) {
                if (queryLower.includes(pattern)) {
                    platformRefs.push({
                        source,
                        pattern,
                        confidence: 0.8
                    });
                }
            }
        }

        return platformRefs;
    }

    /**
     * Resolve contextual references like "that task", "the meeting"
     */
    async resolveContextualReferences(query, userContext, platformRefs) {
        const references = [];
        const queryLower = query.toLowerCase();

        // Reference patterns
        const refPatterns = [
            'that task', 'that item', 'that meeting', 'that note',
            'the task', 'the item', 'the meeting', 'the note',
            'this task', 'this item', 'this meeting', 'this note',
            'my last task', 'my recent task', 'latest item'
        ];

        for (const pattern of refPatterns) {
            if (queryLower.includes(pattern)) {
                // Find the most recent relevant object
                const recentObjects = userContext.currentSession.workingObjects
                    .slice(-5) // Last 5 objects
                    .reverse(); // Most recent first

                // Filter by platform if specified
                let filteredObjects = recentObjects;
                if (platformRefs.length > 0) {
                    const targetSources = platformRefs.map(ref => ref.source);
                    filteredObjects = recentObjects.filter(obj => 
                        targetSources.includes(obj.source)
                    );
                }

                if (filteredObjects.length > 0) {
                    references.push({
                        pattern,
                        resolved: true,
                        object: filteredObjects[0],
                        confidence: 0.9,
                        source: filteredObjects[0].source
                    });
                } else {
                    references.push({
                        pattern,
                        resolved: false,
                        confidence: 0.3
                    });
                }
            }
        }

        return { references };
    }

    /**
     * Resolve cross-platform references
     */
    async resolveCrossPlatformReferences(query, userId, userContext) {
        const references = [];
        const queryLower = query.toLowerCase();

        // Cross-platform patterns
        const crossPlatformPatterns = [
            'all my tasks', 'everything', 'all items', 'across platforms',
            'from all sources', 'everywhere'
        ];

        for (const pattern of crossPlatformPatterns) {
            if (queryLower.includes(pattern)) {
                // Get objects from multiple sources
                const sources = Array.from(userContext.currentSession.sourcesUsed);
                const crossPlatformObjects = [];

                for (const source of sources) {
                    const sourceObjects = userContext.currentSession.workingObjects
                        .filter(obj => obj.source === source)
                        .slice(-3); // Last 3 from each source
                    crossPlatformObjects.push(...sourceObjects);
                }

                references.push({
                    pattern,
                    resolved: true,
                    objects: crossPlatformObjects,
                    sources: sources,
                    confidence: 0.8,
                    type: 'cross-platform'
                });
            }
        }

        return { references };
    }

    /**
     * Update working objects with source context
     */
    updateWorkingObjects(context, objects, source) {
        for (const obj of objects) {
            const workingObject = {
                id: obj._id || obj.id,
                title: obj.title,
                type: obj.type,
                source: obj.source || source,
                timestamp: new Date().toISOString(),
                status: obj.status
            };

            context.currentSession.workingObjects.push(workingObject);
        }

        // Keep only last 15 working objects
        if (context.currentSession.workingObjects.length > 15) {
            context.currentSession.workingObjects = 
                context.currentSession.workingObjects.slice(-15);
        }
    }    /**

     * Check if source is currently active
     */
    isSourceActive(userContext, source) {
        const sourceActivity = userContext.sourceActivity[source];
        if (!sourceActivity || !sourceActivity.lastUsed) {
            return false;
        }

        const lastUsed = new Date(sourceActivity.lastUsed);
        const now = new Date();
        const hoursSinceLastUse = (now - lastUsed) / (1000 * 60 * 60);

        // Consider source active if used within last 24 hours
        return hoursSinceLastUse < 24;
    }

    /**
     * Get integration health status
     */
    async getIntegrationHealth(userId, source) {
        try {
            // Check cache first
            const cacheKey = `${userId}-${source}`;
            if (this.sourceHealthCache.has(cacheKey)) {
                const cached = this.sourceHealthCache.get(cacheKey);
                const cacheAge = Date.now() - cached.timestamp;
                if (cacheAge < 5 * 60 * 1000) { // 5 minutes cache
                    return cached.health;
                }
            }

            let health = {
                isConnected: false,
                status: 'unknown',
                lastSync: null,
                errorCount: 0,
                lastError: null
            };

            // For march and march-ai, always connected
            if (source === 'march' || source === 'march-ai') {
                health = {
                    isConnected: true,
                    status: 'healthy',
                    lastSync: new Date().toISOString(),
                    errorCount: 0,
                    lastError: null
                };
            } else {
                // Check integration status from user model
                const user = await User.findById(userId).lean();
                if (user && user.integration && user.integration[source]) {
                    const integration = user.integration[source];
                    health = {
                        isConnected: integration.connected || false,
                        status: integration.connected ? 'healthy' : 'disconnected',
                        lastSync: integration.lastSync || null,
                        errorCount: integration.errorCount || 0,
                        lastError: integration.lastError || null
                    };
                }
            }

            // Cache the result
            this.sourceHealthCache.set(cacheKey, {
                health,
                timestamp: Date.now()
            });

            return health;
        } catch (error) {
            console.error(`Error getting integration health for ${source}:`, error);
            return {
                isConnected: false,
                status: 'error',
                lastSync: null,
                errorCount: 1,
                lastError: error.message
            };
        }
    }

    /**
     * Get recent activity for a specific source
     */
    getRecentSourceActivity(userContext, source, timeframe = '24h') {
        const now = new Date();
        let cutoffTime;

        switch (timeframe) {
            case '1h':
                cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '24h':
                cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        return userContext.conversationHistory
            .filter(interaction => {
                const interactionTime = new Date(interaction.timestamp);
                return interaction.source === source && interactionTime >= cutoffTime;
            })
            .map(interaction => ({
                timestamp: interaction.timestamp,
                query: interaction.query,
                intent: interaction.intent,
                success: interaction.success,
                confidence: interaction.confidence
            }));
    }

    /**
     * Clear user context (for logout or reset)
     */
    clearUserContext(userId) {
        this.userContexts.delete(userId);
        
        // Clear related caches
        for (const [key] of this.sourceHealthCache.entries()) {
            if (key.startsWith(`${userId}-`)) {
                this.sourceHealthCache.delete(key);
            }
        }
        
        this.crossPlatformReferences.delete(userId);
    }

    /**
     * Get context summary for debugging
     */
    getContextSummary(userId) {
        const context = this.getUserContext(userId);
        
        return {
            conversationCount: context.conversationHistory.length,
            workingObjectsCount: context.currentSession.workingObjects.length,
            sourcesUsed: Array.from(context.currentSession.sourcesUsed),
            activeSource: context.currentSession.activeSource,
            sourceActivitySummary: Object.keys(context.sourceActivity).reduce((acc, source) => {
                acc[source] = {
                    interactions: context.sourceActivity[source].interactions,
                    successRate: context.sourceActivity[source].successRate,
                    lastUsed: context.sourceActivity[source].lastUsed
                };
                return acc;
            }, {})
        };
    }
}    /**

     * Track cross-platform activity for comprehensive insights
     * Requirements: 5.4, 5.5
     */
    async trackCrossPlatformActivity(userId, sources = [], timeframe = '24h') {
        try {
            const userContext = this.getUserContext(userId);
            const targetSources = sources.length > 0 ? sources : this.supportedSources;
            
            const activitySummary = {
                timeframe,
                totalInteractions: 0,
                sourceBreakdown: {},
                trends: {},
                crossPlatformPatterns: [],
                integrationHealth: {},
                recommendations: []
            };

            // Analyze activity for each source
            for (const source of targetSources) {
                const sourceActivity = await this.analyzeSourceActivity(
                    userId, 
                    source, 
                    timeframe, 
                    userContext
                );
                
                activitySummary.sourceBreakdown[source] = sourceActivity;
                activitySummary.totalInteractions += sourceActivity.interactions;
                
                // Get integration health
                activitySummary.integrationHealth[source] = 
                    await this.getIntegrationHealth(userId, source);
            }

            // Identify cross-platform patterns
            activitySummary.crossPlatformPatterns = 
                this.identifyCrossPlatformPatterns(userContext, targetSources, timeframe);

            // Calculate trends
            activitySummary.trends = this.calculateActivityTrends(userContext, timeframe);

            // Generate recommendations
            activitySummary.recommendations = 
                this.generateActivityRecommendations(activitySummary);

            return activitySummary;
        } catch (error) {
            console.error('Error tracking cross-platform activity:', error);
            return {
                timeframe,
                totalInteractions: 0,
                sourceBreakdown: {},
                trends: {},
                crossPlatformPatterns: [],
                integrationHealth: {},
                recommendations: [],
                error: error.message
            };
        }
    }

    /**
     * Analyze activity for a specific source
     */
    async analyzeSourceActivity(userId, source, timeframe, userContext) {
        const recentActivity = this.getRecentSourceActivity(userContext, source, timeframe);
        const sourceData = userContext.sourceActivity[source] || {};

        // Get object counts from database
        const objectCounts = await this.getSourceObjectCounts(userId, source, timeframe);

        return {
            source,
            interactions: recentActivity.length,
            successRate: this.calculateSuccessRate(recentActivity),
            commonOperations: sourceData.commonOperations || {},
            objectsCreated: objectCounts.created,
            objectsUpdated: objectCounts.updated,
            objectsSearched: objectCounts.searched,
            lastActivity: sourceData.lastUsed,
            averageConfidence: this.calculateAverageConfidence(recentActivity),
            errorPatterns: this.identifyErrorPatterns(recentActivity)
        };
    }

    /**
     * Get object counts for a source within timeframe
     */
    async getSourceObjectCounts(userId, source, timeframe) {
        try {
            const cutoffTime = this.getTimeframeCutoff(timeframe);
            
            const [created, updated] = await Promise.all([
                Object.countDocuments({
                    user: userId,
                    source: source,
                    createdAt: { $gte: cutoffTime },
                    isDeleted: false
                }),
                Object.countDocuments({
                    user: userId,
                    source: source,
                    updatedAt: { $gte: cutoffTime },
                    createdAt: { $lt: cutoffTime }, // Only count updates, not creates
                    isDeleted: false
                })
            ]);

            return {
                created,
                updated,
                searched: 0 // Will be calculated from interaction history
            };
        } catch (error) {
            console.error(`Error getting object counts for ${source}:`, error);
            return { created: 0, updated: 0, searched: 0 };
        }
    }

    /**
     * Identify cross-platform usage patterns
     */
    identifyCrossPlatformPatterns(userContext, sources, timeframe) {
        const patterns = [];
        const recentHistory = this.getRecentHistory(userContext, timeframe);

        // Pattern 1: Source switching within conversations
        const sourceSwitches = this.detectSourceSwitching(recentHistory);
        if (sourceSwitches.length > 0) {
            patterns.push({
                type: 'source_switching',
                description: 'User frequently switches between platforms in conversations',
                frequency: sourceSwitches.length,
                commonSwitches: this.getMostCommonSwitches(sourceSwitches)
            });
        }

        // Pattern 2: Cross-platform reference usage
        const crossRefs = this.detectCrossPlatformReferences(recentHistory);
        if (crossRefs.length > 0) {
            patterns.push({
                type: 'cross_platform_references',
                description: 'User references objects across different platforms',
                frequency: crossRefs.length,
                commonReferences: crossRefs.slice(0, 5)
            });
        }

        // Pattern 3: Multi-source queries
        const multiSourceQueries = recentHistory.filter(h => 
            h.crossPlatformRefs && h.crossPlatformRefs.length > 1
        );
        if (multiSourceQueries.length > 0) {
            patterns.push({
                type: 'multi_source_queries',
                description: 'User frequently queries across multiple platforms',
                frequency: multiSourceQueries.length,
                averageSources: multiSourceQueries.reduce((acc, q) => 
                    acc + q.crossPlatformRefs.length, 0) / multiSourceQueries.length
            });
        }

        return patterns;
    }

    /**
     * Calculate activity trends
     */
    calculateActivityTrends(userContext, timeframe) {
        const recentHistory = this.getRecentHistory(userContext, timeframe);
        const trends = {};

        // Group by time periods
        const timeGroups = this.groupByTimePeriods(recentHistory, timeframe);
        
        // Calculate trend for each source
        for (const source of this.supportedSources) {
            const sourceData = timeGroups.map(group => ({
                period: group.period,
                count: group.interactions.filter(i => i.source === source).length
            }));

            trends[source] = {
                data: sourceData,
                trend: this.calculateTrendDirection(sourceData),
                growth: this.calculateGrowthRate(sourceData)
            };
        }

        return trends;
    }

    /**
     * Generate activity-based recommendations
     */
    generateActivityRecommendations(activitySummary) {
        const recommendations = [];

        // Check for underutilized integrations
        for (const [source, health] of Object.entries(activitySummary.integrationHealth)) {
            if (health.isConnected && activitySummary.sourceBreakdown[source]?.interactions === 0) {
                recommendations.push({
                    type: 'underutilized_integration',
                    source,
                    message: `You have ${source} connected but haven't used it recently. Consider checking for new items.`,
                    action: `search_${source}`,
                    priority: 'low'
                });
            }
        }

        // Check for integration health issues
        for (const [source, health] of Object.entries(activitySummary.integrationHealth)) {
            if (!health.isConnected && source !== 'march' && source !== 'march-ai') {
                recommendations.push({
                    type: 'integration_health',
                    source,
                    message: `${source} integration appears to be disconnected. Reconnect to sync your data.`,
                    action: `reconnect_${source}`,
                    priority: 'high'
                });
            }
        }

        // Check for low success rates
        for (const [source, activity] of Object.entries(activitySummary.sourceBreakdown)) {
            if (activity.interactions > 5 && activity.successRate < 0.7) {
                recommendations.push({
                    type: 'low_success_rate',
                    source,
                    message: `Your ${source} queries have a low success rate (${Math.round(activity.successRate * 100)}%). Try being more specific.`,
                    action: 'improve_queries',
                    priority: 'medium'
                });
            }
        }

        return recommendations;
    }    /
**
     * Implement source-specific conversation flows
     * Requirements: 5.4, 5.5
     */
    async getSourceSpecificFlow(userId, source, intent, context = {}) {
        try {
            const userContext = this.getUserContext(userId);
            const sourceActivity = userContext.sourceActivity[source] || {};
            const integrationHealth = await this.getIntegrationHealth(userId, source);

            const flow = {
                source,
                intent,
                steps: [],
                recommendations: [],
                contextualHelp: [],
                nextActions: []
            };

            // Source-specific flow logic
            switch (source) {
                case 'linear':
                    flow.steps = this.getLinearFlow(intent, integrationHealth, sourceActivity);
                    break;
                case 'gmail':
                    flow.steps = this.getGmailFlow(intent, integrationHealth, sourceActivity);
                    break;
                case 'github':
                    flow.steps = this.getGithubFlow(intent, integrationHealth, sourceActivity);
                    break;
                case 'twitter':
                    flow.steps = this.getTwitterFlow(intent, integrationHealth, sourceActivity);
                    break;
                case 'cal':
                    flow.steps = this.getCalendarFlow(intent, integrationHealth, sourceActivity);
                    break;
                case 'march-ai':
                    flow.steps = this.getMarchAIFlow(intent, sourceActivity);
                    break;
                default:
                    flow.steps = this.getDefaultFlow(intent, sourceActivity);
            }

            // Add contextual help based on user experience
            flow.contextualHelp = this.getContextualHelp(source, sourceActivity, integrationHealth);

            // Suggest next actions
            flow.nextActions = this.suggestNextActions(source, intent, userContext);

            return flow;
        } catch (error) {
            console.error(`Error getting source-specific flow for ${source}:`, error);
            return {
                source,
                intent,
                steps: ['Handle request with default flow'],
                recommendations: [],
                contextualHelp: ['Contact support if issues persist'],
                nextActions: []
            };
        }
    }

    /**
     * Helper methods for calculating metrics
     */
    calculateSuccessRate(activities) {
        if (activities.length === 0) return 0;
        const successCount = activities.filter(a => a.success).length;
        return successCount / activities.length;
    }

    calculateAverageConfidence(activities) {
        if (activities.length === 0) return 0;
        const totalConfidence = activities.reduce((sum, a) => sum + (a.confidence || 0), 0);
        return totalConfidence / activities.length;
    }

    identifyErrorPatterns(activities) {
        const errors = activities.filter(a => !a.success);
        const patterns = {};
        
        errors.forEach(error => {
            const intent = error.intent || 'unknown';
            patterns[intent] = (patterns[intent] || 0) + 1;
        });

        return Object.entries(patterns)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([intent, count]) => ({ intent, count }));
    }

    getTimeframeCutoff(timeframe) {
        const now = new Date();
        switch (timeframe) {
            case '1h':
                return new Date(now.getTime() - 60 * 60 * 1000);
            case '24h':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
    }

    getRecentHistory(userContext, timeframe) {
        const cutoffTime = this.getTimeframeCutoff(timeframe);
        return userContext.conversationHistory.filter(h => 
            new Date(h.timestamp) >= cutoffTime
        );
    }

    detectSourceSwitching(history) {
        const switches = [];
        for (let i = 1; i < history.length; i++) {
            if (history[i].source !== history[i-1].source) {
                switches.push({
                    from: history[i-1].source,
                    to: history[i].source,
                    timestamp: history[i].timestamp
                });
            }
        }
        return switches;
    }

    detectCrossPlatformReferences(history) {
        return history.filter(h => 
            h.crossPlatformRefs && h.crossPlatformRefs.length > 0
        ).map(h => ({
            query: h.query,
            sources: h.crossPlatformRefs,
            timestamp: h.timestamp
        }));
    }

    getMostCommonSwitches(switches) {
        const switchCounts = {};
        switches.forEach(s => {
            const key = `${s.from}->${s.to}`;
            switchCounts[key] = (switchCounts[key] || 0) + 1;
        });
        
        return Object.entries(switchCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([switch_pattern, count]) => ({ switch_pattern, count }));
    }

    groupByTimePeriods(history, timeframe) {
        // Simplified grouping - could be enhanced based on timeframe
        const groups = [];
        const now = new Date();
        
        if (timeframe === '24h') {
            // Group by 4-hour periods
            for (let i = 0; i < 6; i++) {
                const periodStart = new Date(now.getTime() - (i + 1) * 4 * 60 * 60 * 1000);
                const periodEnd = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
                
                groups.unshift({
                    period: `${periodStart.getHours()}:00-${periodEnd.getHours()}:00`,
                    interactions: history.filter(h => {
                        const time = new Date(h.timestamp);
                        return time >= periodStart && time < periodEnd;
                    })
                });
            }
        }
        
        return groups;
    }

    calculateTrendDirection(data) {
        if (data.length < 2) return 'stable';
        
        const recent = data.slice(-3);
        const earlier = data.slice(0, -3);
        
        const recentAvg = recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
        const earlierAvg = earlier.length > 0 
            ? earlier.reduce((sum, d) => sum + d.count, 0) / earlier.length 
            : recentAvg;
        
        if (recentAvg > earlierAvg * 1.2) return 'increasing';
        if (recentAvg < earlierAvg * 0.8) return 'decreasing';
        return 'stable';
    }

    calculateGrowthRate(data) {
        if (data.length < 2) return 0;
        
        const first = data[0].count;
        const last = data[data.length - 1].count;
        
        if (first === 0) return last > 0 ? 100 : 0;
        return ((last - first) / first) * 100;
    }    /
**
     * Source-specific conversation flows
     */
    getLinearFlow(intent, health, activity) {
        const steps = [];
        
        if (!health.isConnected) {
            steps.push('Connect to Linear first');
            steps.push('Authorize March to access your Linear workspace');
        }
        
        switch (intent) {
            case 'search':
                steps.push('Search Linear issues assigned to you');
                steps.push('Filter by status, priority, or team');
                break;
            case 'create':
                steps.push('Create new Linear issue');
                steps.push('Set title, description, and assignee');
                steps.push('Choose appropriate team and project');
                break;
            case 'update':
                steps.push('Find the Linear issue to update');
                steps.push('Modify status, priority, or description');
                steps.push('Sync changes back to Linear');
                break;
        }
        
        return steps;
    }

    getGmailFlow(intent, health, activity) {
        const steps = [];
        
        if (!health.isConnected) {
            steps.push('Connect to Gmail first');
            steps.push('Grant email access permissions');
        }
        
        switch (intent) {
            case 'search':
                steps.push('Search your Gmail messages');
                steps.push('Filter by sender, subject, or date');
                break;
            case 'create':
                steps.push('Create task from email');
                steps.push('Extract key information from message');
                break;
        }
        
        return steps;
    }

    getGithubFlow(intent, health, activity) {
        const steps = [];
        
        if (!health.isConnected) {
            steps.push('Connect to GitHub first');
            steps.push('Install March GitHub app');
        }
        
        switch (intent) {
            case 'search':
                steps.push('Search GitHub issues and PRs');
                steps.push('Filter by repository and status');
                break;
            case 'create':
                steps.push('Create task from GitHub issue');
                steps.push('Link to repository and issue number');
                break;
        }
        
        return steps;
    }

    getTwitterFlow(intent, health, activity) {
        const steps = [];
        
        if (!health.isConnected) {
            steps.push('Connect to X/Twitter first');
            steps.push('Authorize social media access');
        }
        
        switch (intent) {
            case 'search':
                steps.push('Search your Twitter activity');
                steps.push('Find tweets and mentions');
                break;
            case 'create':
                steps.push('Create task from tweet');
                steps.push('Save important social media content');
                break;
        }
        
        return steps;
    }

    getCalendarFlow(intent, health, activity) {
        const steps = [];
        
        if (!health.isConnected) {
            steps.push('Connect to Calendar first');
            steps.push('Grant calendar access permissions');
        }
        
        switch (intent) {
            case 'search':
                steps.push('Search calendar events');
                steps.push('Filter by date range and attendees');
                break;
            case 'create':
                steps.push('Create meeting or event');
                steps.push('Set date, time, and participants');
                break;
            case 'schedule':
                steps.push('Schedule new calendar event');
                steps.push('Send invitations to attendees');
                break;
        }
        
        return steps;
    }

    getMarchAIFlow(intent, activity) {
        const steps = [];
        
        switch (intent) {
            case 'search':
                steps.push('Search AI-generated tasks and notes');
                steps.push('Review AI suggestions and recommendations');
                break;
            case 'create':
                steps.push('Generate intelligent task suggestions');
                steps.push('Create AI-enhanced productivity items');
                break;
        }
        
        return steps;
    }

    getDefaultFlow(intent, activity) {
        const steps = [];
        
        switch (intent) {
            case 'search':
                steps.push('Search your March items');
                steps.push('Filter by type, status, or date');
                break;
            case 'create':
                steps.push('Create new task or note');
                steps.push('Add details and set priorities');
                break;
            case 'update':
                steps.push('Find item to update');
                steps.push('Modify properties as needed');
                break;
        }
        
        return steps;
    }

    getContextualHelp(source, activity, health) {
        const help = [];
        
        // Integration-specific help
        if (!health.isConnected && source !== 'march' && source !== 'march-ai') {
            help.push(`Connect your ${source} account to sync data automatically`);
        }
        
        // Experience-based help
        if (activity.interactions < 5) {
            help.push(`New to ${source}? Try asking "show me my ${source} items"`);
        }
        
        if (activity.successRate < 0.7 && activity.interactions > 5) {
            help.push(`Try being more specific in your ${source} queries`);
        }
        
        return help;
    }

    suggestNextActions(source, intent, userContext) {
        const actions = [];
        
        // Based on recent activity
        const recentSources = Array.from(userContext.currentSession.sourcesUsed);
        
        if (recentSources.length > 1) {
            actions.push('Search across all connected platforms');
        }
        
        if (intent === 'search') {
            actions.push('Create a task from search results');
            actions.push('Update found items');
        }
        
        if (intent === 'create') {
            actions.push('Set reminders for new items');
            actions.push('Link to related items');
        }
        
        return actions;
    }
}