// here im using sec-websocket
import { WebSocketServer, WebSocket } from "ws";
import { verifyJWTToken, generateJWTToken } from "../utils/jwt.service.js";
import { BlackList } from "../models/core/black-list.model.js";
import { getUserById } from "../services/core/user.service.js";
import { VoiceRecognitionService } from "../services/ai/voice-recognition.service.js";
import { environment } from "../loaders/environment.loader.js";

const userConnections = new Map();
const userVoiceStates = new Map(); // Store voice conversation states

// Generate immediate acknowledgment based on user input
const generateAcknowledgment = (userInput) => {
  const input = userInput.toLowerCase().trim();
  
  // Task creation patterns
  if (input.includes('create') && (input.includes('task') || input.includes('todo'))) {
    return "Got it! Let me create that task for you...";
  }
  if (input.includes('add') && (input.includes('task') || input.includes('todo'))) {
    return "Sure thing! Adding that to your tasks...";
  }
  if (input.includes('remind') || input.includes('reminder')) {
    return "Absolutely! Setting up that reminder...";
  }
  
  // Meeting/calendar patterns
  if (input.includes('schedule') || input.includes('meeting') || input.includes('appointment')) {
    return "Perfect! Let me schedule that for you...";
  }
  if (input.includes('calendar') || input.includes('event')) {
    return "On it! Working with your calendar...";
  }
  
  // Search/find patterns
  if (input.includes('find') || input.includes('search') || input.includes('show me')) {
    return "Let me search for that...";
  }
  if (input.includes('what') || input.includes('how') || input.includes('when')) {
    return "Good question! Let me check that for you...";
  }
  
  // General patterns
  if (input.includes('help') || input.includes('assist')) {
    return "I'm here to help! Let me see what I can do...";
  }
  if (input.includes('tell me') || input.includes('explain')) {
    return "Sure! Let me explain that...";
  }
  
  // Default acknowledgments
  const defaultAcknowledgments = [
    "Got it! Working on that...",
    "Sure thing! Let me help with that...",
    "Absolutely! Give me just a moment...",
    "On it! Processing your request...",
    "Perfect! Let me take care of that..."
  ];
  
  return defaultAcknowledgments[Math.floor(Math.random() * defaultAcknowledgments.length)];
};

// Voice message handler
const handleVoiceMessage = async (ws, user, message) => {
    const userId = user.id;

    try {
        switch (message.type) {
        case "voice_start_conversation":
        // Initialize voice conversation state
            userVoiceStates.set(userId, {
                conversationActive: true,
                conversationHistory: [],
                startTime: new Date()
            });

            const welcomeMessage =
          "Hi! I'm listening. You can talk to me naturally - this is a real-time conversation!";

            // Add to conversation history
            const voiceState = userVoiceStates.get(userId);
            voiceState.conversationHistory.push({
                role: "assistant",
                content: welcomeMessage,
                timestamp: new Date()
            });

            ws.send(
                JSON.stringify({
                    type: "voice_conversation_started",
                    message: welcomeMessage,
                    shouldSpeak: true
                })
            );

            console.log(`Started voice conversation for user: ${userId}`);
            break;

        case "voice_stop_conversation":
            const goodbyeMessage =
          "Goodbye! Feel free to start a new conversation anytime.";

            if (userVoiceStates.has(userId)) {
                const state = userVoiceStates.get(userId);
                state.conversationActive = false;
                state.conversationHistory.push({
                    role: "assistant",
                    content: goodbyeMessage,
                    timestamp: new Date()
                });
            }

            ws.send(
                JSON.stringify({
                    type: "voice_conversation_ended",
                    message: goodbyeMessage,
                    shouldSpeak: true
                })
            );

            userVoiceStates.delete(userId);
            console.log(`Stopped voice conversation for user: ${userId}`);
            break;

        case "voice_text_input":
            await processVoiceInput(ws, user, message.text);
            break;

        case "voice_ping":
            ws.send(JSON.stringify({ type: "voice_pong" }));
            break;

        default:
            ws.send(
                JSON.stringify({
                    type: "voice_error",
                    message: `Unknown voice message type: ${message.type}`
                })
            );
        }
    } catch (error) {
        console.error("Voice message handling error:", error);
        ws.send(
            JSON.stringify({
                type: "voice_error",
                message: "Failed to process voice message"
            })
        );
    }
};

