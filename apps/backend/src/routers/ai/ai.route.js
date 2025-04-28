import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Object } from "../../models/lib/object.model.js";
import { SYSTEM_PROMPT } from "../../prompts/system.prompt.js";
import { saveContent, SearchHandler, pineconeIndex, DayPlanner, PrioritizationHandler } from "../../utils/helper.service.js";
import { QueryUnderstanding } from "../../utils/query.service.js";
import { createObjectFromAI } from "../../controllers/lib/object.controller.js";
import { performance } from 'perf_hooks';

const router = Router();

// Initialize Google AI with error handling
export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('WARNING: GOOGLE_AI_API_KEY is not set. AI features will not work properly.');
}

// Configure chat model with optimized settings
const chatModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Using the latest model for better performance
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: 'text/plain' // Optimizing for faster text responses
    },
    systemInstruction: SYSTEM_PROMPT,
    safetySettings: [
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
    ]
});

// Response cache to avoid redundant AI calls
const responseCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache lifetime

// Enhanced generateResponse method with caching and error handling
chatModel.generateResponse = async function (context) {
    try {
        // Generate cache key based on context
        const cacheKey = JSON.stringify({
            type: context.type || 'default',
            query: context.query,
            resultCount: context.results?.length || 0,
            planId: context.plan?.id || null
        });

        // Check if this is a list_all query or prioritization query
        const isListAllQuery = context.parameters?.metadata?.listAll === true;
        const isPrioritizationQuery = context.type === 'prioritization';

        // Skip cache for list_all and prioritization queries to always get fresh data
        if (!isListAllQuery && !isPrioritizationQuery && responseCache.has(cacheKey)) {
            console.log('Using cached AI response');
            return responseCache.get(cacheKey);
        }

        let prompt, result;
        const startTime = performance.now();

        if (context.results) {
            // Check if this is a list_all query (for todos, tasks, etc.)
            const isListAllQuery = context.parameters?.metadata?.listAll === true;

            if (isListAllQuery) {
                // Special formatting for "list all" type queries
                prompt = `
                    The user asked for: "${context.query}"
                    Here are all the items:
                    ${JSON.stringify(context.results)}
                    
                    Format your response with a clear, numbered list.
                    Use bold for task titles and organize by source if multiple sources exist.
                    Be extremely concise - just list the items with minimal explanation.
                    Include only essential information like due dates or status if available.
                    
                    Example format:
                    **Here are all your todos:**
                    
                    1. **Task title** - Due Apr 30 (source: github)
                    2. **Another task** - High priority (source: linear)
                    3. **Third task** - In progress
                    
                    If there are no items, just say "You don't have any todos yet."
                `;
            } else {
                // Regular search results summarization
                prompt = `
                    The user searched for: "${context.query}"
                    Here are the search results:
                    ${JSON.stringify(context.results)}
                    
                    Please provide a helpful, natural language response that summarizes these results.
                    If there are no results, explain that nothing was found.
                    If there are results, highlight key information like titles, priorities, and due dates.
                    Format important information like dates, priorities, and status clearly.
                    Be concise but comprehensive.
                `;
            }

            result = await this.generateContent(prompt);
        } else if (context.type === 'day_planning') {
            // Day planning response
            prompt = `
                The user requested day planning with: "${context.query}"
                Here is the generated plan:
                ${JSON.stringify(context.plan)}

                Please provide a helpful, natural language response that presents this plan.
                Highlight key tasks, meetings, and priorities for the day.
                Format the schedule in a clear, readable way.
                Include time blocks, breaks, and any unscheduled tasks.
                Provide a brief summary of the day's focus areas.
            `;

            result = await this.generateContent(prompt);
        } else if (context.type === 'prioritization') {
            // Task prioritization response
            prompt = `
                The user requested task prioritization with: "${context.query}"
                Here are the prioritized tasks:
                ${JSON.stringify(context.prioritizedTasks)}

                EXTREMELY IMPORTANT INSTRUCTIONS:
                1. Start with a brief, professional header.
                2. Show ALL available tasks in the prioritized list.
                3. Keep explanations concise and action-oriented (3-5 words).
                4. Use this EXACT format:

                **Your prioritized tasks:**
                
                1. **[Task name]** - [Brief reason]
                2. **[Task name]** - [Brief reason]
                3. **[Task name]** - [Brief reason]
                4. **[Task name]** - [Brief reason]
                
                Keep it professional and direct.
                Focus on urgency and importance in the explanations.
                NO casual language or exclamation points.
                Use markdown ** symbols for bold text.
            `;

            result = await this.generateContent(prompt);
        } else {
            // General conversation response
            prompt = `
                The user asked: "${context.query}"
                Please provide a helpful, conversational response.
                Be concise, friendly, and informative.
            `;

            result = await this.generateContent(prompt);
        }

        const responseText = result.response.text();
        const processingTime = performance.now() - startTime;
        console.log(`AI response generated in ${processingTime.toFixed(2)}ms`);

        // Cache the response
        responseCache.set(cacheKey, responseText);
        setTimeout(() => responseCache.delete(cacheKey), CACHE_TTL);

        return responseText;
    } catch (error) {
        console.error('Error generating AI response:', error);

        // Provide a graceful fallback response
        if (error.message.includes('503') || error.message.includes('overloaded')) {
            return 'I\'m experiencing high load right now. Please try again in a moment.';
        }

        return 'I encountered an issue processing your request. Please try again or rephrase your question.';
    }
};

