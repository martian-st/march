import { GoogleGenerativeAI } from "@google/generative-ai";
import { Object } from "../../models/lib/object.model.js";

/**
 * User Learning Service
 * Learns from user interactions to improve AI understanding over time
 * This service builds user-specific context and patterns without training the base LLM
 */
export class UserLearningService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.2, // Lower temperature for consistent pattern recognition
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    // User interaction history and patterns
    this.userPatterns = new Map();
    this.userContext = new Map();
    this.userPreferences = new Map();
    this.interactionHistory = new Map();
  }

  /**
   * Learn from user interaction using AI understanding
   * Captures patterns, preferences, and context from each interaction
   */
  async learnFromInteraction(userId, query, result, feedback = null) {
    try {
      // Get or initialize user data
      const userHistory = this.interactionHistory.get(userId) || [];
      const userPatterns = this.userPatterns.get(userId) || {};

      // Detect operation type using AI (not pattern matching)
      const operationType = await this.detectOperationType(query, result);

      // Create interaction record
      const interaction = {
        timestamp: new Date().toISOString(),
        query: query.toLowerCase().trim(),
        originalQuery: query,
        result,
        feedback,
        success: result.success !== false,
        operationType,
        entities: await this.extractEntitiesWithAI(query), // Use AI for entity extraction
        context: this.getCurrentContext(userId),
      };

      // Add to history
      userHistory.push(interaction);

      // Keep only last 100 interactions to manage memory
      if (userHistory.length > 100) {
        userHistory.shift();
      }

      // Update patterns using AI understanding
      await this.updateUserPatternsWithAI(userId, interaction, userPatterns);

      // Store updated data
      this.interactionHistory.set(userId, userHistory);
      this.userPatterns.set(userId, userPatterns);

      // Update user context for future interactions
      await this.updateUserContext(userId, interaction);
    } catch (error) {
      console.error("Error learning from interaction:", error);
    }
  }

  /**
   * Detect operation type using AI understanding with improved search detection
   */
  async detectOperationType(query, result) {
    // First, analyze the result to understand what actually happened
    if (result.object || result.created) {
      return "create";
    } else if (result.objects || result.found) {
      return "search";
    } else if (result.updated || result.object?.updated) {
      return "update";
    } else if (result.meeting || result.scheduled) {
      return "schedule";
    }

    // Use AI to understand the query intent naturally with better search detection
    try {
      const intentPrompt = `
Analyze this user query and determine what type of operation they want to perform.
PAY SPECIAL ATTENTION to distinguishing between SEARCH and CREATE operations.

User query: "${query}"

CRITICAL RULES:
1. SEARCH queries ask about existing items:
   - "do I have any tasks" → search
   - "show me my tasks" → search
   - "what tasks do I have" → search
   - "find my items" → search
   - "any overdue tasks" → search

2. CREATE queries want to make new items:
   - "create a task" → create
   - "add a new task" → create
   - "make a reminder" → create

3. Question words usually indicate SEARCH:
   - "do I have..." → search
   - "what..." → search
   - "show me..." → search

Respond with just one word from: create, search, update, delete, schedule, conversational

Examples:
- "do I have any tasks" → search
- "show me my tasks" → search
- "what tasks do I have" → search
- "find my tasks" → search
- "any overdue items" → search
- "create a task" → create
- "add a task" → create
- "make a reminder" → create
- "change the due date" → update
- "schedule a meeting" → schedule
- "hello" → conversational
- "add due date to all tasks" → update
- "can you help me" → conversational
- "can you help me with creating/adding" -> create
- "can you help me with finding/looking" -> search
- "can you help me with add a date to " -> update
`;

      const aiResult = await this.model.generateContent(intentPrompt);
      const operationType = aiResult.response.text().trim().toLowerCase();

      // Validate the response
      const validTypes = [
        "create",
        "search",
        "update",
        "delete",
        "schedule",
        "conversational",
      ];
      return validTypes.includes(operationType) ? operationType : "unknown";
    } catch (error) {
      console.error("Error detecting operation type:", error);
      return "unknown";
    }
  }

  /**
   * Extract entities using AI (no pattern matching)
   */
  async extractEntitiesWithAI(query) {
    try {
      const entityPrompt = `
Extract important entities from this user query. Focus on dates, priorities, object types, and quantities.

User query: "${query}"

Respond in JSON format:
{
    "dates": ["dates mentioned like 'tomorrow', 'Friday', '2024-08-15'"],
    "priorities": ["priority levels like 'high', 'urgent', 'low'"],
    "types": ["object types like 'task', 'meeting', 'note'"],
    "quantities": ["quantities like 'all', '5', 'every'"],
    "actions": ["action words that indicate intent"],
    "other": ["other important entities"]
}

Examples:
- "add due date to all high priority tasks" → {"dates": [], "priorities": ["high"], "types": ["tasks"], "quantities": ["all"], "actions": ["add"]}
- "schedule meeting tomorrow at 2pm" → {"dates": ["tomorrow", "2pm"], "types": ["meeting"], "actions": ["schedule"]}
`;

      const result = await this.model.generateContent(entityPrompt);
      const responseText = result.response.text();
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Error extracting entities with AI:", error);
      // Fallback to simple extraction
      return {
        dates: [],
        priorities: [],
        types: [],
        quantities: [],
        actions: [],
        other: [],
      };
    }
  }

  /**
   * Update user patterns using AI understanding (no pattern matching)
   */
  async updateUserPatternsWithAI(userId, interaction, existingPatterns) {
    const { query, operationType, entities, success } = interaction;

    // Initialize pattern categories
    if (!existingPatterns.phrases) existingPatterns.phrases = {};
    if (!existingPatterns.operations) existingPatterns.operations = {};
    if (!existingPatterns.preferences) existingPatterns.preferences = {};
    if (!existingPatterns.corrections) existingPatterns.corrections = [];

    // Learn successful interaction patterns
    if (success && operationType !== "unknown") {
      if (!existingPatterns.phrases[operationType]) {
        existingPatterns.phrases[operationType] = [];
      }

      // Store the original query (not normalized) for better AI understanding
      const queryPattern = {
        query: interaction.originalQuery,
        entities: entities,
        timestamp: interaction.timestamp,
        success: true,
      };

      existingPatterns.phrases[operationType].push(queryPattern);

      // Keep only most recent 15 successful patterns per operation
      if (existingPatterns.phrases[operationType].length > 15) {
        existingPatterns.phrases[operationType].shift();
      }
    }

    // Track operation frequency
    if (!existingPatterns.operations[operationType]) {
      existingPatterns.operations[operationType] = 0;
    }
    existingPatterns.operations[operationType]++;

    // Learn user preferences from AI-extracted entities
    await this.updatePreferencesFromEntities(existingPatterns, entities);

    // Learn from failed interactions
    if (!success) {
      existingPatterns.corrections.push({
        query: interaction.originalQuery,
        timestamp: interaction.timestamp,
        expectedOperation: operationType,
        entities: entities,
      });

      // Keep only last 10 corrections
      if (existingPatterns.corrections.length > 10) {
        existingPatterns.corrections.shift();
      }
    }
  }

  /**
   * Get current context for user
   */
  getCurrentContext(userId) {
    return (
      this.userContext.get(userId) || {
        recentOperations: [],
        currentFocus: null,
        workingObjects: [],
      }
    );
  }

  /**
   * Update user context based on interaction
   */
  async updateUserContext(userId, interaction) {
    const context = this.getCurrentContext(userId);

    // Update recent operations
    context.recentOperations.push({
      type: interaction.operationType,
      timestamp: interaction.timestamp,
      query: interaction.query,
    });

    // Keep only last 5 operations
    if (context.recentOperations.length > 5) {
      context.recentOperations.shift();
    }

    // Update current focus based on entities and operations
    if (interaction.entities.types && interaction.entities.types.length > 0) {
      context.currentFocus = interaction.entities.types[0].toLowerCase();
    }

    // Track working objects
    if (interaction.result.object) {
      context.workingObjects.push({
        id: interaction.result.object._id,
        type: interaction.result.object.type,
        title: interaction.result.object.title,
        timestamp: interaction.timestamp,
      });

      // Keep only last 10 working objects
      if (context.workingObjects.length > 10) {
        context.workingObjects.shift();
      }
    }

    this.userContext.set(userId, context);
  }

  /**
   * Predict user intent using AI understanding and learned patterns
   */
  async predictUserIntent(userId, query) {
    const userPatterns = this.userPatterns.get(userId) || {};
    const userHistory = this.interactionHistory.get(userId) || [];
    const context = this.getCurrentContext(userId);

    // Build intelligent context for the AI model
    const contextPrompt = this.buildIntelligentContextPrompt(
      userId,
      query,
      userPatterns,
      context,
      userHistory
    );

    try {
      const result = await this.model.generateContent(contextPrompt);
      const prediction = JSON.parse(result.response.text());

      return {
        operationType: prediction.operationType,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
        suggestedAction: prediction.suggestedAction,
        contextUsed: userHistory.length > 0,
        parameters: prediction.parameters || {},
      };
    } catch (error) {
      console.error("Error predicting intent:", error);
      // Fallback to simple AI analysis
      return await this.simpleAIAnalysis(query);
    }
  }

  /**
   * Build intelligent context prompt for AI model with improved search vs create detection
   */
  buildIntelligentContextPrompt(
    userId,
    query,
    userPatterns,
    context,
    userHistory
  ) {
    const recentInteractions =
      userHistory
        .slice(-5)
        .map(
          (i) =>
            `User: "${i.originalQuery}" → AI performed: ${i.operationType} (${i.success ? "success" : "failed"})`
        )
        .join("\n") || "No previous interactions";

    const userPreferences = this.extractUserPreferences(
      userPatterns,
      userHistory
    );
    const contextInfo = this.buildContextInfo(context);

    return `
You are an intelligent assistant that understands user intent naturally, like ChatGPT. 
Analyze this user query and predict what they want to do.
CRITICAL: Pay special attention to distinguishing SEARCH from CREATE operations.

CURRENT USER QUERY: "${query}"

USER CONTEXT:
${recentInteractions}

${contextInfo}

USER PREFERENCES (learned from past interactions):
${userPreferences}

CRITICAL DISTINCTION RULES:
1. SEARCH queries ask about existing items (user wants to find/view):
   - "do I have any tasks" → search (NOT create)
   - "show me my tasks" → search
   - "what tasks do I have" → search
   - "find my items" → search
   - "any overdue tasks" → search
   - "what's due today" → search

2. CREATE queries want to make new items:
   - "create a task" → create
   - "add a new task" → create
   - "make a reminder" → create
   - "I need to create something" → create

3. Question words usually indicate SEARCH:
   - "do I have..." → search
   - "what..." → search
   - "show me..." → search
   - "any..." → search

INSTRUCTIONS:
Understand the user's intent naturally. Don't rely on keywords - understand the meaning like a human would.
The most common mistake is classifying search queries as create operations.

Consider:
- What is the user actually trying to accomplish?
- Are they asking about existing items (search) or wanting to make new ones (create)?
- Based on their past behavior, what would they typically want?
- What's the most helpful action to take?

Respond in JSON format:
{
    "operationType": "create|update|search|schedule|delete|conversational",
    "confidence": 85,
    "reasoning": "Natural explanation focusing on search vs create distinction",
    "suggestedAction": "Specific helpful action to take",
    "parameters": {
        "entities": ["important things mentioned in the query"],
        "context": "additional context that might help"
    }
}`;
  }

  /**
   * Simple AI analysis for new users with improved search detection
   */
  async simpleAIAnalysis(query) {
    const prompt = `
You are an intelligent assistant. Understand what this user wants to do naturally.
CRITICAL: Correctly distinguish between SEARCH and CREATE operations.

User query: "${query}"

Understand their intent like ChatGPT would - focus on the meaning, not keywords.
The most common mistake is treating search queries as create requests.

SEARCH vs CREATE Examples:
- "do I have any tasks" → user wants to SEARCH for existing tasks (NOT create)
- "show me my tasks" → user wants to SEARCH/find existing tasks
- "what tasks do I have" → user wants to SEARCH for tasks
- "find my items" → user wants to SEARCH
- "any overdue tasks" → user wants to SEARCH for overdue items

- "create a task" → user wants to CREATE something new
- "add a new task" → user wants to CREATE
- "make a reminder" → user wants to CREATE
- "I need to add something" → user wants to CREATE

Other Examples:
- "add a due date to all my tasks" → user wants to UPDATE existing tasks
- "hey there" → user is being CONVERSATIONAL
- "schedule something tomorrow" → user wants to SCHEDULE

Respond in JSON format:
{
    "operationType": "create|update|search|schedule|delete|conversational",
    "confidence": 80,
    "reasoning": "Natural explanation focusing on search vs create distinction",
    "suggestedAction": "What would be most helpful",
    "parameters": {
        "entities": ["important things mentioned"],
        "context": "helpful context"
    }
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      // Clean up response to extract JSON
      const cleanedResponse = responseText
        .replace(/```json\n?|\n?```/g, "")
        .trim();
      const prediction = JSON.parse(cleanedResponse);
      return {
        ...prediction,
        contextUsed: false,
      };
    } catch (error) {
      console.error("Error in simple AI analysis:", error);
      return {
        operationType: "conversational",
        confidence: 50,
        reasoning: "Could not analyze - treating as conversation",
        suggestedAction: "Respond conversationally and ask how to help",
        contextUsed: false,
      };
    }
  }

  /**
   * Get user learning statistics
   */
  getUserLearningStats(userId) {
    const patterns = this.userPatterns.get(userId) || {};
    const history = this.interactionHistory.get(userId) || [];

    return {
      totalInteractions: history.length,
      operationCounts: patterns.operations || {},
      preferences: patterns.preferences || {},
      learningLevel: this.calculateLearningLevel(history.length),
      lastInteraction: history[history.length - 1]?.timestamp || null,
    };
  }

  /**
   * Calculate learning level based on interactions
   */
  calculateLearningLevel(interactionCount) {
    if (interactionCount < 5) return "beginner";
    if (interactionCount < 20) return "learning";
    if (interactionCount < 50) return "intermediate";
    return "advanced";
  }

  /**
   * Export user learning data (for backup/analysis)
   */
  exportUserData(userId) {
    return {
      patterns: this.userPatterns.get(userId),
      context: this.userContext.get(userId),
      preferences: this.userPreferences.get(userId),
      history: this.interactionHistory.get(userId),
    };
  }

  /**
   * Import user learning data (for restore)
   */
  importUserData(userId, data) {
    if (data.patterns) this.userPatterns.set(userId, data.patterns);
    if (data.context) this.userContext.set(userId, data.context);
    if (data.preferences) this.userPreferences.set(userId, data.preferences);
    if (data.history) this.interactionHistory.set(userId, data.history);
  }

  /**
   * Update user preferences from AI-extracted entities
   */
  async updatePreferencesFromEntities(existingPatterns, entities) {
    // Learn priority preferences
    if (entities.priorities && entities.priorities.length > 0) {
      if (!existingPatterns.preferences.priority) {
        existingPatterns.preferences.priority = {};
      }
      entities.priorities.forEach((priority) => {
        const normalizedPriority = priority.toLowerCase();
        existingPatterns.preferences.priority[normalizedPriority] =
          (existingPatterns.preferences.priority[normalizedPriority] || 0) + 1;
      });
    }

    // Learn type preferences
    if (entities.types && entities.types.length > 0) {
      if (!existingPatterns.preferences.types) {
        existingPatterns.preferences.types = {};
      }
      entities.types.forEach((type) => {
        const normalizedType = type.toLowerCase();
        existingPatterns.preferences.types[normalizedType] =
          (existingPatterns.preferences.types[normalizedType] || 0) + 1;
      });
    }

    // Learn action preferences
    if (entities.actions && entities.actions.length > 0) {
      if (!existingPatterns.preferences.actions) {
        existingPatterns.preferences.actions = {};
      }
      entities.actions.forEach((action) => {
        const normalizedAction = action.toLowerCase();
        existingPatterns.preferences.actions[normalizedAction] =
          (existingPatterns.preferences.actions[normalizedAction] || 0) + 1;
      });
    }
  }

  /**
   * Extract user preferences for context prompt
   */
  extractUserPreferences(userPatterns, userHistory) {
    // Ensure userPatterns is properly initialized
    if (!userPatterns || typeof userPatterns !== "object") {
      return "No specific preferences learned yet.";
    }

    const preferences = userPatterns.preferences || {};
    let prefText = "No specific preferences learned yet.";

    if (
      preferences &&
      typeof preferences === "object" &&
      preferences !== null &&
      Object.keys(preferences).length > 0
    ) {
      const prefParts = [];

      if (preferences.priority) {
        const topPriority = Object.entries(preferences.priority).sort(
          ([, a], [, b]) => b - a
        )[0];
        if (topPriority) {
          prefParts.push(`Prefers ${topPriority[0]} priority items`);
        }
      }

      if (preferences.types) {
        const topType = Object.entries(preferences.types).sort(
          ([, a], [, b]) => b - a
        )[0];
        if (topType) {
          prefParts.push(`Often works with ${topType[0]}s`);
        }
      }

      if (prefParts.length > 0) {
        prefText = prefParts.join(", ");
      }
    }

    return prefText;
  }

  /**
   * Build context information for prompt
   */
  buildContextInfo(context) {
    // Handle undefined or null context
    if (!context || typeof context !== "object") {
      return "No specific context available.";
    }

    const parts = [];

    if (
      context.recentOperations &&
      Array.isArray(context.recentOperations) &&
      context.recentOperations.length > 0
    ) {
      const recentOps = context.recentOperations
        .map((op) => op.type || "unknown")
        .join(", ");
      parts.push(`Recent operations: ${recentOps}`);
    }

    if (context.currentFocus) {
      parts.push(`Current focus: ${context.currentFocus}`);
    }

    if (
      context.workingObjects &&
      Array.isArray(context.workingObjects) &&
      context.workingObjects.length > 0
    ) {
      parts.push(
        `Currently working with ${context.workingObjects.length} objects`
      );
    }

    return parts.length > 0
      ? parts.join("\n")
      : "No specific context available.";
  }
}