// Process voice input
const processVoiceInput = async (ws, user, userInput) => {
    const userId = user.id;
    const voiceState = userVoiceStates.get(userId);

    if (!voiceState || !voiceState.conversationActive) {
        ws.send(
            JSON.stringify({
                type: "voice_error",
                message: "Conversation not active"
            })
        );
        return;
    }

    // Check for stop commands
    const lowerInput = userInput.toLowerCase().trim();
    if (
        lowerInput.includes("stop") ||
    lowerInput.includes("goodbye") ||
    lowerInput.includes("bye") ||
    lowerInput.includes("end conversation") ||
    lowerInput.includes("turn off")
    ) {
        await handleVoiceMessage(ws, user, { type: "voice_stop_conversation" });
        return;
    }

    // Add user message to history
    voiceState.conversationHistory.push({
        role: "user",
        content: userInput,
        timestamp: new Date()
    });

    // Send user message confirmation
    ws.send(
        JSON.stringify({
            type: "voice_user_message",
            text: userInput,
            timestamp: new Date()
        })
    );

    // Send immediate acknowledgment with voice feedback
    const acknowledgment = generateAcknowledgment(userInput);
    ws.send(
        JSON.stringify({
            type: "voice_immediate_response",
            text: acknowledgment,
            shouldSpeak: true,
            timestamp: new Date()
        })
    );

    // Send processing indicator
    ws.send(
        JSON.stringify({
            type: "voice_processing",
            message: "Processing your request..."
        })
    );

    try {
    // Generate a service token for internal API calls
        const serviceToken = await generateJWTToken(
            {
                id: user.uuid,
                email:
          user.accounts?.local?.email ||
          user.accounts?.google?.email ||
          user.email,
                name: user.fullName || user.userName,
                type: "service",
                roles: user.roles || []
            },
            "1h"
        );

        // Call the intelligent AI endpoint internally (same as regular chat)
        const intelligentResponse = await fetch(
            "http://localhost:8080/ai/intelligent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${serviceToken}`
                },
                body: JSON.stringify({
                    query: userInput
                })
            }
        );

        if (!intelligentResponse.ok) {
            throw new Error(
                `Intelligent AI API error: ${intelligentResponse.status}`
            );
        }

        // Handle streaming response from intelligent AI
        const reader = intelligentResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        
                        // Send progress updates for different statuses
                        if (data.status === "thinking") {
                            ws.send(JSON.stringify({
                                type: "voice_progress_update",
                                text: "Thinking about your request...",
                                shouldSpeak: false,
                                timestamp: new Date()
                            }));
                        } else if (data.status === "processing") {
                            ws.send(JSON.stringify({
                                type: "voice_progress_update", 
                                text: data.message || "Processing...",
                                shouldSpeak: false,
                                timestamp: new Date()
                            }));
                        } else if (data.status === "executing") {
                            ws.send(JSON.stringify({
                                type: "voice_progress_update",
                                text: "Executing your request...",
                                shouldSpeak: false,
                                timestamp: new Date()
                            }));
                        }
                        
                        if (
                            data.status === "completed" ||
                            data.status === "conversational"
                        ) {
                            finalResult = data;
                        }
                    } catch (e) {
                        console.warn("Failed to parse streaming response:", line);
                    }
                }
            }
        }

        let assistantMessage;
        let assistantResult;

        if (finalResult) {
            // Use the actual message from the intelligent AI response
            assistantMessage =
        finalResult.message ||
        finalResult.data?.response ||
        "I'm here to help!";
            assistantResult = {
                success: true,
                data: finalResult.data
            };
        } else {
            assistantMessage = "I'm here to help! How can I assist you today?";
            assistantResult = {
                success: false,
                data: null,
                error: "No final result from intelligent AI"
            };
        }

        // Add to conversation history
        voiceState.conversationHistory.push({
            role: "assistant",
            content: assistantMessage,
            timestamp: new Date()
        });

        // Send AI response
        ws.send(
            JSON.stringify({
                type: "voice_ai_response",
                text: assistantMessage,
                shouldSpeak: true, // Always speak voice responses
                timestamp: new Date(),
                metadata: assistantResult.data || {}
            })
        );

        console.log(
            `Processed voice input for user ${userId}: "${userInput}" -> "${assistantMessage}"`
        );
    } catch (error) {
        console.error("AI processing error:", error);

        const errorMessage = "I'm sorry, I didn't catch that. Could you try again?";

        voiceState.conversationHistory.push({
            role: "assistant",
            content: errorMessage,
            timestamp: new Date()
        });

        ws.send(
            JSON.stringify({
                type: "voice_ai_response",
                text: errorMessage,
                shouldSpeak: true,
                timestamp: new Date(),
                isError: true
            })
        );
    }
};