// Initialize the query understanding service
const queryUnderstanding = new QueryUnderstanding(chatModel);

// Conversation history cache to maintain context across user interactions
const conversationCache = new Map();
const CONVERSATION_TTL = 30 * 60 * 1000; // 30 minutes conversation lifetime

// Memory management for user preferences and important context
const userMemoryCache = new Map();
const MEMORY_TTL = 24 * 60 * 60 * 1000; // 24 hours memory lifetime

// Rate limiting to prevent abuse
const requestLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX = 20; // Maximum 20 requests per minute

// Helper function to check rate limits
function checkRateLimit (userId) {
    const now = Date.now();
    if (!requestLimits.has(userId)) {
        requestLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }
    
    const userLimit = requestLimits.get(userId);
    if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
        // Reset window if it's expired
        requestLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT_MAX) {
        return false; // Rate limit exceeded
    }

    // Increment count and allow request
    userLimit.count++;
    return true;
}

// Helper function to store important user context and preferences
function storeUserMemory (userId, key, value) {
    if (!userMemoryCache.has(userId)) {
        userMemoryCache.set(userId, new Map());
    }

    const userMemory = userMemoryCache.get(userId);
    userMemory.set(key, {
        value,
        timestamp: Date.now()
    });
    
    // Set expiration for memory
    setTimeout(() => {
        const userMemory = userMemoryCache.get(userId);
        if (userMemory) {
            userMemory.delete(key);
            // Clean up empty user memory
            if (userMemory.size === 0) {
                userMemoryCache.delete(userId);
            }
        }
    }, MEMORY_TTL);
    
    return true;
}

// Helper function to retrieve user memory
function getUserMemories (userId, query = null) {
    if (!userMemoryCache.has(userId)) {
        return [];
    }
    
    const userMemory = userMemoryCache.get(userId);
    const memories = [];
    
    userMemory.forEach((memoryData, key) => {
        // If query is provided, only return memories relevant to the query
        if (!query || query.toLowerCase().includes(key.toLowerCase())) {
            memories.push({
                key,
                value: memoryData.value,
                age: Math.floor((Date.now() - memoryData.timestamp) / (60 * 1000)) // age in minutes
            });
        }
    });
    
    return memories;
}

