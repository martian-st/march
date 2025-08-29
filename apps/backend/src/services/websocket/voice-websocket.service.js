import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { enhancedIntelligentAIService } from '../ai/enhanced-intelligent-ai.service.js';
import { VoiceRecognitionService } from '../ai/voice-recognition.service.js';

// Initialize voice recognition service
const voiceRecognitionService = new VoiceRecognitionService(process.env.GOOGLE_AI_API_KEY);

class VoiceWebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // Store client sessions
    }

    initialize(server) {
        this.wss = new WebSocketServer({ 
            server,
            path: '/voice-chat'
        });

        this.wss.on('connection', (ws, request) => {
            console.log('New voice WebSocket connection');
            
            // Extract token from query params or headers
            const url = new URL(request.url, `http://${request.headers.host}`);
            const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                ws.close(1008, 'Authentication required');
                return;
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const clientId = decoded.userId || decoded.id;
                
                // Store client session
                this.clients.set(ws, {
                    id: clientId,
                    userId: decoded.userId,
                    conversationActive: false,
                    conversationHistory: []
                });

                console.log(`Voice WebSocket authenticated for user: ${clientId}`);
                
                // Send connection confirmation
                ws.send(JSON.stringify({
                    type: 'connected',
                    message: 'Voice chat connected successfully'
                }));

                // Handle messages
                ws.on('message', async (data) => {
                    try {
                        await this.handleMessage(ws, JSON.parse(data.toString()));
                    } catch (error) {
                        console.error('Error handling WebSocket message:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Failed to process message'
                        }));
                    }
                });

                // Handle disconnection
                ws.on('close', () => {
                    console.log(`Voice WebSocket disconnected for user: ${clientId}`);
                    this.clients.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error('Voice WebSocket error:', error);
                    this.clients.delete(ws);
                });

            } catch (error) {
                console.error('Voice WebSocket authentication failed:', error);
                ws.close(1008, 'Invalid token');
            }
        });

        console.log('Voice WebSocket server initialized');
    }

    async handleMessage(ws, message) {
        const client = this.clients.get(ws);
        if (!client) return;

        console.log('Received voice WebSocket message:', message.type);

        switch (message.type) {
            case 'start_conversation':
                await this.startConversation(ws, client);
                break;
                
            case 'stop_conversation':
                await this.stopConversation(ws, client);
                break;
                
            case 'voice_data':
                await this.processVoiceData(ws, client, message.data);
                break;
                
            case 'text_input':
                await this.processTextInput(ws, client, message.text);
                break;

            case 'confirmation_response':
                await this.processConfirmationResponse(ws, client, message.response, message.confirmationData);
                break;

            case 'recovery_choice':
                await this.processRecoveryChoice(ws, client, message.choice, message.recoveryOptions);
                break;
                
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
                
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Unknown message type: ${message.type}`
                }));
        }
    }

    async startConversation(ws, client) {
        client.conversationActive = true;
        client.conversationHistory = [];
        
        const welcomeMessage = "Hi! I'm listening. You can talk to me naturally - this is a real-time conversation!";
        
        // Add to conversation history
        client.conversationHistory.push({
            role: 'assistant',
            content: welcomeMessage,
            timestamp: new Date()
        });

        ws.send(JSON.stringify({
            type: 'conversation_started',
            message: welcomeMessage,
            shouldSpeak: true
        }));

        console.log(`Started voice conversation for user: ${client.id}`);
    }

    async stopConversation(ws, client) {
        client.conversationActive = false;
        
        const goodbyeMessage = "Goodbye! Feel free to start a new conversation anytime.";
        
        client.conversationHistory.push({
            role: 'assistant',
            content: goodbyeMessage,
            timestamp: new Date()
        });

        ws.send(JSON.stringify({
            type: 'conversation_ended',
            message: goodbyeMessage,
            shouldSpeak: true
        }));

        console.log(`Stopped voice conversation for user: ${client.id}`);
    }

    async processVoiceData(ws, client, voiceData) {
        if (!client.conversationActive) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Conversation not active'
            }));
            return;
        }

        try {
            // Process voice data (assuming it's base64 encoded audio)
            const transcript = await voiceRecognitionService.transcribeAudio(voiceData);
            
            if (!transcript || transcript.trim().length === 0) {
                return; // Ignore empty transcripts
            }

            await this.processUserInput(ws, client, transcript);
            
        } catch (error) {
            console.error('Voice processing error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process voice input'
            }));
        }
    }

    async processTextInput(ws, client, text) {
        if (!client.conversationActive) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Conversation not active'
            }));
            return;
        }

        await this.processUserInput(ws, client, text);
    }

    async processUserInput(ws, client, userInput) {
        // Check for stop commands
        const lowerInput = userInput.toLowerCase().trim();
        if (lowerInput.includes('stop') || 
            lowerInput.includes('goodbye') || 
            lowerInput.includes('bye') ||
            lowerInput.includes('end conversation') ||
            lowerInput.includes('turn off')) {
            
            await this.stopConversation(ws, client);
            return;
        }

        // Add user message to history
        client.conversationHistory.push({
            role: 'user',
            content: userInput,
            timestamp: new Date()
        });

        // Send user message confirmation
        ws.send(JSON.stringify({
            type: 'user_message',
            text: userInput,
            timestamp: new Date()
        }));

        // Send processing indicator
        ws.send(JSON.stringify({
            type: 'processing',
            message: 'Processing your message...'
        }));

        try {
            // For now, continue using the existing approach but with enhanced context
            // TODO: Integrate with enhanced voice processing in future iteration
            const response = await enhancedIntelligentAIService.processVoiceCommand({
                transcribedText: userInput,
                context: {
                    source: 'realtime_voice',
                    conversationMode: true,
                    conversationHistory: client.conversationHistory.slice(-10),
                    voiceEnhanced: true // Flag for enhanced voice processing
                }
            });

            if (response.success) {
                const assistantMessage = response.data.voiceResponse.text;
                
                // Add to conversation history
                client.conversationHistory.push({
                    role: 'assistant',
                    content: assistantMessage,
                    timestamp: new Date()
                });

                // Send AI response
                ws.send(JSON.stringify({
                    type: 'ai_response',
                    text: assistantMessage,
                    shouldSpeak: response.data.voiceResponse.shouldSpeak,
                    timestamp: new Date(),
                    metadata: response.data.metadata || {}
                }));

                console.log(`Processed voice input for user ${client.id}: "${userInput}" -> "${assistantMessage}"`);
            } else {
                throw new Error(response.error || 'Failed to process input');
            }

        } catch (error) {
            console.error('AI processing error:', error);
            
            const errorMessage = "I'm sorry, I didn't catch that. Could you try again?";
            
            client.conversationHistory.push({
                role: 'assistant',
                content: errorMessage,
                timestamp: new Date()
            });

            ws.send(JSON.stringify({
                type: 'ai_response',
                text: errorMessage,
                shouldSpeak: true,
                timestamp: new Date(),
                isError: true
            }));
        }
    }

    // Broadcast to all connected clients (if needed)
    broadcast(message) {
        this.clients.forEach((client, ws) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
    }

    // Send message to specific user
    sendToUser(userId, message) {
        this.clients.forEach((client, ws) => {
            if (client.userId === userId && ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
    }

    async processConfirmationResponse(ws, client, userResponse, confirmationData) {
        if (!client.conversationActive) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Conversation not active'
            }));
            return;
        }

        try {
            const confirmationResult = voiceRecognitionService.processConfirmationResponse(userResponse, confirmationData);
            
            if (confirmationResult.confirmed === true) {
                // Send processing indicator
                ws.send(JSON.stringify({
                    type: 'processing',
                    message: 'Executing the operation...'
                }));

                // Execute the confirmed operation
                const operationResult = await this.executeConfirmedOperation(confirmationResult.operationData, client.userId);
                
                const audioSummary = voiceRecognitionService.generateAudioSummaryWithSources(operationResult, confirmationData.operationType);
                
                // Add to conversation history
                client.conversationHistory.push({
                    role: 'assistant',
                    content: audioSummary,
                    timestamp: new Date()
                });

                ws.send(JSON.stringify({
                    type: 'operation_completed',
                    text: audioSummary,
                    shouldSpeak: true,
                    operationResult,
                    timestamp: new Date()
                }));

            } else if (confirmationResult.confirmed === false) {
                // Operation cancelled
                client.conversationHistory.push({
                    role: 'assistant',
                    content: confirmationResult.message,
                    timestamp: new Date()
                });

                ws.send(JSON.stringify({
                    type: 'operation_cancelled',
                    text: confirmationResult.message,
                    shouldSpeak: confirmationResult.shouldSpeak,
                    timestamp: new Date()
                }));

            } else {
                // Need clarification
                ws.send(JSON.stringify({
                    type: 'confirmation_clarification',
                    text: confirmationResult.message,
                    shouldSpeak: confirmationResult.shouldSpeak,
                    confirmationData, // Keep the same confirmation data
                    timestamp: new Date()
                }));
            }

        } catch (error) {
            console.error('Confirmation processing error:', error);
            
            const errorMessage = "I'm sorry, there was an error processing your confirmation. Please try again.";
            
            client.conversationHistory.push({
                role: 'assistant',
                content: errorMessage,
                timestamp: new Date()
            });

            ws.send(JSON.stringify({
                type: 'ai_response',
                text: errorMessage,
                shouldSpeak: true,
                timestamp: new Date(),
                isError: true
            }));
        }
    }

    async processRecoveryChoice(ws, client, userChoice, recoveryOptions) {
        if (!client.conversationActive) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Conversation not active'
            }));
            return;
        }

        try {
            const recoveryResult = voiceRecognitionService.processRecoveryChoice(userChoice, recoveryOptions);
            
            if (recoveryResult.choice === 'use_alternatives') {
                // Send processing indicator
                ws.send(JSON.stringify({
                    type: 'processing',
                    message: 'Trying alternative sources...'
                }));

                // Retry operation with alternative sources
                const retryResult = await this.retryWithAlternatives(recoveryOptions, recoveryResult.alternatives, client.userId);
                
                client.conversationHistory.push({
                    role: 'assistant',
                    content: retryResult.message,
                    timestamp: new Date()
                });

                ws.send(JSON.stringify({
                    type: 'recovery_completed',
                    text: retryResult.message,
                    shouldSpeak: true,
                    result: retryResult,
                    timestamp: new Date()
                }));

            } else if (recoveryResult.choice === 'retry') {
                // Send processing indicator
                ws.send(JSON.stringify({
                    type: 'processing',
                    message: 'Retrying connection...'
                }));

                // Retry the original operation
                const retryResult = await this.retryOriginalOperation(recoveryOptions, client.userId);
                
                client.conversationHistory.push({
                    role: 'assistant',
                    content: retryResult.message,
                    timestamp: new Date()
                });

                ws.send(JSON.stringify({
                    type: 'recovery_completed',
                    text: retryResult.message,
                    shouldSpeak: true,
                    result: retryResult,
                    timestamp: new Date()
                }));

            } else if (recoveryResult.choice === 'skip') {
                // Skip the problematic integration
                client.conversationHistory.push({
                    role: 'assistant',
                    content: recoveryResult.message,
                    timestamp: new Date()
                });

                ws.send(JSON.stringify({
                    type: 'recovery_skipped',
                    text: recoveryResult.message,
                    shouldSpeak: recoveryResult.shouldSpeak,
                    skipped: recoveryResult.skipped,
                    timestamp: new Date()
                }));

            } else {
                // Need clarification
                ws.send(JSON.stringify({
                    type: 'recovery_clarification',
                    text: recoveryResult.message,
                    shouldSpeak: recoveryResult.shouldSpeak,
                    recoveryOptions, // Keep the same recovery options
                    timestamp: new Date()
                }));
            }

        } catch (error) {
            console.error('Recovery choice processing error:', error);
            
            const errorMessage = "I'm sorry, there was an error processing your choice. Please try again.";
            
            client.conversationHistory.push({
                role: 'assistant',
                content: errorMessage,
                timestamp: new Date()
            });

            ws.send(JSON.stringify({
                type: 'ai_response',
                text: errorMessage,
                shouldSpeak: true,
                timestamp: new Date(),
                isError: true
            }));
        }
    }

    async executeConfirmedOperation(operationData, userId) {
        // Placeholder for executing confirmed operations
        // This would integrate with the actual operation execution logic
        return {
            success: true,
            objects: operationData.foundObjects || [],
            message: "Operation completed successfully"
        };
    }

    async retryWithAlternatives(recoveryOptions, alternatives, userId) {
        // Placeholder for retrying with alternative sources
        return {
            success: true,
            message: `Successfully completed using ${alternatives.join(' and ')}.`,
            alternativesUsed: alternatives
        };
    }

    async retryOriginalOperation(recoveryOptions, userId) {
        // Placeholder for retrying the original operation
        return {
            success: true,
            message: `Successfully reconnected to ${recoveryOptions.integration}. Operation completed.`,
            integration: recoveryOptions.integration
        };
    }

    // Get connection stats
    getStats() {
        return {
            totalConnections: this.clients.size,
            activeConversations: Array.from(this.clients.values()).filter(c => c.conversationActive).length
        };
    }
}

export const voiceWebSocketService = new VoiceWebSocketService();