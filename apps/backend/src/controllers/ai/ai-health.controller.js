import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiErrorHandler } from "../../utils/ai-error-handler.js";

/**
 * AI Health Controller
 * Monitors AI service health and provides status information
 */
export class AIHealthController {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.healthStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            lastError: null,
            lastSuccess: null,
            serviceStatus: 'unknown'
        };
    }

    /**
     * Check AI service health
     */
    async checkHealth(req, res) {
        try {
            // Simple health check with minimal AI call
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const healthResult = await aiErrorHandler.executeWithRetry(async () => {
                const result = await model.generateContent("Say 'healthy' if you can respond.");
                return result.response.text();
            }, { method: 'healthCheck' });

            if (healthResult.success) {
                this.healthStats.successfulRequests++;
                this.healthStats.lastSuccess = new Date();
                this.healthStats.serviceStatus = 'healthy';
                
                res.json({
                    status: 'healthy',
                    message: 'AI services are operational',
                    stats: this.healthStats,
                    timestamp: new Date()
                });
            } else {
                this.healthStats.failedRequests++;
                this.healthStats.lastError = healthResult.error;
                this.healthStats.serviceStatus = 'degraded';
                
                res.status(503).json({
                    status: 'degraded',
                    message: 'AI services are experiencing issues',
                    error: healthResult.error,
                    stats: this.healthStats,
                    timestamp: new Date()
                });
            }

            this.healthStats.totalRequests++;

        } catch (error) {
            this.healthStats.failedRequests++;
            this.healthStats.lastError = error.message;
            this.healthStats.serviceStatus = 'unhealthy';
            
            res.status(500).json({
                status: 'unhealthy',
                message: 'AI services are unavailable',
                error: error.message,
                stats: this.healthStats,
                timestamp: new Date()
            });
        }
    }

    /**
     * Get AI service statistics
     */
    async getStats(req, res) {
        try {
            const successRate = this.healthStats.totalRequests > 0 
                ? (this.healthStats.successfulRequests / this.healthStats.totalRequests * 100).toFixed(2)
                : 0;

            res.json({
                stats: {
                    ...this.healthStats,
                    successRate: `${successRate}%`
                },
                recommendations: this.getRecommendations(),
                timestamp: new Date()
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to get AI service statistics',
                message: error.message
            });
        }
    }

    /**
     * Get recommendations based on current health
     */
    getRecommendations() {
        const recommendations = [];
        
        if (this.healthStats.serviceStatus === 'degraded') {
            recommendations.push('Consider implementing request queuing');
            recommendations.push('Monitor API quota usage');
            recommendations.push('Enable fallback responses');
        }
        
        if (this.healthStats.serviceStatus === 'unhealthy') {
            recommendations.push('Check API key configuration');
            recommendations.push('Verify network connectivity');
            recommendations.push('Enable maintenance mode');
        }
        
        const successRate = this.healthStats.totalRequests > 0 
            ? (this.healthStats.successfulRequests / this.healthStats.totalRequests * 100)
            : 100;
            
        if (successRate < 90) {
            recommendations.push('Investigate recurring errors');
            recommendations.push('Consider alternative AI providers');
        }
        
        return recommendations;
    }
}

export const aiHealthController = new AIHealthController();