// Helper function to build a conversation prompt with context
function buildConversationPrompt(conversation, memories) {
    // Include the last 10 messages for context
    const recentMessages = conversation.messages.slice(-10);
    
    // Format conversation history
    const conversationHistory = recentMessages.map(msg =>
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');
    
    // Format relevant memories if any
    let memoryContext = '';
    if (memories && memories.length > 0) {
        memoryContext = '\nRelevant user information:\n' +
            memories.map(mem => `- ${mem.key}: ${JSON.stringify(mem.value)}`).join('\n');
    }
    
    // Build the final prompt
    return `Conversation history:\n${conversationHistory}\n${memoryContext}\n\nPlease respond to the user's most recent message in a helpful, concise, and natural way.`;
}

// Main endpoint for handling user queries
router.get("/ask", async (req, res) => {
    try {
        const { query } = req.query;
        const userId = req.user._id;
        
        // Apply rate limiting for security
        if (!checkRateLimit(userId)) {
            return res.status(429).json({
                error: "Rate limit exceeded. Please try again later."
            });
        }

        // Set response headers for streaming
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Cache-Control", "no-cache");

        // Performance tracking
        const startTime = performance.now();

        // Analyze the query
        const queryAnalysis = await queryUnderstanding.analyzeQuery(query, userId);
        const searchHandler = new SearchHandler(pineconeIndex);
        const dayPlanner = new DayPlanner(searchHandler, chatModel);
        const prioritizationHandler = new PrioritizationHandler(searchHandler, chatModel);

        console.log("Query Analysis:", queryAnalysis);

        // Track response time for analytics
        const processingStartTime = performance.now();

        // Retrieve any relevant memories for this user and query
        const userMemories = getUserMemories(userId, query);

        try {
            switch (queryAnalysis.type) {
            case 'creation':
                // eslint-disable-next-line no-case-declarations
                const createdObject = await createObjectFromAI(queryAnalysis.data, userId);
                res.write(JSON.stringify({
                    status: "completed",
                    data: createdObject,
                    processingTime: Math.round(performance.now() - processingStartTime)
                }) + "\n");
                break;

            case 'unsupported_feature':
                // Handle requests for unsupported features (calendar, email, etc.)
                // Store this as a memory to avoid repeatedly explaining the same limitation
                storeUserMemory(userId, `unsupported_${queryAnalysis.feature}`, {
                    feature: queryAnalysis.feature,
                    lastAsked: new Date().toISOString()
                });

                res.write(JSON.stringify({
                    status: "unsupported_feature",
                    data: {
                        message: queryAnalysis.message,
                        feature: queryAnalysis.feature,
                        alternatives: queryAnalysis.alternatives || []
                    },
                    processingTime: Math.round(performance.now() - processingStartTime)
                }) + "\n");
                break;

            case 'search':
                // eslint-disable-next-line no-case-declarations
                const searchResults = await searchHandler.searchContent(query, userId, queryAnalysis.parameters);

                // eslint-disable-next-line no-case-declarations
                const aiResponse = await chatModel.generateResponse({
                    query,
                    results: searchResults,
                    parameters: queryAnalysis.parameters
                });

                res.write(JSON.stringify({
                    status: "search",
                    data: aiResponse,
                    processingTime: Math.round(performance.now() - processingStartTime),
                    resultCount: searchResults.length
                }) + "\n");
                break;

            case 'day_planning': // New case
                // eslint-disable-next-line no-case-declarations
                const plan = await dayPlanner.planDay(userId, queryAnalysis.parameters);
                res.write(JSON.stringify({
                    status: "plan",
                    data: formatPlanResponse(plan, queryAnalysis),
                    processingTime: Math.round(performance.now() - processingStartTime)
                }));
                break;

            case 'prioritization':
                // eslint-disable-next-line no-case-declarations
                const prioritizationResult = await prioritizationHandler.prioritizeTasks(
                    userId,
                    queryAnalysis.parameters
                );
                if (prioritizationResult.status === "success") {
                    // Generate AI response for prioritization
                    const aiResponse = await chatModel.generateResponse({
                        query,
                        type: 'prioritization',
                        prioritizedTasks: prioritizationResult.prioritizedTasks,
                        parameters: queryAnalysis.parameters
                    });

                    res.write(JSON.stringify({
                        status: "prioritized",
                        data: aiResponse, // Use the AI's response directly
                        processingTime: Math.round(performance.now() - processingStartTime)
                    }) + "\n");
                } else {
                    res.write(JSON.stringify({
                        status: prioritizationResult.status,
                        data: formatPrioritizationResponse(prioritizationResult, queryAnalysis),
                        processingTime: Math.round(performance.now() - processingStartTime)
                    }) + "\n");
                }
                break;

            case 'conversation': {
                // Check if this conversation contains information we should remember
                const memoryIndicators = ['remember', 'don\'t forget', 'my preference', 'I prefer', 'I like', 'I don\'t like'];
                
                // If the query contains memory indicators, try to extract and store the memory
                if (memoryIndicators.some(indicator => query.toLowerCase().includes(indicator))) {
                    const memoryPrompt = `
                        The user said: "${query}"
                        
                        If this contains a preference or important information that should be remembered for future interactions,
                        extract it in this format:
                        {
                            "shouldStore": true/false,
                            "key": "short_descriptive_key",
                            "value": "the information to remember"
                        }
                        
                        If there's nothing worth remembering, return {"shouldStore": false}.
                        Return ONLY valid JSON, no other text.
                    `;
                    
                    const memoryResult = await chatModel.generateContent(memoryPrompt);
                    const memoryText = memoryResult.response.text();
                    
                    try {
                        // Clean and parse the JSON response
                        const cleanJson = memoryText.replace(/```json\n?|\n?```/g, '').trim();
                        const memoryData = JSON.parse(cleanJson);
                        
                        if (memoryData.shouldStore && memoryData.key && memoryData.value) {
                            storeUserMemory(userId, memoryData.key, memoryData.value);
                            console.log(`Stored memory: ${memoryData.key}`);
                        }
                    } catch (memoryError) {
                        console.error('Error processing memory:', memoryError);
                    }
                }
                
                // Generate a conversational response
                const conversationalResponse = await chatModel.generateResponse({
                    query,
                    type: 'conversation',
                    memories: userMemories
                });
                
                res.write(JSON.stringify({
                    status: "conversation",
                    data: conversationalResponse,
                    processingTime: Math.round(performance.now() - processingStartTime)
                }) + "\n");
                
                // Track total processing time for analytics
                const totalProcessingTime = Math.round(performance.now() - startTime);
                console.log(`Total processing time: ${totalProcessingTime}ms`);
                console.log(`Query analysis: ${queryAnalysis.intent?.primary || 'unknown'} (${queryAnalysis.intent?.confidence || 0})`);
                break;
            }
            
            default:
                res.write(JSON.stringify({
                    status: "unknown_type",
                    message: "I'm not sure how to handle this type of request.",
                    processingTime: Math.round(performance.now() - processingStartTime)
                }) + "\n");
            }
            
            res.end();
        } catch (innerError) {
            console.error('Error processing query:', innerError);
            res.write(JSON.stringify({
                status: "processing_error",
                message: "I encountered an issue while processing your request.",
                error: innerError.message
            }) + "\n");
            res.end();
        }
    } catch (error) {
        console.error('Error in /ask endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({
                status: "error",
                message: "An unexpected error occurred.",
                error: error.message
            });
        }
    }
});