const initializeWebSocket = (server) => {
    const wss = new WebSocketServer({
        server
    });

    wss.on("connection", async (ws, req) => {
        try {
            const token = req.headers["sec-websocket-protocol"];
            if (!token) {
                ws.close(4000, "Authorization token is required");
                return;
            }

            const checkIfBlacklisted = await BlackList.findOne({ token });
            if (checkIfBlacklisted) {
                ws.close(4001, "This token has expired. Please login");
                return;
            }

            const payload = await verifyJWTToken(token);
            const user = await getUserById(payload.id);
            if (!user) {
                ws.close(4002, "Invalid user");
                return;
            }

            console.log(`WebSocket connection established for user: ${user.id}`);

            // Close existing connection for the user
            if (userConnections.has(user.id)) {
                const existingWs = userConnections.get(user.id);
                if (existingWs.readyState === WebSocket.OPEN) {
                    existingWs.close();
                }
                userConnections.delete(user.id);
            }

            userConnections.set(user.id, ws);
            // userConnections.set(user.id, ws);
            console.log(`New WebSocket connection added for user: ${user.id}`);

            // Heartbeat mechanism
            let isAlive = true;
            ws.on("pong", () => {
                console.log(`Received pong from user: ${user.id}`);
                isAlive = true;
            });

            const pingInterval = setInterval(() => {
                if (!isAlive) {
                    console.log(`Terminating connection for user: ${user.id}`);
                    ws.terminate();
                    clearInterval(pingInterval);
                    userConnections.delete(user.id);
                    return;
                }
                isAlive = false;
                ws.ping();
                console.log(`Sent ping to user: ${user.id}`);
            }, 30000); // Ping every 30 seconds
            ws.on("error", (error) => {
                console.error(`WebSocket error for user ${user.id}:`, error.message);
            });

            ws.on("message", async (data, isBinary) => {
                try {
                    const message = JSON.parse(data.toString());

                    if (message.type === "ping") {
                        console.log(`Received ping from user: ${user.id}`);
                        ws.send(JSON.stringify({ type: "pong" })); // Respond with pong
                    } else if (message.type && message.type.startsWith("voice_")) {
                        // Handle voice chat messages
                        await handleVoiceMessage(ws, user, message);
                    }
                } catch (err) {
                    console.error(`Failed to parse message: ${err.message}`);
                }
            });

            ws.on("close", () => {
                console.log(`WebSocket connection closed for user: ${user.id}`);
                clearInterval(pingInterval); // Stop pinging on close
                userConnections.delete(user.id);
                userVoiceStates.delete(user.id); // Clean up voice state
            });

            ws.send(
                JSON.stringify({
                    type: "welcome",
                    message: "WebSocket connection established."
                })
            );
        } catch (error) {
            console.error("WebSocket authentication error:", error.message);
            ws.close(4003, "Unauthorized");
        }
    });
};

// const broadcastToUser = (userId, data, isBinary = false) => {
//     console.log(`Broadcasting to user: ${userId}`);
//     const ws = userConnections.get(userId.toString());
//     if (!ws) {
//         console.error(`WebSocket connection for user ${userId} not found.`);
//         return;
//     }
//     if (ws.readyState !== WebSocket.OPEN) {
//         console.error(`WebSocket for user ${userId} is not open.`);
//         userConnections.delete(userId);
//         return;
//     }

//     const message = isBinary
//         ? Buffer.from(JSON.stringify(data), "utf-8")
//         : JSON.stringify(data);

//     ws.send(message, { binary: isBinary });
//     // console.log(`Message sent to user ${userId}:`, data);
// };

const broadcastToUser = (userId, data, isBinary = false) => {
    // console.log(`Broadcasting to user: ${userId}`);

    const ws = userConnections.get(userId.toString());
    if (!ws) {
        console.error(`WebSocket connection for user ${userId} not found.`);
        return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
        console.error(`WebSocket for user ${userId} is not open.`);
        userConnections.delete(userId); // Remove inactive connection
        return;
    }

    let message;
    try {
        if (isBinary) {
            // If binary data is expected
            if (Buffer.isBuffer(data)) {
                message = data; // Already a Buffer, use as is
            } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
                message = Buffer.from(data); // Convert ArrayBuffer or typed array to Buffer
            } else if (typeof data === "object") {
                message = Buffer.from(JSON.stringify(data), "utf-8"); // Serialize object to JSON and convert to Buffer
            } else {
                throw new TypeError(
                    "Invalid data type for binary broadcast. Must be Buffer, ArrayBuffer, or serializable object."
                );
            }
        } else {
            // For text data
            message = typeof data === "object" ? JSON.stringify(data) : data;
        }

        ws.send(message, { binary: isBinary });
    // console.log(`Message sent to user ${userId}:`, isBinary ? "[Binary Data]" : data);
    } catch (error) {
        console.error(`Failed to send message to user ${userId}:`, error.message);
    }
};

export { initializeWebSocket, broadcastToUser };
