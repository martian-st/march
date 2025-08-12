import express from 'express';
import { enhancedIntelligentAIController } from '../../controllers/ai/enhanced-intelligent-ai.controller.js';

const router = express.Router();

// Enhanced intelligent AI processing endpoint
router.post('/', enhancedIntelligentAIController.processEnhancedRequest.bind(enhancedIntelligentAIController));

// Health check endpoint
router.get('/health', enhancedIntelligentAIController.healthCheck.bind(enhancedIntelligentAIController));

export { router as enhancedIntelligentAIRouter };