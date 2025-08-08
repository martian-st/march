# Voice AI Assistant Integration Guide

This guide explains how to use the voice-controlled AI assistant that has been integrated into your March application.

## 🎯 Overview

The voice AI assistant allows users to interact with your productivity app using natural speech. Users can create tasks, find information, schedule meetings, and execute complex operations just by speaking.

## 🏗️ Architecture

### Backend Components

1. **VoiceRecognitionService** (`apps/backend/src/services/ai/voice-recognition.service.js`)
   - Processes voice commands and extracts user intent
   - Converts speech to actionable AI assistant queries
   - Generates conversational responses

2. **Voice Controller** (`apps/backend/src/controllers/ai/voice.controller.js`)
   - Handles voice command processing endpoints
   - Integrates with existing AI services (ChainOfThought, ObjectManager, Calendar)
   - Provides voice capabilities and health checks

3. **Voice Router** (`apps/backend/src/routers/voice.router.js`)
   - Exposes voice endpoints under `/ai/voice/`

### Frontend Components

1. **VoiceRecorder** (`apps/web/src/components/voice/VoiceRecorder.tsx`)
   - Core voice recording interface using Web Speech API
   - Real-time transcription display
   - Speech synthesis for responses

2. **VoiceAssistant** (`apps/web/src/components/voice/VoiceAssistant.tsx`)
   - Complete voice assistant interface
   - Conversation history
   - Command analysis and results display

3. **VoiceFloatingButton** (`apps/web/src/components/voice/VoiceFloatingButton.tsx`)
   - Floating action button for quick voice commands
   - Minimal interface for easy integration

4. **useVoiceAssistant Hook** (`apps/web/src/hooks/useVoiceAssistant.ts`)
   - React hook for voice functionality
   - State management and API integration

## 🚀 API Endpoints

### Main Endpoints

- `POST /ai/voice/process` - Process voice command and execute AI action
- `POST /ai/voice/transcribe` - Transcribe voice input only (for testing)
- `GET /ai/voice/capabilities` - Get supported voice commands and examples
- `GET /ai/voice/health` - Health check for voice services

### Request/Response Examples

#### Process Voice Command
```javascript
// Request
POST /ai/voice/process
{
  "transcribedText": "Create a task to call the client tomorrow",
  "context": {
    "userPreferences": { "timezone": "America/New_York" }
  }
}

// Response
{
  "success": true,
  "data": {
    "voiceProcessing": {
      "originalText": "Create a task to call the client tomorrow",
      "intent": "create_task",
      "confidence": 0.95,
      "parameters": {
        "query": "Create a task to call the client tomorrow",
        "urgency": "medium",
        "timeframe": "tomorrow"
      }
    },
    "assistantResult": { /* AI execution result */ },
    "voiceResponse": {
      "text": "Perfect! I've created that task for you. It's been added to your workspace.",
      "shouldSpeak": true,
      "confidence": 0.95
    },
    "executionSummary": {
      "voiceProcessingSuccess": true,
      "assistantExecutionSuccess": true,
      "overallSuccess": true,
      "processedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

## 🎤 Supported Voice Commands

### Task Management
- "Create a task to call the client tomorrow"
- "Add a high priority task to review the budget"
- "Find all my overdue tasks"
- "Show me tasks for this week"

### Calendar & Meetings
- "Schedule a team meeting for Friday at 2pm"
- "Book a one-on-one with Sarah next week"
- "Find a 2-hour slot for the workshop"
- "Create a recurring standup every Monday"

### Complex Operations
- "Find urgent tasks and create a meeting to discuss them"
- "Organize my tasks by project and set deadlines"
- "Show me this week's priorities and schedule time for them"

### General Queries
- "What's on my schedule today?"
- "How many pending tasks do I have?"
- "Give me a summary of my week"

## 🔧 Integration Examples

### 1. Add Floating Voice Button to Any Page

```tsx
import { VoiceFloatingButton } from '@/components/voice';

export default function MyPage() {
  const handleVoiceResult = (result) => {
    console.log('Voice command result:', result);
    // Handle the result (update UI, show notifications, etc.)
  };

  return (
    <div>
      {/* Your page content */}
      <VoiceFloatingButton 
        position="bottom-right" 
        onResult={handleVoiceResult}
      />
    </div>
  );
}
```

### 2. Full Voice Assistant Interface

```tsx
import { VoiceAssistant } from '@/components/voice';

