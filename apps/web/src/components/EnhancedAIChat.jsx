import React, { useState, useRef, useEffect } from 'react';
import { getSession } from '@/actions/session';
import { api } from '@/lib/api';

/**
 * Enhanced AI Chat Component
 * Provides a sophisticated chat interface for the enhanced AI assistant
 */
const EnhancedAIChat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [pendingClarification, setPendingClarification] = useState(null);
    const [conversationState, setConversationState] = useState('normal'); // 'normal', 'clarification', 'follow_up'
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const addMessage = (message) => {
        setMessages(prev => [...prev, message]);
    };

    const updateLastMessage = (updates) => {
        setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0) {
                newMessages[lastIndex] = { ...newMessages[lastIndex], ...updates };
            }
            return newMessages;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: input,
            timestamp: new Date()
        };

        addMessage(userMessage);
        setInput('');
        setIsLoading(true);

        // Add loading message
        const loadingMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: 'Thinking...',
            isLoading: true,
            timestamp: new Date()
        };
        addMessage(loadingMessage);

        try {
            // Determine the best endpoint based on the query
            const endpoint = determineEndpoint(input);
            
            if (endpoint === 'http://localhost:8080/ai/enhanced/process') {
                await handleComplexRequest(input);
            } else {
                await handleSimpleRequest(input, endpoint);
            }
        } catch (error) {
            console.error('Error:', error);
            updateLastMessage({
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                isLoading: false,
                error: true
            });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    };

    const determineEndpoint = (query) => {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('show me')) {
            return 'localhost:8080/ai/enhanced/find';
        } else if (lowerQuery.includes('create') || lowerQuery.includes('add') || lowerQuery.includes('make')) {
            return 'http://localhost:8080/ai/enhanced/create';
        } else if (lowerQuery.includes('schedule') || lowerQuery.includes('meeting') || lowerQuery.includes('calendar')) {
            return 'http://localhost:8080/ai/enhanced/calendar';
        } else if (lowerQuery.includes('and') || lowerQuery.includes('then') || lowerQuery.split(' ').length > 10) {
            return 'http://localhost:8080/ai/enhanced/process';
        }
        
        return 'http://localhost:8080/ai/enhanced/process'; // Default to complex processing
    };

    const handleComplexRequest = async (query) => {
        setIsStreaming(true);
        
        // Get session token
        const session = await getSession();
        
        const response = await fetch('http://localhost:8080/ai/enhanced/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session}`
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        updateLastMessage({ content: '', isLoading: false, isStreaming: true });

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            handleStreamingResponse(data);
                        } catch (e) {
                            console.warn('Failed to parse streaming response:', line);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    };

    const handleSimpleRequest = async (query, endpoint) => {
        let body = { query };
        
        if (endpoint === '/api/ai/enhanced/create') {
            body = { prompt: query };
        } else if (endpoint === '/api/ai/enhanced/calendar') {
            body = { prompt: query, action: 'create' };
        }

        // Get session token
        const session = await getSession();
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session}`
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (data.success) {
            updateLastMessage({
                content: formatResponse(data.data),
                isLoading: false,
                data: data.data
            });
        } else {
            throw new Error(data.message || 'Request failed');
        }
    };

    const handleStreamingResponse = (data) => {
        switch (data.status) {
            case 'processing':
                updateLastMessage({ 
                    content: data.message,
                    isStreaming: true 
                });
                break;
            case 'completed':
                updateLastMessage({
                    content: formatComplexResponse(data.data),
                    isStreaming: false,
                    data: data.data
                });
                setConversationState('normal');
                break;
            case 'conversational':
                updateLastMessage({
                    content: data.data.response,
                    isStreaming: false,
                    isConversational: true,
                    data: data.data
                });
                setConversationState('normal');
                break;
            case 'clarification_needed':
                updateLastMessage({
                    content: formatClarificationRequest(data.data),
                    isStreaming: false,
                    needsClarification: true,
                    clarificationData: data.data
                });
                setPendingClarification(data.data);
                setConversationState('clarification');
                break;
            case 'follow_up_response':
                updateLastMessage({
                    content: data.data.response,
                    isStreaming: false,
                    isFollowUp: true,
                    data: data.data
                });
                setConversationState('normal');
                break;
            case 'error':
                updateLastMessage({
                    content: `Error: ${data.error}`,
                    isStreaming: false,
                    error: true
                });
                setConversationState('normal');
                setPendingClarification(null);
                break;
        }
    };

    const formatResponse = (data) => {
        if (data.objects) {
            // Format search results
            const count = data.objects.length;
            let response = `Found ${count} result${count !== 1 ? 's' : ''}:\n\n`;
            
            data.objects.slice(0, 5).forEach((obj, index) => {
                response += `${index + 1}. **${obj.title}**\n`;
                response += `   Type: ${obj.type} | Status: ${obj.status}\n`;
                if (obj.due?.string) {
                    response += `   Due: ${obj.due.string}\n`;
                }
                response += '\n';
            });
            
            if (count > 5) {
                response += `... and ${count - 5} more results`;
            }
            
            return response;
        } else if (data.object) {
            // Format created object
            const obj = data.object;
            return `✅ Created ${obj.type}: **${obj.title}**\n\n` +
                   `Status: ${obj.status}\n` +
                   (obj.due?.string ? `Due: ${obj.due.string}\n` : '') +
                   (obj.description ? `Description: ${obj.description}` : '');
        } else if (data.meeting) {
            // Format calendar event
            const meeting = data.meeting;
            return `📅 Created meeting: **${meeting.title}**\n\n` +
                   `Date: ${meeting.due.string}\n` +
                   `Location: ${meeting.metadata.location || 'TBD'}\n` +
                   `Duration: ${meeting.metadata.duration} minutes`;
        }
        
        return data.message || 'Request completed successfully';
    };

    const formatComplexResponse = (data) => {
        if (!data.finalResult) return 'Request completed';
        
        const result = data.finalResult;
        let response = `✅ **${result.summary}**\n\n`;
        
        if (result.createdObjects?.length > 0) {
            response += `**Created Objects:**\n`;
            result.createdObjects.forEach(obj => {
                response += `• ${obj.title} (${obj.type})\n`;
            });
            response += '\n';
        }
        
        if (result.foundObjects?.length > 0) {
            response += `**Found Objects:**\n`;
            result.foundObjects.slice(0, 3).forEach(obj => {
                response += `• ${obj.title} (${obj.type})\n`;
            });
            if (result.foundObjects.length > 3) {
                response += `• ... and ${result.foundObjects.length - 3} more\n`;
            }
            response += '\n';
        }
        
        if (data.executionSummary) {
            response += `**Execution Summary:**\n`;
            response += `Steps completed: ${data.executionSummary.successfulSteps}/${data.executionSummary.totalSteps}\n`;
            response += `Success rate: ${data.executionSummary.successRate}`;
        }
        
        return response;
    };

    const formatClarificationRequest = (data) => {
        let response = `${data.message}\n\n`;
        
        if (data.questions && data.questions.length > 0) {
            response += "**Please help me with the following:**\n\n";
            
            data.questions.forEach((question, index) => {
                response += `${index + 1}. ${question.question}\n`;
                
                if (question.suggestions && question.suggestions.length > 0) {
                    response += `   Suggestions: ${question.suggestions.join(', ')}\n`;
                }
                response += '\n';
            });
            
            response += "You can answer all questions in one message, or just provide the most important details.";
        }
        
        return response;
    };

    const getInputPlaceholder = () => {
        switch (conversationState) {
            case 'clarification':
                return "Please provide the requested details...";
            case 'follow_up':
                return "Ask a follow-up question or continue the conversation...";
            default:
                return "Ask me anything... (e.g., 'Find my urgent tasks and create a meeting to discuss them')";
        }
    };

    const handleQuickResponse = (suggestion) => {
        setInput(suggestion);
    };

    const formatMessageContent = (content) => {
        // Simple markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>')
            .replace(/•/g, '&bull;');
    };

    const exampleQueries = [
        "Create a task", // Will trigger clarification
        "Find all my urgent tasks due this week",
        "Schedule a meeting", // Will trigger clarification
        "Find overdue tasks and prioritize them by importance",
        "Create a project plan for the new feature launch",
        "What about the high priority ones?" // Follow-up example
    ];

    return (
        <div className="chat-container">
            {/* Header */}
            <div className="chat-header">
                <div className="header-content">
                    <h1>March AI</h1>
                    {conversationState !== 'normal' && (
                        <div className="status-badge">
                            {conversationState === 'clarification' ? '💭 Clarifying' : '💬 Continuing'}
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="messages-container">
                {messages.length === 0 && (
                    <div className="welcome-screen">
                        <div className="welcome-icon">🤖</div>
                        <h2>How can I help you today?</h2>
                        <div className="example-prompts">
                            {exampleQueries.map((query, index) => (
                                <button
                                    key={index}
                                    className="example-prompt"
                                    onClick={() => setInput(query)}
                                    disabled={isLoading}
                                >
                                    {query}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {messages.map((message) => (
                    <div key={message.id} className={`message-wrapper ${message.type}`}>
                        <div className="message-bubble">
                            {message.isLoading ? (
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            ) : (
                                <>
                                    <div 
                                        className="message-text"
                                        dangerouslySetInnerHTML={{ 
                                            __html: formatMessageContent(message.content) 
                                        }}
                                    />
                                    {message.needsClarification && message.clarificationData?.questions && (
                                        <div className="clarification-section">
                                            {message.clarificationData.questions.map((question, qIndex) => (
                                                question.suggestions && question.suggestions.length > 0 && (
                                                    <div key={qIndex} className="clarification-group">
                                                        <div className="clarification-question">{question.question}</div>
                                                        <div className="clarification-options">
                                                            {question.suggestions.map((suggestion, sIndex) => (
                                                                <button
                                                                    key={sIndex}
                                                                    className="clarification-option"
                                                                    onClick={() => handleQuickResponse(suggestion)}
                                                                    disabled={isLoading}
                                                                >
                                                                    {suggestion}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="input-section">
                <form onSubmit={handleSubmit} className="input-form">
                    <div className="input-wrapper">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={getInputPlaceholder()}
                            disabled={isLoading}
                            className="message-input"
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="send-btn"
                        >
                            {isLoading ? (
                                <div className="loading-spinner"></div>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                </svg>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            
            <style jsx>{`
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    max-height: 800px;
                    width: 100%;
                    max-width: 1000px;
                    margin: 0 auto;
                    background: #ffffff;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .chat-header {
                    padding: 16px 24px;
                    border-bottom: 1px solid #e5e5e5;
                    background: #ffffff;
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .header-content h1 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 600;
                    color: #202123;
                }

                .status-badge {
                    padding: 4px 12px;
                    background: #f7f7f8;
                    border-radius: 12px;
                    font-size: 12px;
                    color: #6b7280;
                    font-weight: 500;
                }

                .messages-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                }

                .welcome-screen {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    padding: 48px 24px;
                    text-align: center;
                }

                .welcome-icon {
                    font-size: 48px;
                    margin-bottom: 24px;
                }

                .welcome-screen h2 {
                    margin: 0 0 32px 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: #202123;
                }

                .example-prompts {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 12px;
                    max-width: 800px;
                    width: 100%;
                }

                .example-prompt {
                    padding: 16px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    background: #ffffff;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    text-align: left;
                    color: #374151;
                    font-weight: 400;
                }

                .example-prompt:hover:not(:disabled) {
                    border-color: #9ca3af;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .example-prompt:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .message-wrapper {
                    padding: 24px;
                    border-bottom: 1px solid #f0f0f0;
                }

                .message-wrapper.user {
                    background: #f7f7f8;
                }

                .message-wrapper.assistant {
                    background: #ffffff;
                }

                .message-bubble {
                    max-width: 100%;
                    margin: 0 auto;
                    max-width: 768px;
                }

                .message-text {
                    line-height: 1.6;
                    color: #202123;
                    font-size: 16px;
                    white-space: pre-wrap;
                }

                .typing-indicator {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                }

                .typing-indicator span {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #9ca3af;
                    animation: typing 1.4s infinite ease-in-out;
                }

                .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
                .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
                .typing-indicator span:nth-child(3) { animation-delay: 0s; }

                @keyframes typing {
                    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                    40% { transform: scale(1); opacity: 1; }
                }

                .clarification-section {
                    margin-top: 20px;
                    padding-top: 16px;
                    border-top: 1px solid #e5e5e5;
                }

                .clarification-group {
                    margin-bottom: 16px;
                }

                .clarification-question {
                    font-size: 14px;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }

                .clarification-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .clarification-option {
                    padding: 8px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: 20px;
                    background: #ffffff;
                    color: #374151;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                    font-weight: 500;
                }

                .clarification-option:hover:not(:disabled) {
                    background: #f3f4f6;
                    border-color: #9ca3af;
                }

                .clarification-option:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .input-section {
                    padding: 24px;
                    border-top: 1px solid #e5e5e5;
                    background: #ffffff;
                }

                .input-form {
                    max-width: 768px;
                    margin: 0 auto;
                }

                .input-wrapper {
                    display: flex;
                    align-items: center;
                    background: #ffffff;
                    border: 1px solid #d1d5db;
                    border-radius: 12px;
                    padding: 12px 16px;
                    transition: border-color 0.2s ease;
                }

                .input-wrapper:focus-within {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .message-input {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 16px;
                    color: #202123;
                    background: transparent;
                    resize: none;
                    font-family: inherit;
                }

                .message-input::placeholder {
                    color: #9ca3af;
                }

                .send-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border: none;
                    border-radius: 6px;
                    background: #2563eb;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-left: 8px;
                }

                .send-btn:hover:not(:disabled) {
                    background: #1d4ed8;
                }

                .send-btn:disabled {
                    background: #d1d5db;
                    cursor: not-allowed;
                }

                .loading-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #ffffff;
                    border-top: 2px solid transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Scrollbar styling */
                .messages-container::-webkit-scrollbar {
                    width: 6px;
                }

                .messages-container::-webkit-scrollbar-track {
                    background: transparent;
                }

                .messages-container::-webkit-scrollbar-thumb {
                    background: #d1d5db;
                    border-radius: 3px;
                }

                .messages-container::-webkit-scrollbar-thumb:hover {
                    background: #9ca3af;
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .chat-container {
                        height: 100vh;
                        max-height: none;
                    }

                    .example-prompts {
                        grid-template-columns: 1fr;
                    }

                    .message-wrapper {
                        padding: 16px;
                    }

                    .input-section {
                        padding: 16px;
                    }
                }
            `}</style>
        </div>
    );
};

export default EnhancedAIChat;
