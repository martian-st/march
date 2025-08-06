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
            // Use single intelligent endpoint that learns from user patterns
            await handleIntelligentRequest(input);
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

    // Single intelligent endpoint - no more routing based on keywords!
    // The AI will learn from user interactions and understand intent naturally
    const getIntelligentEndpoint = () => {
        return 'http://localhost:8080/ai/intelligent';
    };

    // Intelligent request handler - uses AI learning instead of keyword matching
    const handleIntelligentRequest = async (query) => {
        setIsStreaming(true);
        
        // Get session token
        const session = await getSession();
        
        const response = await fetch(getIntelligentEndpoint(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session}`
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            setMessages(prev => [...prev.slice(0, -1), {
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                isError: true
            }]);
            setIsStreaming(false);
            return;
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

    const handleStreamingResponse = (data) => {
        switch (data.status) {
            case 'thinking':
                // AI is understanding the request (learning happens silently)
                updateLastMessage({ 
                    content: data.message || 'Processing your request...',
                    isStreaming: true
                });
                break;
            case 'processing':
                // Show real-time processing updates
                updateLastMessage({ 
                    content: data.message || 'Processing your request...',
                    isStreaming: true 
                });
                break;
            case 'progress':
                // Show progress without exposing learning details
                updateLastMessage({ 
                    content: data.message || 'Working on your request...',
                    isStreaming: true
                });
                break;
            case 'completed':
                // Show final result with learning stats
                const responseContent = formatIntelligentResponse(data.data);
                updateLastMessage({
                    content: responseContent,
                    isStreaming: false,
                    data: data.data,
                    learningStats: data.data.learningStats
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
            default:
                // Handle any other status messages
                updateLastMessage({ 
                    content: data.message || 'Processing your request...',
                    isStreaming: true 
                });
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
                response += `   Type: ${obj.type} | Status: ${obj.status || 'Not set'}\n`;
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
                   `Status: ${obj.status || 'Not set'}\n` +
                   (obj.due?.string ? `Due: ${obj.due.string}\n` : '') +
                   (obj.priority ? `Priority: ${obj.priority}\n` : '') +
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

    // Format response from intelligent AI system (learning happens silently)
    const formatIntelligentResponse = (data) => {
        let response = '';
        
        // Handle conversational responses first
        if (data.isConversational && data.response) {
            return data.response;
        }
        
        // Show main result without exposing AI learning details
        if (data.message) {
            response += data.message + '\n\n';
        }
        
        // Show response text if available
        if (data.response && !data.isConversational) {
            response += data.response + '\n\n';
        }
        
        // Show created objects
        if (data.object) {
            response += `✅ Created: **${data.object.title}**\n`;
            response += `Type: ${data.object.type}\n`;
            if (data.object.status) response += `Status: ${data.object.status}\n`;
            if (data.object.due?.string) response += `Due: ${data.object.due.string}\n`;
            response += '\n';
        }
        
        // Show found objects
        if (data.objects && data.objects.length > 0) {
            response += `Found ${data.objects.length} result${data.objects.length !== 1 ? 's' : ''}:\n\n`;
            data.objects.slice(0, 5).forEach((obj, index) => {
                response += `${index + 1}. **${obj.title}**\n`;
                response += `   ${obj.type} | ${obj.status || 'No status'}\n`;
                if (obj.due?.string) response += `   Due: ${obj.due.string}\n`;
                response += '\n';
            });
            if (data.objects.length > 5) {
                response += `... and ${data.objects.length - 5} more results\n\n`;
            }
        }
        
        // Learning happens silently - no need to show progress to user
        
        return response || 'Request completed successfully';
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
        // Enhanced markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>')
            .replace(/•/g, '&bull;')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    };

    const exampleQueries = [
        "Create a task to review the quarterly report by Friday",
        "Find my urgent tasks due this week",
        "Add a due date of August 15th to all my unplanned todos",
        "Schedule a team meeting for tomorrow at 2 PM",
        "Show me completed tasks from last month",
        "Update high priority tasks to be due next Monday"
    ];

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-center">
                    <h1 className="text-xl font-semibold text-gray-900">March AI</h1>
                    {conversationState !== 'normal' && (
                        <div className="ml-3 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                            {conversationState === 'clarification' ? '💭 Clarifying' : '💬 Continuing'}
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-4xl mx-auto">
                        <div className="mb-8">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                <span className="text-xl">🤖</span>
                            </div>
                            <h2 className="text-2xl font-medium text-gray-900 mb-2">How can I help you today?</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
                            {exampleQueries.map((query, index) => (
                                <button
                                    key={index}
                                    className="p-4 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => setInput(query)}
                                    disabled={isLoading}
                                >
                                    {query}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((message) => (
                        <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-2xl px-4 py-3 rounded-2xl ${
                                message.type === 'user' 
                                    ? 'bg-gray-900 text-white ml-12' 
                                    : 'bg-gray-100 text-gray-900 mr-12'
                            }`}>
                            {message.isLoading ? (
                                <div className="flex items-center space-x-1">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div 
                                        className="text-sm leading-relaxed"
                                        dangerouslySetInnerHTML={{ 
                                            __html: formatMessageContent(message.content) 
                                        }}
                                    />
                                    {message.needsClarification && message.clarificationData?.questions && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            {message.clarificationData.questions.map((question, qIndex) => (
                                                question.suggestions && question.suggestions.length > 0 && (
                                                    <div key={qIndex} className="mb-4">
                                                        <div className="text-sm font-medium text-gray-700 mb-2">{question.question}</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {question.suggestions.map((suggestion, sIndex) => (
                                                                <button
                                                                    key={sIndex}
                                                                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>

            {/* Input */}
            <div className="px-4 py-6 bg-white border-t border-gray-200">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex space-x-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask another question..."
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent focus:bg-white transition-all duration-200"
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EnhancedAIChat;
