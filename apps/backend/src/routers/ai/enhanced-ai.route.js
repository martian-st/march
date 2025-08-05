import { Router } from "express";
import { enhancedAIController } from "../../controllers/ai/enhanced-ai.controller.js";

const router = Router();

// Router will be exported at the end of the file

/**
 * Enhanced AI Routes
 * Provides sophisticated AI capabilities with chain-of-thought reasoning
 */

// Main complex request processing endpoint
router.post("/process", async (req, res) => {
    await enhancedAIController.processComplexRequest(req, res);
});

// Smart object finding
router.post("/find", async (req, res) => {
    await enhancedAIController.findObjects(req, res);
});

// Intelligent object creation
router.post("/create", async (req, res) => {
    await enhancedAIController.createObject(req, res);
});

// Calendar integration
router.post("/calendar", async (req, res) => {
    await enhancedAIController.handleCalendarRequest(req, res);
});

// Conversation context management
router.get("/context", async (req, res) => {
    await enhancedAIController.getConversationContext(req, res);
});

router.delete("/context", async (req, res) => {
    await enhancedAIController.clearConversationContext(req, res);
});

// Clarification management
router.get("/clarifications", async (req, res) => {
    await enhancedAIController.getPendingClarifications(req, res);
});

router.delete("/clarifications", async (req, res) => {
    await enhancedAIController.clearPendingClarifications(req, res);
});

// Intent analysis (without execution)
router.post("/analyze", async (req, res) => {
    await enhancedAIController.analyzeIntent(req, res);
});

// Get AI capabilities
router.get("/capabilities", async (req, res) => {
    await enhancedAIController.getCapabilities(req, res);
});

// Health check
router.get("/health", async (req, res) => {
    await enhancedAIController.healthCheck(req, res);
});

export default router;
