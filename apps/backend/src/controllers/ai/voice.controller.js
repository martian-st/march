import { VoiceRecognitionService } from "../../services/ai/voice-recognition.service.js";
import { ChainOfThoughtService } from "../../services/ai/chain-of-thought.service.js";
import { AdvancedObjectManagerService } from "../../services/ai/advanced-object-manager.service.js";
import { CalendarIntegrationService } from "../../services/ai/calendar-integration.service.js";
import { environment } from "../../loaders/environment.loader.js";

// Initialize services
const voiceService = new VoiceRecognitionService(environment.GOOGLE_AI_API_KEY);
const chainOfThoughtService = new ChainOfThoughtService(
  environment.GOOGLE_AI_API_KEY
);
const objectManagerService = new AdvancedObjectManagerService(
  environment.GOOGLE_AI_API_KEY
);
const calendarService = new CalendarIntegrationService(
  environment.GOOGLE_AI_API_KEY
);

/**
 * Process voice command and execute AI assistant action
 */
export const processVoiceCommand = async (req, res) => {
  try {
    const { transcribedText, context = {}, sessionId } = req.body;

    if (!transcribedText) {
      return res.status(400).json({
        success: false,
        error: "Transcribed text is required"
      });
    }

    // Step 1: Process voice command to extract intent
    const voiceResult = await voiceService.processVoiceCommand(
      transcribedText,
      context
    );

    if (!voiceResult.success) {
      return res.status(400).json({
        success: false,
        error: "Failed to understand voice command",
        originalText: transcribedText,
        suggestion: "Please try speaking more clearly or rephrase your request"
      });
    }

    // Step 2: Convert to assistant query
    const assistantQuery =
      await voiceService.convertToAssistantQuery(voiceResult);

    // Step 3: Execute the appropriate AI service based on intent
    let assistantResult;

    try {
      switch (assistantQuery.type) {
        case "greeting":
          // Handle greetings directly without calling AI services
          assistantResult = {
            success: true,
            data: {
              greeting: true,
              message: 'Greeting processed'
            }
          };
          break;

        case "create":
          assistantResult = await objectManagerService.createObject(
            assistantQuery.query,
            assistantQuery.context
          );
          break;

        case "find":
          assistantResult = await objectManagerService.findObjects(
            assistantQuery.query,
            assistantQuery.options
          );
          break;

        case "calendar":
          assistantResult = await calendarService.processCalendarRequest(
            assistantQuery.query,
            assistantQuery.action,
            assistantQuery.context
          );
          break;

        case "process":
        default:
          assistantResult = await chainOfThoughtService.processComplexRequest(
            assistantQuery.query,
            assistantQuery.context
          );
          break;
      }

      // Ensure assistantResult has the expected structure
      if (!assistantResult) {
        assistantResult = {
          success: false,
          data: null,
          error: "No response from AI service"
        };
      }
    } catch (error) {
      console.error("AI service error:", error);
      assistantResult = {
        success: false,
        data: null,
        error: error.message || "AI service failed"
      };
    }

    // Step 4: Generate voice-friendly response
    const voiceResponse = voiceService.generateVoiceResponse(
      assistantResult,
      assistantQuery.voiceMetadata
    );

    // Step 5: Return comprehensive result
    res.json({
      success: true,
      data: {
        voiceProcessing: {
          originalText: transcribedText,
          intent: voiceResult.intent,
          confidence: voiceResult.confidence,
          parameters: voiceResult.parameters
        },
        assistantResult: assistantResult.data,
        voiceResponse: {
          text: voiceResponse.text,
          shouldSpeak: voiceResponse.shouldSpeak,
          confidence: voiceResponse.confidence
        },
        executionSummary: {
          voiceProcessingSuccess: voiceResult.success,
          assistantExecutionSuccess: assistantResult.success,
          overallSuccess: voiceResult.success && assistantResult.success,
          processedAt: new Date().toISOString()
        },
      }
    });
  } catch (error) {
    console.error("Voice command processing error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error processing voice command",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong"
    });
  }
};

/**
 * Process voice-to-text transcription only (for testing)
 */
