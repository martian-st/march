import express from 'express';
import {
    processVoiceCommand,
    transcribeVoice,
    getVoiceCapabilities,
    handleWakeWord,
    voiceHealthCheck
} from '../controllers/ai/voice.controller.js';

const router = express.Router();

// Main voice command processing endpoint
router.post('/process', processVoiceCommand);

// Voice transcription only (for testing)
router.post('/transcribe', transcribeVoice);

// Handle wake word activation
router.post('/wake-word', handleWakeWord);

// Get voice capabilities and examples
router.get('/capabilities', getVoiceCapabilities);

// Health check for voice services
router.get('/health', voiceHealthCheck);

export { router as voiceRouter };