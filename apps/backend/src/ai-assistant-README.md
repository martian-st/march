# Enhanced AI Assistant Implementation

This implementation provides a sophisticated AI assistant with chain-of-thought reasoning capabilities for your March application. The system can handle complex user prompts for finding objects, creating objects, managing calendar invitations, and much more.

## Architecture Overview

### Core Services

1. **ChainOfThoughtService** (`src/services/ai/chain-of-thought.service.js`)
   - Breaks down complex requests into logical steps
   - Maintains conversation context
   - Handles multi-step reasoning and execution
   - Provides graceful error handling and fallbacks

2. **CalendarIntegrationService** (`src/services/ai/calendar-integration.service.js`)
   - Parses natural language for calendar events
   - Creates meeting objects with intelligent defaults
   - Finds available time slots
   - Generates professional meeting invitations

3. **AdvancedObjectManagerService** (`src/services/ai/advanced-object-manager.service.js`)
   - Semantic search with intelligent ranking
   - Smart object creation with enhanced metadata
   - Context-aware data enhancement
   - Intelligent tagging and categorization

### API Endpoints

All enhanced AI endpoints are available under `/api/ai/enhanced/`:

- `POST /api/ai/enhanced/process` - Main complex request processing
- `POST /api/ai/enhanced/find` - Smart object finding
- `POST /api/ai/enhanced/create` - Intelligent object creation
- `POST /api/ai/enhanced/calendar` - Calendar integration
- `GET /api/ai/enhanced/context` - Get conversation context
- `DELETE /api/ai/enhanced/context` - Clear conversation context
- `POST /api/ai/enhanced/analyze` - Analyze intent without execution
- `GET /api/ai/enhanced/capabilities` - Get AI capabilities
- `GET /api/ai/enhanced/health` - Health check

## Usage Examples

### 1. Complex Multi-Step Requests

```javascript
// Find urgent tasks and create a meeting to discuss them
const response = await fetch('http://localhost:8080/ai/enhanced/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: "Find all my urgent tasks due this week and create a meeting tomorrow at 2pm to discuss them with the team",
        context: {
            userPreferences: {
                workHours: { start: "09:00", end: "17:00" },
                timezone: "America/New_York"
            }
        }
    })
});
```

### 2. Smart Object Finding

```javascript
// Semantic search for project-related notes
const response = await fetch('http://localhost:8080/ai/enhanced/find', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: "Find notes about the client presentation we discussed last week",
        options: {
            limit: 10,
            includeArchived: false
        }
    })
});
```

### 3. Intelligent Object Creation

```javascript
// Create a task with intelligent enhancement
const response = await fetch('http://localhost:8080/ai/enhanced/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: "Create a task to review the quarterly budget report by Friday, it's high priority",
        context: {
            currentProject: "Q4 Planning",
            department: "Finance"
        }
    })
});
```

### 4. Calendar Integration

```javascript
// Create a meeting with natural language
const response = await fetch('http://localhost:8080/ai/enhanced/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: "Schedule a team standup every Monday at 9am starting next week",
        action: "create"
    })
});

// Find available meeting times
const response = await fetch('http://localhost:8080/ai/enhanced/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        prompt: "Find a 2-hour slot for a workshop sometime this week, preferably in the afternoon",
        action: "find_time"
    })
});
```

### 5. Intent Analysis

```javascript
// Analyze user intent without executing
const response = await fetch('http://localhost:8080/ai/enhanced/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: "I need to organize my tasks for the product launch next month"
    })
});
```

## Response Formats

### Complex Request Response
```json
{
    "status": "completed",
    "data": {
        "success": true,
        "steps": [
            {
                "step": 1,
                "action": "Search for urgent tasks",
                "result": { "objects": [...], "count": 5 },
                "success": true
            },
            {
                "step": 2,
                "action": "Create meeting",
                "result": { "meeting": {...}, "created": true },
                "success": true
            }
        ],
        "finalResult": {
            "success": true,
            "createdObjects": [...],
            "foundObjects": [...],
            "summary": "Found 5 urgent tasks. Created meeting: Team Discussion"
        },
        "executionSummary": {
            "totalSteps": 2,
            "successfulSteps": 2,
            "successRate": "100.0%"
        }
    },
    "success": true
}
```

