import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Update Parameter Extractor Service
 * Enhanced parameter extraction for source-specific and cross-platform updates
 */
export class UpdateParameterExtractorService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048
            }
        });
        
        // Define source-specific constraints and capabilities
        this.sourceConstraints = {
            'linear': {
                readOnlyFields: ['title', 'description', 'type'],
                allowedUpdates: ['status', 'priority', 'labels', 'metadata'],
                requiresConfirmation: true,
                crossPlatformAllowed: false
            },
            'twitter': {
                readOnlyFields: ['title', 'description', 'type'],
                allowedUpdates: ['status', 'priority', 'labels', 'metadata'],
                requiresConfirmation: true,
                crossPlatformAllowed: false
            },
            'gmail': {
                readOnlyFields: ['title', 'description', 'type'],
                allowedUpdates: ['status', 'priority', 'labels', 'metadata'],
                requiresConfirmation: true,
                crossPlatformAllowed: false
            },
            'github': {
                readOnlyFields: ['title', 'description', 'type'],
                allowedUpdates: ['status', 'priority', 'labels', 'metadata'],
                requiresConfirmation: true,
                crossPlatformAllowed: false
            },
            'cal': {
                readOnlyFields: ['title', 'description', 'type', 'due'],
                allowedUpdates: ['status', 'priority', 'labels', 'metadata'],
                requiresConfirmation: true,
                crossPlatformAllowed: false
            },
            'march': {
                readOnlyFields: [],
                allowedUpdates: ['title', 'description', 'type', 'status', 'priority', 'labels', 'metadata', 'due'],
                requiresConfirmation: false,
                crossPlatformAllowed: true
            },
            'march-ai': {
                readOnlyFields: [],
                allowedUpdates: ['title', 'description', 'type', 'status', 'priority', 'labels', 'metadata', 'due'],
                requiresConfirmation: false,
                crossPlatformAllowed: true
            }
        };
    }

    /**
     * Enhanced parameter extraction with source-specific validation
     */
    async extractUpdateParameters(query, context = {}) {
        try {
            console.log(`Extracting update parameters from: "${query}"`);
            
            // First pass: Basic parameter extraction
            const basicParams = await this.extractBasicParameters(query, context);
            
            if (!basicParams.success) {
                return basicParams;
            }

            // Second pass: Source-specific validation and enhancement
            const enhancedParams = await this.enhanceWithSourceConstraints(basicParams, context);
            
            // Third pass: Cross-platform validation
            const validatedParams = await this.validateCrossPlatformOperations(enhancedParams, context);
            
            return validatedParams;
            
        } catch (error) {
            console.error("Error in extractUpdateParameters:", error);
            return {
                success: false,
                error: "Failed to extract update parameters",
                details: error.message,
                suggestions: [
                    "Try rephrasing your update request",
                    "Be more specific about what you want to update",
                    "Specify the source if updating integration items"
                ]
            };
        }
    }

    /**
     * Extract basic parameters from natural language
     */
    async extractBasicParameters(query, context = {}) {
        const extractionPrompt = `
        Analyze this update request and extract parameters: "${query}"
        
        Context: ${JSON.stringify(context)}
        
        Return JSON with this exact structure:
        {
            "success": true,
            "searchCriteria": {
                "keywords": ["search", "terms", "from", "query"],
                "type": "todo|note|meeting|bookmark|null",
                "status": "null|todo|in progress|done|archive|null",
                "source": "march|march-ai|linear|twitter|gmail|github|cal|null",
                "sources": ["array", "of", "sources", "if", "multiple"],
                "priority": "urgent|high|medium|low|null",
                "labels": ["label1", "label2"],
                "timeFrame": "today|this_week|overdue|recent|null",
                "specificId": "object_id_if_mentioned|null",
                "isBulkOperation": false,
                "targetCount": "estimated_number_of_objects"
            },
            "updateData": {
                "title": "new_title|null",
                "status": "new_status|null",
                "priority": "new_priority|null",
                "type": "new_type|null",
                "due": {
                    "date": "ISO_date_string|null",
                    "string": "human_readable_date|null",
                    "timezone": "UTC"
                },
                "labels": ["new", "labels"],
                "metadata": {},
                "description": "new_description|null"
            },
            "operationType": "single|bulk|conditional|cross_platform",
            "requiresConfirmation": false,
            "confidence": 0.95,
            "extractedIntent": "detailed_description_of_what_user_wants"
        }
        
        Source Detection Examples:
        "mark all Linear tasks as done" -> source: "linear", status: "done", isBulkOperation: true
        "update GitHub issues priority to high" -> source: "github", priority: "high", isBulkOperation: true
        "change Gmail items status to archive" -> source: "gmail", status: "archive", isBulkOperation: true
        "mark Twitter posts as read" -> source: "twitter", status: "done", isBulkOperation: true
        "set Calendar events priority to low" -> source: "cal", priority: "low", isBulkOperation: true
        "update all integration items status" -> sources: ["linear", "twitter", "gmail", "github", "cal"], operationType: "cross_platform"
        "mark my task 'buy milk' as done" -> keywords: ["buy", "milk"], status: "done", operationType: "single"
        "archive all completed tasks" -> status: "done" (search), status: "archive" (update), isBulkOperation: true
        "add due date tomorrow to urgent tasks" -> priority: "urgent", due: {date: "tomorrow"}, isBulkOperation: true
        
        Bulk Operation Detection:
        - "all", "every", "each" -> isBulkOperation: true, requiresConfirmation: true
        - Specific item mentioned -> isBulkOperation: false
        - Multiple sources -> operationType: "cross_platform", requiresConfirmation: true
        
        If unclear or missing info, set success: false with error and suggestions.
        `;

        try {
            const result = await this.model.generateContent(extractionPrompt);
            const response = result.response.text();
            const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
            
            // Post-process and validate
            if (parsed.success) {
                parsed.searchCriteria = this.cleanSearchCriteria(parsed.searchCriteria);
                parsed.updateData = this.cleanUpdateData(parsed.updateData);
                
                // Handle date parsing
                if (parsed.updateData.due && parsed.updateData.due.date) {
                    parsed.updateData.due.date = this.parseDateString(parsed.updateData.due.date);
                }
            }
            
            return parsed;
            
        } catch (error) {
            console.error("Error in basic parameter extraction:", error);
            return {
                success: false,
                error: "Could not understand the update request",
                suggestions: [
                    "Try being more specific about what to update",
                    "Specify which objects to target (e.g., 'all urgent tasks', 'Linear items')",
                    "Clearly state the changes to make (e.g., 'mark as done', 'set priority to high')"
                ]
            };
        }
    }

    /**
     * Enhance parameters with source-specific constraints
     */
    async enhanceWithSourceConstraints(basicParams, context = {}) {
        try {
            const { searchCriteria, updateData } = basicParams;
            
            // Determine target sources
            const targetSources = this.determineTargetSources(searchCriteria);
            
            // Validate updates against source constraints
            const sourceValidation = this.validateSourceUpdates(targetSources, updateData);
            
            if (!sourceValidation.valid) {
                return {
                    success: false,
                    error: sourceValidation.error,
                    suggestions: sourceValidation.suggestions,
                    sourceConstraints: sourceValidation.constraints
                };
            }

            // Enhance with source-specific logic
            const enhancedParams = {
                ...basicParams,
                sourceConstraints: {
                    targetSources,
                    allowedUpdates: sourceValidation.allowedUpdates,
                    restrictedFields: sourceValidation.restrictedFields,
                    requiresConfirmation: sourceValidation.requiresConfirmation,
                    crossPlatformAllowed: sourceValidation.crossPlatformAllowed
                },
                validationResults: sourceValidation
            };

            // Adjust confirmation requirements based on source constraints
            if (sourceValidation.requiresConfirmation || basicParams.searchCriteria.isBulkOperation) {
                enhancedParams.requiresConfirmation = true;
            }

            return enhancedParams;
            
        } catch (error) {
            console.error("Error enhancing with source constraints:", error);
            return {
                ...basicParams,
                warnings: [`Could not validate source constraints: ${error.message}`]
            };
        }
    }

    /**
     * Validate cross-platform update operations
     */
    async validateCrossPlatformOperations(enhancedParams, context = {}) {
        try {
            const { sourceConstraints, operationType, updateData } = enhancedParams;
            
            // Skip validation for single-source operations
            if (operationType !== 'cross_platform' && sourceConstraints.targetSources.length <= 1) {
                return enhancedParams;
            }

            // Check if cross-platform operation is allowed
            const integrationSources = sourceConstraints.targetSources.filter(source => 
                ['linear', 'twitter', 'gmail', 'github', 'cal'].includes(source)
            );

            if (integrationSources.length > 0) {
                // Check for restricted field updates across platforms
                const restrictedFields = ['title', 'description', 'type'];
                const hasRestrictedUpdates = restrictedFields.some(field => 
                    updateData[field] !== null && updateData[field] !== undefined
                );

                if (hasRestrictedUpdates) {
                    return {
                        success: false,
                        error: "Cannot modify core fields across integration platforms",
                        suggestions: [
                            "Update only status, priority, or labels for integration items",
                            "Separate the update into platform-specific operations",
                            "Use bulk status updates instead of content changes"
                        ],
                        crossPlatformIssue: true,
                        affectedSources: integrationSources
                    };
                }

                // Force confirmation for cross-platform integration updates
                enhancedParams.requiresConfirmation = true;
                enhancedParams.crossPlatformWarning = `This will update items from ${integrationSources.length} integration platform(s): ${integrationSources.join(', ')}`;
            }

            // Add cross-platform validation metadata
            enhancedParams.crossPlatformValidation = {
                isValid: true,
                integrationSources,
                nativeSources: sourceConstraints.targetSources.filter(source => 
                    ['march', 'march-ai'].includes(source)
                ),
                requiresSpecialHandling: integrationSources.length > 0
            };

            return enhancedParams;
            
        } catch (error) {
            console.error("Error validating cross-platform operations:", error);
            return {
                ...enhancedParams,
                warnings: [...(enhancedParams.warnings || []), `Cross-platform validation failed: ${error.message}`]
            };
        }
    }

    /**
     * Determine target sources from search criteria
     */
    determineTargetSources(searchCriteria) {
        const sources = [];
        
        if (searchCriteria.source) {
            sources.push(searchCriteria.source);
        }
        
        if (searchCriteria.sources && searchCriteria.sources.length > 0) {
            sources.push(...searchCriteria.sources);
        }
        
        // If no specific sources mentioned, assume all sources could be targeted
        if (sources.length === 0) {
            return ['march', 'march-ai', 'linear', 'twitter', 'gmail', 'github', 'cal'];
        }
        
        return [...new Set(sources)]; // Remove duplicates
    }

    /**
     * Validate updates against source constraints
     */
    validateSourceUpdates(targetSources, updateData) {
        const validation = {
            valid: true,
            allowedUpdates: [],
            restrictedFields: [],
            requiresConfirmation: false,
            crossPlatformAllowed: true,
            constraints: {}
        };

        for (const source of targetSources) {
            const constraints = this.sourceConstraints[source];
            if (!constraints) continue;

            validation.constraints[source] = constraints;

            // Check for restricted field updates
            const restrictedUpdates = constraints.readOnlyFields.filter(field => 
                updateData[field] !== null && updateData[field] !== undefined
            );

            if (restrictedUpdates.length > 0) {
                validation.valid = false;
                validation.error = `Cannot update ${restrictedUpdates.join(', ')} for ${source} items`;
                validation.suggestions = [
                    `${source} items allow updates to: ${constraints.allowedUpdates.join(', ')}`,
                    "Try updating only status, priority, or labels",
                    "Core content is managed by the source platform"
                ];
                validation.restrictedFields.push(...restrictedUpdates);
                return validation;
            }

            // Collect allowed updates
            validation.allowedUpdates.push(...constraints.allowedUpdates);

            // Check confirmation requirements
            if (constraints.requiresConfirmation) {
                validation.requiresConfirmation = true;
            }

            // Check cross-platform allowance
            if (!constraints.crossPlatformAllowed) {
                validation.crossPlatformAllowed = false;
            }
        }

        // Remove duplicates from allowed updates
        validation.allowedUpdates = [...new Set(validation.allowedUpdates)];

        return validation;
    }

    /**
     * Clean and normalize search criteria
     */
    cleanSearchCriteria(criteria) {
        const cleaned = {};
        
        Object.keys(criteria).forEach(key => {
            if (criteria[key] !== null && criteria[key] !== undefined && criteria[key] !== 'null') {
                if (Array.isArray(criteria[key])) {
                    if (criteria[key].length > 0) {
                        cleaned[key] = criteria[key];
                    }
                } else {
                    cleaned[key] = criteria[key];
                }
            }
        });
        
        return cleaned;
    }

    /**
     * Clean and normalize update data
     */
    cleanUpdateData(updateData) {
        const cleaned = {};
        
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== null && updateData[key] !== undefined && updateData[key] !== 'null') {
                if (key === 'due' && updateData[key].date === null) {
                    // Skip due date if no actual date provided
                    return;
                }
                if (Array.isArray(updateData[key])) {
                    if (updateData[key].length > 0) {
                        cleaned[key] = updateData[key];
                    }
                } else if (typeof updateData[key] === 'object') {
                    // Handle nested objects like 'due'
                    const nestedCleaned = this.cleanUpdateData(updateData[key]);
                    if (Object.keys(nestedCleaned).length > 0) {
                        cleaned[key] = nestedCleaned;
                    }
                } else {
                    cleaned[key] = updateData[key];
                }
            }
        });
        
        return cleaned;
    }

    /**
     * Parse date string to ISO format with enhanced parsing
     */
    parseDateString(dateStr) {
        try {
            const now = new Date();
            
            switch (dateStr.toLowerCase()) {
                case 'today':
                    return now.toISOString();
                    
                case 'tomorrow':
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow.toISOString();
                    
                case 'next week':
                    const nextWeek = new Date(now);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    return nextWeek.toISOString();
                    
                case 'next month':
                    const nextMonth = new Date(now);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    return nextMonth.toISOString();
                    
                default:
                    // Try to parse as regular date
                    const parsed = new Date(dateStr);
                    if (isNaN(parsed.getTime())) {
                        throw new Error(`Invalid date: ${dateStr}`);
                    }
                    return parsed.toISOString();
            }
        } catch (error) {
            console.error("Error parsing date string:", error);
            return dateStr; // Return original if parsing fails
        }
    }

    /**
     * Get source-specific update recommendations
     */
    getSourceUpdateRecommendations(source) {
        const constraints = this.sourceConstraints[source];
        if (!constraints) {
            return {
                allowedUpdates: ['status', 'priority', 'labels'],
                recommendations: ["This source has standard update capabilities"]
            };
        }

        return {
            allowedUpdates: constraints.allowedUpdates,
            restrictedFields: constraints.readOnlyFields,
            recommendations: [
                `You can update: ${constraints.allowedUpdates.join(', ')}`,
                constraints.readOnlyFields.length > 0 
                    ? `Cannot modify: ${constraints.readOnlyFields.join(', ')} (managed by ${source})`
                    : "All fields can be updated",
                constraints.requiresConfirmation 
                    ? "Bulk updates require confirmation"
                    : "Updates can be applied immediately"
            ]
        };
    }

    /**
     * Validate update operation before execution
     */
    async validateUpdateOperation(extractedParams, targetObjects) {
        try {
            const validation = {
                valid: true,
                warnings: [],
                errors: [],
                recommendations: []
            };

            // Check object count vs. operation type
            if (extractedParams.operationType === 'single' && targetObjects.length > 1) {
                validation.warnings.push(`Found ${targetObjects.length} objects but operation seems intended for single item`);
                validation.recommendations.push("Consider being more specific or confirm bulk operation");
            }

            // Check source distribution
            const sourceDistribution = targetObjects.reduce((dist, obj) => {
                dist[obj.source] = (dist[obj.source] || 0) + 1;
                return dist;
            }, {});

            const sources = Object.keys(sourceDistribution);
            if (sources.length > 1) {
                validation.warnings.push(`Update affects multiple sources: ${sources.join(', ')}`);
                validation.recommendations.push("Consider source-specific updates for better control");
            }

            // Check for integration source updates
            const integrationSources = sources.filter(source => 
                ['linear', 'twitter', 'gmail', 'github', 'cal'].includes(source)
            );

            if (integrationSources.length > 0) {
                validation.warnings.push(`Updating integration items from: ${integrationSources.join(', ')}`);
                validation.recommendations.push("Integration items have limited update capabilities");
            }

            return validation;
            
        } catch (error) {
            console.error("Error validating update operation:", error);
            return {
                valid: false,
                errors: [`Validation failed: ${error.message}`],
                warnings: [],
                recommendations: ["Please try again or contact support"]
            };
        }
    }
}