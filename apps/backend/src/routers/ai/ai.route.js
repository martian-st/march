import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Object } from "../../models/lib/object.model.js";
import { SYSTEM_PROMPT } from "../../prompts/system.prompt.js";
import { saveContent, SearchHandler, pineconeIndex, DayPlanner, PrioritizationHandler } from "../../utils/helper.service.js";
import { QueryUnderstanding } from "../../utils/query.service.js";
import { createObjectFromAI } from "../../controllers/lib/object.controller.js";
import enhancedAIRouter from "./enhanced-ai.route.js";

const router = Router();

// Mount enhanced AI routes
router.use("/enhanced", enhancedAIRouter);

export const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Configure chat model
const chatModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048
    },
    systemInstruction: SYSTEM_PROMPT
});

chatModel.generateResponse = async function (context) {
    if (context.results) {
        const prompt = `
            The user searched for: "${context.query}"
            Here are the search results:
            ${JSON.stringify(context.results)}
            
            Please provide a helpful, natural language response that summarizes these results.
            If there are no results, explain that nothing was found.
            If there are results, highlight key information like titles, priorities, and due dates.
        `;

        const result = await this.generateContent(prompt);
        return result.response.text();
    }
    // TODO: improve this
    // else if (context.type === 'day_planning') {
    //     const prompt = `
    //         The user requested day planning with: "${context.query}"
    //         Here is the generated plan:
    //         ${JSON.stringify(context.plan)}

    //         Please provide a helpful, natural language response that presents this plan.
    //         Highlight key tasks, meetings, and priorities for the day.
    //     `;

    //     const result = await this.generateContent(prompt);
    //     return result.response.text();
    // }
};
const queryUnderstanding = new QueryUnderstanding(chatModel);

router.get("/ask", async (req, res) => {
    try {
        const { query } = req.query;
        const userId = req.user._id;

        // Set response headers for streaming
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Transfer-Encoding", "chunked");

        // Analyze the query
        const queryAnalysis = await queryUnderstanding.analyzeQuery(query, userId);
        const searchHandler = new SearchHandler(pineconeIndex);
        const dayPlanner = new DayPlanner(searchHandler, chatModel);
        const prioritizationHandler = new PrioritizationHandler(searchHandler, chatModel);

        console.log("Query Analysis:", queryAnalysis);

        switch (queryAnalysis.type) {
        case 'creation':
            // eslint-disable-next-line no-case-declarations
            const createdObject = await createObjectFromAI(queryAnalysis.data, userId);
            res.write(JSON.stringify({ status: "completed", data: createdObject }) + "\n");
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
                data: aiResponse
            }) + "\n");
            break;

        case 'day_planning': // New case
            // eslint-disable-next-line no-case-declarations
            const plan = await dayPlanner.planDay(userId, queryAnalysis.parameters);
            // return formatPlanResponse(plan, queryAnalysis);
            res.write(JSON.stringify({
                status: "plan",
                data: formatPlanResponse(plan, queryAnalysis)

            }));
            break;

        case 'prioritization':
            // eslint-disable-next-line no-case-declarations
            const prioritizationResult = await prioritizationHandler.prioritizeTasks(
                userId,
                queryAnalysis.parameters
            );
            if (prioritizationResult.status === "success") {
                // eslint-disable-next-line no-case-declarations
                const prioritizationResponse = await chatModel.generateResponse({
                    query,
                    plan: prioritizationResult.prioritizedTasks,
                    parameters: queryAnalysis.parameters
                });

                res.write(JSON.stringify({
                    status: "prioritized",
                    data: formatPrioritizationResponse({
                        status: "success",
                        prioritizedTasks: prioritizationResult.prioritizedTasks
                    }, queryAnalysis)
                }) + "\n");
            } else {
                res.write(JSON.stringify({
                    status: prioritizationResult.status,
                    data: formatPrioritizationResponse(prioritizationResult, queryAnalysis)
                }) + "\n");
            }
            break;

        case 'conversation':
            res.write(JSON.stringify({ status: "conversation", data: queryAnalysis.response }) + "\n");
            break;
        }

        // End the streaming response
        res.end();
    } catch (error) {
        res.write(JSON.stringify({ status: "error", message: error.message }) + "\n");
        res.end();
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

    const prioritizedList = result.prioritizedTasks.prioritizedTasks.map(task => {
        return `${task.rank}. ${task.title} - ${task.rationale}`;
    }).join('\n');

    return `${result.prioritizedTasks.summary}\n\nPrioritized tasks:\n${prioritizedList}`
}
async function * streamAIResponse (prompt, hasContext = true, userId) {
    try {
        console.log("Prompt: ", prompt);
        const finalPrompt = hasContext
            ? prompt
            : `The user has asked: "${prompt}"\nPlease respond as March`;

        const result = await chatModel.generateContentStream(finalPrompt);
        for await (const chunk of result.stream) {
            yield chunk.text();
        }
    } catch (error) {
        if (error.message.includes('503') || error.message.includes('overloaded')) {
            yield "I'm experiencing high load right now. Please try again in a moment.";
            return;
        }
        throw error;
    }
}

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

// async function * streamAIResponse (prompt, hasContext = true, userId) {
//     try {
//         if (isObjectCreationIntent(prompt)) {
//             console.log("Creating object from AI:", prompt);
//             const creationPrompt = `
//             Parse this request: "${prompt}"
//             Analyze the text for any date/time references including:
//             - Explicit dates (tomorrow, today, next week, next month)
//             - Time references (after school, this evening, tonight)
//             - Day references (on Monday, this Sunday)
//             - Relative dates (in 2 days, in a week)