### Object Finding Response
```json
{
    "success": true,
    "data": {
        "objects": [
            {
                "title": "Client Presentation Notes",
                "type": "note",
                "relevanceScore": 85,
                "updatedAt": "2024-01-15T10:30:00Z",
                ...
            }
        ],
        "searchIntent": {
            "intent": "find_similar",
            "entities": { "keywords": ["client", "presentation"] }
        },
        "totalFound": 3,
        "message": "Found 3 objects: 2 notes, 1 todo"
    }
}
```

## Advanced Features

### 1. Conversation Context
The system maintains conversation context across interactions:

```javascript
// First request
await fetch('/api/ai/enhanced/process', {
    method: 'POST',
    body: JSON.stringify({
        query: "Find my tasks for the project launch"
    })
});

// Follow-up request (uses context from previous)
await fetch('/api/ai/enhanced/process', {
    method: 'POST',
    body: JSON.stringify({
        query: "Create a meeting to discuss the high-priority ones"
    })
});
```

### 2. Intelligent Defaults
Objects are created with smart defaults based on context:

- **Priority**: Automatically assigned based on due date urgency
- **Tags**: Generated from content analysis
- **Estimated Time**: Inferred from task complexity
- **Dependencies**: Identified from related objects

### 3. Error Handling
The system gracefully handles failures:

- **Step Failures**: Individual steps can fail without stopping the entire process
- **Fallback Responses**: Alternative approaches when primary methods fail
- **User Guidance**: Clear explanations of what went wrong and how to proceed

### 4. Semantic Understanding
Goes beyond keyword matching:

- **Intent Recognition**: Understands what users really want
- **Context Awareness**: Uses conversation history and user patterns
- **Relationship Mapping**: Identifies connections between objects
- **Natural Language**: Processes human-like requests

## Integration with Existing System

The enhanced AI system integrates seamlessly with your existing March backend:

1. **Uses Existing Models**: Works with your current Object schema
2. **Preserves Data**: All existing functionality remains intact
3. **Extends Capabilities**: Adds new features without breaking changes
4. **Maintains Performance**: Efficient processing with caching and optimization

## Configuration

### Environment Variables
Ensure these are set in your `.env` file:
```
GOOGLE_AI_API_KEY=your_gemini_api_key
```

### Optional Configuration
You can customize behavior by modifying the service constructors:

```javascript
// Custom temperature for more creative responses
const chainOfThought = new ChainOfThoughtService(apiKey, systemPrompt, {
    temperature: 0.7
});

// Custom work hours for calendar integration
const calendarService = new CalendarIntegrationService(apiKey, {
    defaultWorkHours: { start: "08:00", end: "18:00" }
});
```

## Testing

### Manual Testing
Use the health check endpoint to verify everything is working:

```bash
curl -X GET http://localhost:3000/api/ai/enhanced/health
```

### Example Test Requests

1. **Simple Object Creation**:
```bash
curl -X POST http://localhost:3000/api/ai/enhanced/create \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create a task to call the client tomorrow"}'
```

2. **Complex Request**:
```bash
curl -X POST http://localhost:3000/api/ai/enhanced/process \
  -H "Content-Type: application/json" \
  -d '{"query": "Find overdue tasks and prioritize them by importance"}'
```

3. **Calendar Event**:
```bash
curl -X POST http://localhost:3000/api/ai/enhanced/calendar \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Schedule a team meeting for Friday at 3pm", "action": "create"}'
```

## Best Practices

1. **Be Specific**: More detailed requests yield better results
2. **Use Context**: Provide relevant context for better understanding
3. **Iterate**: Use conversation context for follow-up refinements
4. **Monitor Performance**: Check execution summaries for optimization opportunities
5. **Handle Errors**: Always check response success status and handle failures gracefully

## Troubleshooting

### Common Issues

1. **API Key Issues**: Ensure `GOOGLE_AI_API_KEY` is properly set
2. **Memory Issues**: Clear conversation context periodically for long sessions
3. **Performance**: Use appropriate limits and filters for large datasets
4. **Parsing Errors**: The system provides fallbacks for JSON parsing failures

### Debug Endpoints

- `GET /api/ai/enhanced/health` - Check service status
- `GET /api/ai/enhanced/capabilities` - View available features
- `POST /api/ai/enhanced/analyze` - Test intent recognition without execution

This enhanced AI assistant provides a powerful foundation for sophisticated user interactions while maintaining the reliability and performance of your existing March application.