export const transcribeVoice = async (req, res) => {
  try {
    const { transcribedText, context = {} } = req.body;

    if (!transcribedText) {
      return res.status(400).json({
        success: false,
        error: "Transcribed text is required"
      });
    }

    const voiceResult = await voiceService.processVoiceCommand(
      transcribedText,
      context
    );

    res.json({
      success: true,
      data: {
        originalText: transcribedText,
        processing: voiceResult,
        timestamp: new Date().toISOString()
      },
    });
  } catch (error) {
    console.error("Voice transcription error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process voice transcription"
    });
  }
};

/**
 * Get voice command capabilities and examples
 */
export const getVoiceCapabilities = async (req, res) => {
  try {
    const capabilities = {
      supportedIntents: [
        {
          intent: "create_task",
          description: "Create new tasks, notes, or todos",
          examples: [
            "Create a task to call the client tomorrow",
            "Add a note about the meeting discussion",
            "Remind me to review the budget report"
          ],
        },
        {
          intent: "find_objects",
          description: "Search for existing items",
          examples: [
            "Find my tasks for this week",
            "Show me notes about the project launch",
            "What are my urgent todos?"
          ],
        },
        {
          intent: "schedule_meeting",
          description: "Create calendar events and meetings",
          examples: [
            "Schedule a team meeting for Friday at 2pm",
            "Book a one-on-one with Sarah next week",
            "Create a recurring standup every Monday"
          ],
        },
        {
          intent: "complex_request",
          description: "Multi-step operations",
          examples: [
            "Find overdue tasks and create a meeting to discuss them",
            "Show me this week's priorities and schedule time to work on them",
            "Organize my tasks by project and set deadlines"
          ],
        },
        {
          intent: "general_query",
          description: "General questions and assistance",
          examples: [
            "What's on my schedule today?",
            "How many tasks do I have pending?",
            "Give me a summary of my week"
          ],
        }
      ],
      voiceFeatures: [
        "Natural language processing",
        "Intent recognition",
        "Context awareness",
        "Multi-step command execution",
        "Conversational responses",
        "Error handling and clarification"
      ],
      tips: [
        "Speak clearly and at a normal pace",
        "Use natural language - no need for specific commands",
        "Be specific about timeframes and priorities",
        "You can ask follow-up questions",
        "The system learns from context in your conversation"
      ],
    };

    res.json({
      success: true,
      data: capabilities
    });
  } catch (error) {
    console.error("Error getting voice capabilities:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get voice capabilities"
    });
  }
};

/**
 * Handle wake word activation
 */
export const handleWakeWord = async (req, res) => {
  try {
    const { wakeWord, context = {} } = req.body;

    if (!wakeWord) {
      return res.status(400).json({
        success: false,
        error: "Wake word is required"
      });
    }

    // Validate wake word
    const validWakeWords = ["hey march", "hi march", "hello march"];
    const normalizedWakeWord = wakeWord.toLowerCase().trim();

    if (!validWakeWords.some((word) => normalizedWakeWord.includes(word))) {
      return res.status(400).json({
        success: false,
        error: "Invalid wake word"
      });
    }

    // Log wake word activation
    console.log(`Wake word activated: "${wakeWord}"`);

    res.json({
      success: true,
      data: {
        activated: true,
        wakeWord: normalizedWakeWord,
        message: "Hey! I'm listening. What can I help you with?",
        timestamp: new Date().toISOString()
      },
    });
  } catch (error) {
    console.error("Wake word handling error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to handle wake word activation"
    });
  }
};

/**
 * Health check for voice services
 */
export const voiceHealthCheck = async (req, res) => {
  try {
    // Test voice processing with a simple command
    const testResult = await voiceService.processVoiceCommand(
      "Hello, can you help me?",
      {}
    );

    res.json({
      success: true,
      data: {
        status: "healthy",
        services: {
          voiceRecognition: testResult.success,
          chainOfThought: !!chainOfThoughtService,
          objectManager: !!objectManagerService,
          calendar: !!calendarService
        },
        wakeWordSupport: true,
        supportedWakeWords: ["hey march", "hi march", "hello march"],
        timestamp: new Date().toISOString()
      },
    });
  } catch (error) {
    console.error("Voice health check error:", error);
    res.status(500).json({
      success: false,
      error: "Voice services health check failed",
      timestamp: new Date().toISOString()
    });
    }
};