//             Create a task with these details in JSON format:

//             {
//                 "title": "Clear, specific title",
//                 "description": "Detailed description of the task",
//                 "type": "todo",
//                 "status": "null",
//                 "dueDate": null // Format rules:
//                 // 1. For "today" -> current date in YYYY-MM-DD
//                 // 2. For "tomorrow" -> next day in YYYY-MM-DD
//                 // 3. For days of week -> next occurrence in YYYY-MM-DD
//                 // 4. For "after school" -> current date + default time 3:00 PM
//                 // 5. For relative dates -> calculated date in YYYY-MM-DD
//                 // 6. If no date mentioned -> null
//             }

//             Examples of date parsing:
//             Input: "buy milk after school" -> dueDate: "2024-02-06T15:00:00Z"
//             Input: "go to gym tomorrow" -> dueDate: "2024-02-07"
//             Input: "submit report next Monday" -> dueDate: "2024-02-12"
//             Input: "call mom in 3 days" -> dueDate: "2024-02-09"
//             Input: "do homework tonight" -> dueDate: "2024-02-06T19:00:00Z"
//             Input: "buy groceries" -> dueDate: null

//             Extract the task details and create a clear title and description. Set the dueDate based on the date/time references found in the text. Only respond with valid JSON, no other text.
//             `;

//             try {
//                 const result = await chatModel.generateContent(creationPrompt);
//                 const responseText = result.response.text();
//                 let objectData;
//                 try {
//                     objectData = JSON.parse(responseText.trim());
//                 } catch (parseError) {
//                     console.error("JSON Parse Error:", parseError);
//                     const jsonMatch = responseText.match(/\{[\s\S]*\}/);
//                     if (jsonMatch) {
//                         objectData = JSON.parse(jsonMatch[0]);
//                     } else {
//                         throw parseError;
//                     }
//                 }

//                 // Create default object if parsing failed
//                 if (!objectData || !objectData.title) {
//                     objectData = {
//                         title: prompt.replace(/create\s+(a|an)\s+(task|note|todo)/i, '').trim(),
//                         description: "Task created from user request",
//                         type: "todo",
//                         status: "null"
//                     };
//                 }

//                 const createdObject = await createObjectFromAI({
//                     ...objectData,
//                     originalQuery: prompt
//                 }, userId);

//                 // Yield creation confirmation
//                 yield `✓ Created new task:\n\n`;
//                 yield `Title: ${createdObject.title}\n`;
//                 yield `Description: ${createdObject.description}\n`;
//                 if (createdObject.dueDate) {
//                     yield `Due Date: ${new Date(createdObject.dueDate).toLocaleDateString()}\n`;
//                 }
//                 yield `\nTask saved successfully. I can help you find or update it later.`;
//                 return;
//             } catch (error) {
//                 console.error("Error in object creation:", error);
//                 yield "I understood you wanted to create a task, but encountered an issue. Please try again with more details.";
//                 return;
//             }
//         }

//         const finalPrompt = hasContext
//             ? prompt
//             : `The user has asked: "${prompt}"\nPlease respond as March`;

//         const result = await chatModel.generateContentStream(finalPrompt);
//         for await (const chunk of result.stream) {
//             yield chunk.text();
//         }
//     } catch (error) {
//         if (error.message.includes('503') || error.message.includes('overloaded')) {
//             yield "I'm experiencing high load right now. Please try again in a moment.";
//             return;
//         }
//         throw error;
//     }
// }

// router.get("/ask", async (req, res) => {
//     try {
//         const { query } = req.query;
//         const userId = req.user._id;

//         if (!query?.trim()) {
//             return res.status(400).json({ error: "Query is required" });
//         }
//         res.setHeader('Content-Type', 'text/event-stream');
//         res.setHeader('Cache-Control', 'no-cache');
//         res.setHeader('Connection', 'keep-alive');

//         const relevantContent = await searchContent(query, userId, { limit: 5 });
//         console.log("Relevant Content Found:", relevantContent);

//         if (relevantContent.length === 0) {
//             const stream = streamAIResponse(query, false, userId);
//             for await (const chunk of stream) {
//                 console.log("hey saju: ", chunk);
//                 res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
//             }
//             res.write(`data: ${JSON.stringify({
//                 done: true,
//                 hasStoredContent: false,
//                 suggestion: "Try saving some information or creating new tasks to get started"
//             })}\n\n`);
//             return res.end();
//         }

//         const context = formatContextForAI(relevantContent);
//         const prompt = `Based on the following information:\n${context}\nQuestion: "${query}"\nPlease provide a helpful response.`;

//         const stream = streamAIResponse(prompt, true, userId);
//         console.log("stream in line number 1473, ", stream);
//         for await (const chunk of stream) {
//             res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
//         }

//         res.write(`data: ${JSON.stringify({
//             done: true,
//             hasStoredContent: true,
//             relevantContent: relevantContent.map(({ title, type, score }) => ({
//                 title,
//                 type,
//                 relevance: score
//             }))
//         })}\n\n`);

//         return res.end();
//     } catch (error) {
//         console.error("Error in /ask route:", error);
//         res.write(`data: ${JSON.stringify({
//             error: "An error occurred while processing your request",
//             details: process.env.NODE_ENV === 'development' ? error.message : undefined
//         })}\n\n`);
//         return res.end();
//     }
// });

export default router;