// Streaming conversation endpoint for more responsive interactions
router.post("/conversation", async (req, res) => {
    try {
        const { query, conversationId } = req.body;
        const userId = req.user._id;

        // Apply rate limiting
        if (!checkRateLimit(userId)) {
            return res.status(429).json({
                error: "Rate limit exceeded. Please try again later."
            });
        }

        // Set response headers for streaming
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Cache-Control", "no-cache");

        // Get or create conversation history
        let conversation = conversationCache.get(conversationId);
        if (!conversation) {
            conversation = {
                id: conversationId || Date.now().toString(),
                userId,
                messages: [],
                createdAt: new Date()
            };
        }

        // Add user message to history
        conversation.messages.push({
            role: "user",
            content: query,
            timestamp: new Date()
        });

        // Retrieve any relevant memories
        const userMemories = getUserMemories(userId, query);

        // Check for unsupported features first
        const unsupportedFeature = queryUnderstanding.checkForUnsupportedFeatures(query);
        if (unsupportedFeature) {
            // Store this as a memory to avoid repeatedly explaining the same limitation
            storeUserMemory(userId, `unsupported_${unsupportedFeature.feature}`, {
                feature: unsupportedFeature.feature,
                lastAsked: new Date().toISOString()
            });

            // Add AI response to conversation history
            conversation.messages.push({
                role: "assistant",
                content: unsupportedFeature.message,
                timestamp: new Date()
            });

            // Update conversation cache
            conversationCache.set(conversation.id, conversation);
            setTimeout(() => conversationCache.delete(conversation.id), CONVERSATION_TTL);

            // Send the response
            res.write(unsupportedFeature.message);
            res.end();
            return;
        }

        // Build context-aware prompt
        const conversationContext = buildConversationPrompt(conversation, userMemories);

        // Stream the AI response
        try {
            // Process the conversation and stream the response
            const responseStream = streamAIResponse(conversationContext, true, userId);
            
            // Collect the AI response
            let aiResponseText = '';
            for await (const chunk of responseStream) {
                // Send each chunk to the client
                res.write(chunk);
                aiResponseText += chunk;
            }
            
            // Add AI response to conversation history
            conversation.messages.push({
                role: "assistant",
                content: aiResponseText,
                timestamp: new Date()
            });
            
            // Check if this conversation contains information we should remember
            const memoryIndicators = ['remember', 'don\'t forget', 'my preference', 'I prefer', 'I like', 'I don\'t like'];
            
            // If the query contains memory indicators, try to extract and store the memory
            if (memoryIndicators.some(indicator => query.toLowerCase().includes(indicator))) {
                const memoryPrompt = `
                    The user said: "${query}"
                    
                    If this contains a preference or important information that should be remembered for future interactions,
                    extract it in this format:
                    {
                        "shouldStore": true/false,
                        "key": "short_descriptive_key",
                        "value": "the information to remember"
                    }
                    
                    If there's nothing worth remembering, return {"shouldStore": false}.
                    Return ONLY valid JSON, no other text.
                `;
                
                try {
                    const memoryResult = await chatModel.generateContent(memoryPrompt);
                    const memoryText = memoryResult.response.text();
                    
                    // Clean and parse the JSON response
                    const cleanJson = memoryText.replace(/```json\n?|\n?```/g, '').trim();
                    const memoryData = JSON.parse(cleanJson);
                    
                    if (memoryData.shouldStore && memoryData.key && memoryData.value) {
                        storeUserMemory(userId, memoryData.key, memoryData.value);
                        console.log(`Stored memory: ${memoryData.key}`);
                    }
                } catch (memoryError) {
                    console.error('Error processing memory:', memoryError);
                }
            }
            
            // Update conversation cache
            conversationCache.set(conversation.id, conversation);
            setTimeout(() => conversationCache.delete(conversation.id), CONVERSATION_TTL);
            
            res.end();
        } catch (error) {
            console.error('Error in conversation streaming:', error);
            if (!res.headersSent) {
                res.write("I'm having trouble processing your request right now. Please try again later.");
                res.end();
            }
        }
    } catch (error) {
        console.error('Error in /conversation endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({
                status: "error",
                message: "An unexpected error occurred.",
                error: error.message
            });
        } else {
            res.write(JSON.stringify({
                status: "error",
                message: "An error occurred while processing your request.",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }) + "\n");
            res.end();
        }
    }
});

