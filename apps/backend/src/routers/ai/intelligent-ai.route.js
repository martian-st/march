import { Router } from "express";
import { intelligentAIController } from "../../controllers/ai/intelligent-ai.controller.js";

const router = Router();

/**
 * Intelligent AI Routes
 * Single endpoint that learns from user interactions and understands natural language
 * without relying on keyword matching or rigid routing
 */

// Main intelligent request processing endpoint
router.post("/", async (req, res) => {
    await intelligentAIController.processIntelligentRequest(req, res);
});

// User learning statistics
router.get("/stats", async (req, res) => {
    await intelligentAIController.getUserLearningStats(req, res);
});

// Reset user learning data (for testing/debugging)
router.delete("/learning", async (req, res) => {
    await intelligentAIController.resetUserLearning(req, res);
});

// Health check
router.get("/health", async (req, res) => {
    await intelligentAIController.healthCheck(req, res);
});

export { router as intelligentAIRouter };