export default function AssistantPage() {
  return (
    <div className="container mx-auto p-6">
      <VoiceAssistant onResult={(result) => {
        // Handle voice command results
        console.log('Voice result:', result);
      }} />
    </div>
  );
}
```

### 3. Custom Voice Integration with Hook

```tsx
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

export default function CustomVoiceComponent() {
  const {
    isSupported,
    isRecording,
    startRecording,
    stopRecording,
    processVoiceCommand
  } = useVoiceAssistant();

  const handleVoiceCommand = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      const success = await startRecording();
      if (success) {
        // Handle recording started
      }
    }
  };

  if (!isSupported) {
    return <div>Voice not supported in this browser</div>;
  }

  return (
    <button onClick={handleVoiceCommand}>
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  );
}
```

## 🌐 Browser Support

### Supported Browsers
- ✅ Chrome (recommended)
- ✅ Edge
- ✅ Safari (limited)
- ❌ Firefox (limited Web Speech API support)

### Required Permissions
- Microphone access for voice recording
- HTTPS connection (required for Web Speech API)

## ⚙️ Configuration

### Environment Variables
Ensure these are set in your backend `.env` file:
```
GOOGLE_AI_API_KEY=your_gemini_api_key
```

### Frontend Configuration
The voice components automatically detect browser support and request necessary permissions.

## 🔍 Testing

### 1. Test Voice Processing
```bash
curl -X POST http://localhost:8080/ai/voice/transcribe \
  -H "Content-Type: application/json" \
  -d '{"transcribedText": "Create a task to test the system"}'
```

### 2. Health Check
```bash
curl -X GET http://localhost:8080/ai/voice/health
```

### 3. Get Capabilities
```bash
curl -X GET http://localhost:8080/ai/voice/capabilities
```

## 🎨 Demo Page

Visit `/voice-demo` to see a complete demonstration of the voice assistant capabilities with:
- Live voice recording and transcription
- Real-time command processing
- Results display and conversation history
- Example commands and usage tips

## 🚨 Troubleshooting

### Common Issues

1. **Microphone Access Denied**
   - Ensure HTTPS connection
   - Check browser permissions
   - Try refreshing the page

2. **Voice Recognition Not Working**
   - Verify browser support (use Chrome/Edge)
   - Check microphone hardware
   - Ensure stable internet connection

3. **API Errors**
   - Verify `GOOGLE_AI_API_KEY` is set
   - Check backend server is running
   - Verify JWT authentication

### Debug Tips

1. **Check Browser Console** for JavaScript errors
2. **Test API Endpoints** directly with curl/Postman
3. **Verify Permissions** in browser settings
4. **Use Health Check** endpoint to verify service status

## 🔮 Advanced Features

### Conversation Context
The system maintains conversation context across interactions:
```javascript
// First command: "Find my urgent tasks"
// Follow-up: "Create a meeting to discuss them" 
// (automatically uses context from previous command)
```

### Intent Recognition
Advanced AI understands various ways to express the same intent:
- "Create a task" = "Add a todo" = "Remind me to"
- "Find tasks" = "Show me todos" = "What tasks do I have"

### Error Handling
- Graceful fallbacks for unclear speech
- Retry mechanisms for failed commands
- User-friendly error messages

## 📈 Performance Considerations

- Voice processing happens server-side for better accuracy
- Conversation context is limited to last 5 messages
- Speech synthesis uses browser's built-in capabilities
- Real-time transcription provides immediate feedback

## 🔐 Security

- All voice data is processed server-side
- No voice recordings are stored permanently
- Standard JWT authentication applies to all endpoints
- Voice commands respect existing user permissions

---

## 🎉 Getting Started

1. **Backend**: The voice endpoints are automatically available at `/ai/voice/`
2. **Frontend**: Import components from `@/components/voice`
3. **Demo**: Visit `/voice-demo` to try it out
4. **Integration**: Add `<VoiceFloatingButton />` to any page

The voice AI assistant is now ready to enhance your productivity app with natural language voice control! 🚀