function formatPlanResponse (plan, analysis) {
    if (plan.status === "empty") {
        return {
            message: plan.message,
            suggestions: [
                "Create a new task",
                "What would you like to work on today?"
            ]
        };
    }

    if (plan.status === "error") {
        return {
            message: plan.message,
            suggestions: [
                "Try planning with fewer constraints",
                "Show me my tasks instead"
            ]
        };
    }

    // Create a formatted schedule display
    const schedule = plan.plan.timeBlocks.map(block => {
        return `${block.startTime} - ${block.endTime}: ${block.title}${block.notes ? ` (${block.notes})` : ''}`;
    }).join('\n');

    // Create a list of unscheduled tasks if any
    const unscheduled = plan.plan.unscheduled && plan.plan.unscheduled.length > 0
        ? "\n\nUnscheduled tasks:\n" + plan.plan.unscheduled.map(task =>
            `- ${task.title}`
        ).join('\n')
        : "";
    return `${plan.plan.summary}\n\nHere's your schedule:\n${schedule}${unscheduled}`
    // {
    // message: `${plan.plan.summary}\n\nHere's your schedule:\n${schedule}${unscheduled}`,
    // dayPlan: plan.plan, // Include structured data for UI rendering
    // suggestions: [
    //     "Adjust this plan",
    //     "Focus on high priority tasks only",
    //     "Show me what's due today"
    // ]
    // };
}

