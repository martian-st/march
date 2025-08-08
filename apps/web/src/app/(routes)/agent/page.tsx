'use client';

import VoiceEnabledAIChat from '@/components/VoiceEnabledAIChat';
import { ErrorBoundary } from "@/components/error/error-boundary";

export default function AgentPage() {
  return (
    <section className="h-full">
      <div className="w-full h-[calc(100vh-64px)]">
        <ErrorBoundary
          fallback={<div>Error loading AI chat. Please try again later.</div>}
        >
          <VoiceEnabledAIChat />
        </ErrorBoundary>
      </div>
    </section>
  );
}
