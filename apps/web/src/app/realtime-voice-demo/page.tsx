'use client';

import React from 'react';
import { RealtimeVoiceChat } from '@/components/voice/RealtimeVoiceChat';

export default function RealtimeVoiceDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ⚡ Real-time Voice Chat Demo
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Experience instant voice conversations powered by WebSocket technology
          </p>
          <p className="text-sm text-gray-500">
            No delays, no restarts - just natural conversation like ChatGPT Voice!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <RealtimeVoiceChat
            onResult={(result) => {
              console.log('Voice chat result:', result);
            }}
          />
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            🚀 WebSocket Voice Chat Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">⚡ Real-time Performance</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Instant responses via WebSocket connection</li>
                <li>• No speech recognition restarts needed</li>
                <li>• Continuous conversation flow</li>
                <li>• Automatic reconnection on connection drops</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2">🎯 Smart Features</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Real-time connection status indicators</li>
                <li>• Conversation history with timestamps</li>
                <li>• Voice activity detection</li>
                <li>• Natural stop commands ("goodbye", "stop")</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-green-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-green-900 mb-4">
            🔧 Technical Implementation
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-green-800 mb-2">Backend (WebSocket Server)</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Node.js WebSocket server with authentication</li>
                <li>• Real-time message processing</li>
                <li>• Session management and conversation history</li>
                <li>• Integration with AI services</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-green-800 mb-2">Frontend (React Component)</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• WebSocket client with auto-reconnection</li>
                <li>• Speech recognition integration</li>
                <li>• Real-time UI updates</li>
                <li>• Connection health monitoring</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-4">
            📋 How to Use
          </h2>
          <ol className="text-sm text-yellow-800 space-y-2">
            <li><strong>1.</strong> Click the green phone button to start the real-time conversation</li>
            <li><strong>2.</strong> Wait for the WebSocket connection to establish (you'll see "Connected" status)</li>
            <li><strong>3.</strong> Start talking naturally - the AI will respond instantly</li>
            <li><strong>4.</strong> Continue the conversation without clicking anything</li>
            <li><strong>5.</strong> Say "stop", "goodbye", or click the red phone button to end</li>
          </ol>
        </div>
      </div>
    </div>
  );
}