function formatPrioritizationResponse (result, analysis) {
    if (result.status === "empty") {
        return {
            message: result.message,
            suggestions: [
                "Create a new task",
                "What would you like to work on today?"
            ]
        };
    }

    if (result.status === "error") {
        return {
            message: result.message,
            suggestions: [
                "Try prioritizing with fewer constraints",
                "Show me my tasks instead"
            ]
        };
    }

    // Return the AI's response directly without additional formatting
    // This allows our prompt template to fully control the format
    return result.content || result.text || result.message || result.prioritizedTasks.summary
}

// Enhanced streaming response function with error handling and performance tracking
async function * streamAIResponse (prompt, hasContext = true, userId) {
    try {
        const startTime = performance.now();
        console.log("Processing streaming request for prompt:", prompt.substring(0, 100) + "...");

        // Create a more contextual prompt for better responses
        const finalPrompt = hasContext
            ? prompt
            : `The user has asked: "${prompt}"
Please respond as March, being helpful, concise, and human-like.`;

        // Use the streaming API for faster initial response time
        const result = await chatModel.generateContentStream(finalPrompt);

        // Stream each chunk as it arrives
        for await (const chunk of result.stream) {
            yield chunk.text();
        }

        const processingTime = performance.now() - startTime;
        console.log(`Streaming response completed in ${processingTime.toFixed(2)}ms`);
    } catch (error) {
        console.error("Error in streaming response:", error);

        // Provide graceful fallback responses
        if (error.message.includes('503') || error.message.includes('overloaded')) {
            yield "I'm experiencing high load right now. Please try again in a moment.";
            return;
        }

        yield "I encountered an issue processing your request. Please try again or rephrase your question.";
    }
}

