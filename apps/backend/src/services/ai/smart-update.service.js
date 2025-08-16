import { GoogleGenerativeAI } from "@google/generative-ai";
import { Object } from "../../models/lib/object.model.js";
import { AdvancedObjectManagerService } from "./advanced-object-manager.service.js";
import { UpdateParameterExtractorService } from "./update-parameter-extractor.service.js";

/**
 * Smart Update Service
 * Handles intelligent update operations with source awareness and natural language processing
 */
export class SmartUpdateService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.3,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048
            }
        });
        this.objectManager = new AdvancedObjectManagerService(apiKey);
        this.parameterExtractor = new UpdateParameterExtractorService(apiKey);
        this.pendingOperations = new Map(); // Store pending bulk operations
    }

    /**
     * Update objects from natural language with source awareness
     */
    async updateFromNaturalLanguage(query, userId, context = {}) {
        try {
            console.log(`Processing update query: "${query}" for user: ${userId}`);
            
            // Extract update parameters from natural language using enhanced extractor
            const updateParams = await this.parameterExtractor.extractUpdateParameters(query, context);
            
            if (!updateParams.success) {
                return {
                    success: false,
                    error: updateParams.error,
                    suggestions: updateParams.suggestions || []
                };
            }

            // Find target objects based on search criteria
            const searchResults = await this.findTargetObjects(updateParams.searchCriteria, userId);
            
            if (searchResults.objects.length === 0) {
                return {
                    success: false,
                    error: "No objects found matching the update criteria",
                    searchCriteria: updateParams.searchCriteria,
                    suggestions: [
                        "Try using different search terms",
                        "Check if the objects exist",
                        "Verify the source filter if specified"
                    ]
                };
            }

            // Validate the update operation with enhanced validation
            if (this.parameterExtractor) {
                const operationValidation = await this.parameterExtractor.validateUpdateOperation(updateParams, searchResults.objects);
                if (!operationValidation.valid) {
                    return {
                        success: false,
                        error: "Update operation validation failed",
                        validationErrors: operationValidation.errors,
                        suggestions: operationValidation.recommendations
                    };
                }
                
                // Add warnings to the response if any
                if (operationValidation.warnings.length > 0) {
                    updateParams.warnings = operationValidation.warnings;
                    updateParams.recommendations = operationValidation.recommendations;
                }
            }

            // Check if bulk operation needs confirmation (enhanced logic)
            const needsConfirmation = updateParams.requiresConfirmation || 
                                    (searchResults.objects.length > 1 && updateParams.searchCriteria.isBulkOperation) ||
                                    (updateParams.sourceConstraints && updateParams.sourceConstraints.requiresConfirmation) ||
                                    (updateParams.operationType === 'cross_platform');
            
            if (needsConfirmation) {
                const operationId = this.generateOperationId();
                this.pendingOperations.set(operationId, {
                    userId,
                    objects: searchResults.objects,
                    updateData: updateParams.updateData,
                    query,
                    timestamp: new Date(),
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
                });

                const sourceBreakdown = this.generateSourceBreakdown(searchResults.objects);
                
                return {
                    success: false,
                    needsConfirmation: true,
                    operationId,
                    affectedObjects: searchResults.objects.length,
                    preview: searchResults.objects.slice(0, 5).map(obj => ({
                        id: obj._id,
                        title: obj.title,
                        source: obj.source,
                        currentStatus: obj.status,
                        type: obj.type
                    })),
                    updateSummary: this.generateUpdateSummary(updateParams.updateData),
                    sourceBreakdown,
                    operationType: updateParams.operationType,
                    crossPlatformWarning: updateParams.crossPlatformWarning,
                    warnings: updateParams.warnings || [],
                    recommendations: updateParams.recommendations || [],
                    confirmationMessage: this.generateConfirmationMessage(searchResults.objects.length, updateParams, sourceBreakdown)
                };
            }

            // Execute the update
            const updateResult = await this.executeUpdate(searchResults.objects, updateParams.updateData, userId);
            
            return {
                success: true,
                updatedObjects: updateResult.successCount,
                failedUpdates: updateResult.failedCount,
                details: updateResult.details,
                summary: this.generateResultSummary(updateResult, updateParams),
                sourceBreakdown: this.generateSourceBreakdown(updateResult.updatedObjects)
            };

        } catch (error) {
            console.error("Error in updateFromNaturalLanguage:", error);
            return {
                success: false,
                error: "Failed to process update request",
                details: error.message
            };
        }
    }

    /**
     * Execute bulk update with source filtering capabilities
     */
    async bulkUpdate(searchCriteria, updateData, userId, options = {}) {
        try {
            console.log(`Executing bulk update for user: ${userId}`, { searchCriteria, updateData });
            
            // Validate source constraints
            const sourceValidation = await this.validateSourceConstraints(searchCriteria, updateData, userId);
            if (!sourceValidation.valid) {
                return {
                    success: false,
                    error: sourceValidation.error,
                    suggestions: sourceValidation.suggestions
                };
            }

            // Find target objects
            const searchResults = await this.findTargetObjects(searchCriteria, userId);
            
            if (searchResults.objects.length === 0) {
                return {
                    success: false,
                    error: "No objects found matching the criteria",
                    searchCriteria
                };
            }

            // Check for confirmation requirement
            if (options.requireConfirmation && searchResults.objects.length > 1) {
                const operationId = this.generateOperationId();
                this.pendingOperations.set(operationId, {
                    userId,
                    objects: searchResults.objects,
                    updateData,
                    searchCriteria,
                    timestamp: new Date(),
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
                });

                return {
                    success: false,
                    needsConfirmation: true,
                    operationId,
                    affectedObjects: searchResults.objects.length,
                    preview: searchResults.objects.slice(0, 5)
                };
            }

            // Execute the update
            const result = await this.executeUpdate(searchResults.objects, updateData, userId);
            
            return {
                success: true,
                successCount: result.successCount,
                failedCount: result.failedCount,
                details: result.details,
                updatedObjects: result.updatedObjects,
                sourceBreakdown: this.generateSourceBreakdown(result.updatedObjects)
            };

        } catch (error) {
            console.error("Error in bulkUpdate:", error);
            return {
                success: false,
                error: "Bulk update failed",
                details: error.message
            };
        }
    }

    /**
     * Confirm and execute a pending bulk operation
     */
    async confirmBulkOperation(operationId, userId) {
        try {
            const operation = this.pendingOperations.get(operationId);
            
            if (!operation) {
                return {
                    success: false,
                    error: "Operation not found or expired",
                    suggestions: ["The operation may have expired. Please try again."]
                };
            }

            if (operation.userId !== userId) {
                return {
                    success: false,
                    error: "Unauthorized operation",
                    suggestions: ["You can only confirm your own operations."]
                };
            }

            if (new Date() > operation.expiresAt) {
                this.pendingOperations.delete(operationId);
                return {
                    success: false,
                    error: "Operation expired",
                    suggestions: ["Please submit the update request again."]
                };
            }

            // Execute the confirmed operation
            const result = await this.executeUpdate(operation.objects, operation.updateData, userId);
            
            // Clean up the pending operation
            this.pendingOperations.delete(operationId);
            
            return {
                success: true,
                executed: true,
                successCount: result.successCount,
                failedCount: result.failedCount,
                details: result.details,
                summary: `Successfully updated ${result.successCount} objects`,
                sourceBreakdown: this.generateSourceBreakdown(result.updatedObjects)
            };

        } catch (error) {
            console.error("Error in confirmBulkOperation:", error);
            return {
                success: false,
                error: "Failed to execute confirmed operation",
                details: error.message
            };
        }
    }



    /**
     * Find target objects for update based on search criteria
     */
    async findTargetObjects(searchCriteria, userId) {
        try {
            // Build search query
            const query = { user: userId, isDeleted: false };
            
            // Add type filter
            if (searchCriteria.type) {
                query.type = searchCriteria.type;
            }
            
            // Add status filter
            if (searchCriteria.status) {
                query.status = searchCriteria.status;
            }
            
            // Add source filter
            if (searchCriteria.source) {
                query.source = searchCriteria.source;
            } else if (searchCriteria.sources && searchCriteria.sources.length > 0) {
                query.source = { $in: searchCriteria.sources };
            }
            
            // Add priority filter
            if (searchCriteria.priority) {
                query.priority = searchCriteria.priority;
            }
            
            // Add keyword search
            if (searchCriteria.keywords && searchCriteria.keywords.length > 0) {
                const keywordRegex = new RegExp(searchCriteria.keywords.join('|'), 'i');
                query.$or = [
                    { title: keywordRegex },
                    { description: keywordRegex }
                ];
            }
            
            // Add specific ID search
            if (searchCriteria.specificId) {
                query._id = searchCriteria.specificId;
            }
            
            // Add time-based filters
            if (searchCriteria.timeFrame) {
                const timeFilter = this.buildTimeFilter(searchCriteria.timeFrame);
                Object.assign(query, timeFilter);
            }
            
            // Execute search
            const objects = await Object.find(query)
                .populate(['labels', 'user'])
                .sort({ updatedAt: -1 })
                .limit(100) // Safety limit
                .exec();
            
            return {
                objects,
                totalFound: objects.length,
                query
            };
            
        } catch (error) {
            console.error("Error finding target objects:", error);
            return {
                objects: [],
                totalFound: 0,
                error: error.message
            };
        }
    }

    /**
     * Execute the actual update operation
     */
    async executeUpdate(objects, updateData, userId) {
        const results = {
            successCount: 0,
            failedCount: 0,
            details: [],
            updatedObjects: []
        };
        
        for (const obj of objects) {
            try {
                // Prepare update data
                const updateFields = { ...updateData };
                
                // Handle status updates with completion tracking
                if (updateFields.status) {
                    if (updateFields.status === 'done') {
                        updateFields.isCompleted = true;
                        updateFields.completedAt = new Date();
                    } else {
                        updateFields.isCompleted = false;
                        updateFields.completedAt = null;
                    }
                }
                
                // Handle due date updates
                if (updateFields.due && updateFields.due.date) {
                    updateFields['due.date'] = updateFields.due.date;
                    updateFields['due.string'] = updateFields.due.string || updateFields.due.date;
                    delete updateFields.due;
                }
                
                // Execute update
                const updatedObj = await Object.findByIdAndUpdate(
                    obj._id,
                    { $set: updateFields },
                    { new: true, runValidators: true }
                ).populate(['labels', 'user']);
                
                results.successCount++;
                results.updatedObjects.push(updatedObj);
                results.details.push({
                    id: obj._id,
                    title: obj.title,
                    success: true,
                    changes: updateFields
                });
                
            } catch (error) {
                console.error(`Error updating object ${obj._id}:`, error);
                results.failedCount++;
                results.details.push({
                    id: obj._id,
                    title: obj.title,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Validate source constraints for updates (enhanced version)
     */
    async validateSourceConstraints(searchCriteria, updateData, userId) {
        try {
            // Use the parameter extractor's validation if available
            if (this.parameterExtractor) {
                const targetSources = this.parameterExtractor.determineTargetSources(searchCriteria);
                return this.parameterExtractor.validateSourceUpdates(targetSources, updateData);
            }
            
            // Fallback to basic validation
            const readOnlySources = ['linear', 'twitter', 'gmail', 'github', 'cal'];
            const restrictedFields = ['title', 'description', 'type'];
            
            // If updating integration sources with restricted fields
            if (searchCriteria.source && readOnlySources.includes(searchCriteria.source)) {
                const hasRestrictedUpdates = restrictedFields.some(field => updateData[field] !== undefined);
                if (hasRestrictedUpdates) {
                    return {
                        valid: false,
                        error: `Cannot modify core fields of ${searchCriteria.source} items`,
                        suggestions: [
                            "You can update status, priority, and labels for integration items",
                            "Core content (title, description) is managed by the source platform",
                            "Try updating only status or priority fields"
                        ]
                    };
                }
            }
            
            // Check cross-platform updates
            if (searchCriteria.sources && searchCriteria.sources.length > 1) {
                const hasIntegrationSources = searchCriteria.sources.some(source => readOnlySources.includes(source));
                const hasRestrictedUpdates = restrictedFields.some(field => updateData[field] !== undefined);
                
                if (hasIntegrationSources && hasRestrictedUpdates) {
                    return {
                        valid: false,
                        error: "Cannot modify core fields across multiple integration sources",
                        suggestions: [
                            "Update status, priority, or labels instead",
                            "Filter to specific sources for core field updates",
                            "Separate updates for integration vs. native items"
                        ]
                    };
                }
            }
            
            return { valid: true };
            
        } catch (error) {
            console.error("Error validating source constraints:", error);
            return {
                valid: false,
                error: "Could not validate update constraints",
                suggestions: ["Please try again or contact support"]
            };
        }
    }

    /**
     * Generate operation ID for pending operations
     */
    generateOperationId() {
        return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate update summary for confirmation
     */
    generateUpdateSummary(updateData) {
        const changes = [];
        
        if (updateData.status) {
            changes.push(`Status → ${updateData.status}`);
        }
        if (updateData.priority) {
            changes.push(`Priority → ${updateData.priority}`);
        }
        if (updateData.due && updateData.due.date) {
            changes.push(`Due date → ${updateData.due.string || updateData.due.date}`);
        }
        if (updateData.title) {
            changes.push(`Title → ${updateData.title}`);
        }
        if (updateData.labels && updateData.labels.length > 0) {
            changes.push(`Labels → ${updateData.labels.join(', ')}`);
        }
        
        return changes.join(', ');
    }

    /**
     * Generate confirmation message with source-specific details
     */
    generateConfirmationMessage(objectCount, updateParams, sourceBreakdown) {
        let message = `This will update ${objectCount} object${objectCount !== 1 ? 's' : ''}`;
        
        // Add source information
        const sources = Object.keys(sourceBreakdown);
        if (sources.length > 1) {
            const sourceDetails = sources.map(source => `${sourceBreakdown[source].count} from ${source}`).join(', ');
            message += ` (${sourceDetails})`;
        } else if (sources.length === 1 && sources[0] !== 'march') {
            message += ` from ${sources[0]}`;
        }
        
        // Add operation type context
        if (updateParams.operationType === 'cross_platform') {
            message += '. This is a cross-platform operation';
        }
        
        // Add specific warnings for integration sources
        const integrationSources = sources.filter(source => 
            ['linear', 'twitter', 'gmail', 'github', 'cal'].includes(source)
        );
        if (integrationSources.length > 0) {
            message += `. Note: Integration items from ${integrationSources.join(', ')} have limited update capabilities`;
        }
        
        message += '. Do you want to proceed?';
        
        return message;
    }

    /**
     * Generate result summary
     */
    generateResultSummary(updateResult, updateParams) {
        const { successCount, failedCount } = updateResult;
        let summary = `Updated ${successCount} object${successCount !== 1 ? 's' : ''}`;
        
        if (failedCount > 0) {
            summary += `, ${failedCount} failed`;
        }
        
        if (updateParams.updateData.status) {
            summary += ` (status changed to ${updateParams.updateData.status})`;
        }
        
        return summary;
    }

    /**
     * Generate source breakdown for results
     */
    generateSourceBreakdown(objects) {
        if (!Array.isArray(objects)) {
            return {};
        }
        
        return objects.reduce((breakdown, obj) => {
            const source = obj.source || 'unknown';
            if (!breakdown[source]) {
                breakdown[source] = { count: 0, items: [] };
            }
            breakdown[source].count++;
            breakdown[source].items.push({
                id: obj._id || obj.id,
                title: obj.title || 'Untitled',
                status: obj.status || 'null',
                type: obj.type || 'todo'
            });
            return breakdown;
        }, {});
    }

    /**
     * Build time filter for search criteria
     */
    buildTimeFilter(timeFrame) {
        const now = new Date();
        
        switch (timeFrame) {
            case 'today':
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(now);
                endOfDay.setHours(23, 59, 59, 999);
                return {
                    $or: [
                        { 'due.date': { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() } },
                        { createdAt: { $gte: startOfDay, $lte: endOfDay } }
                    ]
                };
                
            case 'this_week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return {
                    $or: [
                        { 'due.date': { $gte: startOfWeek.toISOString(), $lte: endOfWeek.toISOString() } },
                        { createdAt: { $gte: startOfWeek, $lte: endOfWeek } }
                    ]
                };
                
            case 'overdue':
                return {
                    'due.date': { $lt: now.toISOString() },
                    status: { $ne: 'done' }
                };
                
            case 'recent':
                const recentThreshold = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Last 7 days
                return {
                    updatedAt: { $gte: recentThreshold }
                };
                
            default:
                return {};
        }
    }

    /**
     * Parse date string to ISO format
     */
    parseDateString(dateStr) {
        try {
            if (dateStr === 'today') {
                return new Date().toISOString();
            } else if (dateStr === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow.toISOString();
            } else if (dateStr === 'next week') {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                return nextWeek.toISOString();
            } else {
                return new Date(dateStr).toISOString();
            }
        } catch (error) {
            console.error("Error parsing date string:", error);
            return dateStr; // Return original if parsing fails
        }
    }

    /**
     * Clean up expired pending operations
     */
    cleanupExpiredOperations() {
        const now = new Date();
        for (const [operationId, operation] of this.pendingOperations.entries()) {
            if (now > operation.expiresAt) {
                this.pendingOperations.delete(operationId);
            }
        }
    }
}