router.get("/conversation", async (req, res) => {
    try {
        const { query, conversationId } = req.query;
        const userId = req.user._id;
        
        // Apply rate limiting for security
        if (!checkRateLimit(userId)) {
            return res.status(429).json({
                error: "Rate limit exceeded. Please try again later."
            });
        }
        
        // Retrieve any relevant memories for this user and query
        const userMemories = getUserMemories(userId, query);

        // Set headers for streaming response
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Get or create conversation history
        let conversationHistory = [];
        if (conversationId && conversationCache.has(conversationId)) {
            conversationHistory = conversationCache.get(conversationId);
        }

        // Add current query to history
        conversationHistory.push({ role: 'user', content: query });

        // Create a context-aware prompt with conversation history and user memories
        let memoryContext = '';
        if (userMemories.length > 0) {
            memoryContext = `
                User memories that may be relevant:
                ${userMemories.map(mem => `- ${mem.key}: ${mem.value}`).join('\n')}
            `;
        }
        
        const contextPrompt = `
            ${conversationHistory.length > 1 ? 'Previous conversation:' : ''}
            ${conversationHistory.slice(0, -1).map(msg => `${msg.role === 'user' ? 'User' : 'March'}: ${msg.content}`).join('\n')}
            
            ${memoryContext}
            
            Current query: "${query}"
            
            Respond as March, a helpful AI assistant. Be conversational, helpful, and concise.
            If you don't know something, be honest about it.
            Format your response in a clear, readable way.
            If the user's query relates to any of their stored memories, incorporate that information naturally in your response.
        `;

        // Generate streaming response
        const stream = streamAIResponse(contextPrompt, true, userId);
        let responseContent = '';

        // Stream each chunk to the client
        for await (const chunk of stream) {
            responseContent += chunk;
            res.write(chunk);
        }

        // Add AI response to conversation history
        conversationHistory.push({ role: 'assistant', content: responseContent });
        
        // Check if this conversation contains information we should remember
        const memoryIndicators = ['remember', 'don\'t forget', 'my preference', 'I prefer', 'I like', 'I don\'t like'];
        
        // If the query contains memory indicators, try to extract and store the memory
        if (memoryIndicators.some(indicator => query.toLowerCase().includes(indicator.toLowerCase()))) {
            // Extract key information to remember
            const memoryPrompt = `
                The user said: "${query}"
                
                If this contains a preference or important information that should be remembered for future interactions,
                extract a key-value pair in JSON format like this: {"key": "short_descriptor", "value": "detailed_information"}
                
                If there's nothing important to remember, return {"key": null, "value": null}
            `;
            
            try {
                const memoryResult = await chatModel.generateContent(memoryPrompt);
                const memoryText = memoryResult.response.text();
                const memoryMatch = memoryText.match(/\{[\s\S]*\}/);
                
                if (memoryMatch) {
                    const memory = JSON.parse(memoryMatch[0]);
                    if (memory.key && memory.value) {
                        storeUserMemory(userId, memory.key, memory.value);
                        console.log(`Stored memory for user ${userId}: ${memory.key} = ${memory.value}`);
                    }
                }
            } catch (memoryError) {
                console.error('Error extracting memory:', memoryError);
            }
        }

        // Trim conversation history to prevent context overflow
        if (conversationHistory.length > 10) {
            conversationHistory = conversationHistory.slice(-10);
        }

        // Store or update conversation in cache
        const newConversationId = conversationId || `conv_${userId}_${Date.now()}`;
        conversationCache.set(newConversationId, conversationHistory);

        // Set expiration for conversation
        setTimeout(() => conversationCache.delete(newConversationId), CONVERSATION_TTL);

        // End response
        res.end();
    } catch (error) {
        console.error('Error in conversation endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        } else {
            res.end('\n\nI encountered an error processing your request. Please try again.');
        }
    }
});

router.post("/content", async (req, res) => {
    try {
        const data = req.body;
        if (!data) {
            return res.status(400).json({ error: "Content is required" });
        }
        const object = await Object.create({ user: req.user._id, ...data });
        const savedContent = await saveContent(object);
        res.status(201).json({ message: "Content saved successfully", savedContent, object });
    } catch (error) {
        console.error("Error saving content:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/sync", async (req, res) => {
    console.log("Syncing content...");
    try {
        const userId = req.user._id;
        const objects = await Object.find({
            user: userId,
            isDeleted: false
        });

        console.log("Objects to sync:", objects.length);

        await Promise.all(objects.map(saveContent));

        res.json({ message: "Sync completed", count: objects.length });
    } catch (error) {
        console.error("Sync error:", error);
        res.status(500).json({
            error: "Failed to sync content",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;
