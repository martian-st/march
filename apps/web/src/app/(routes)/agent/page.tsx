'use client';

import EnhancedAIChat from '@/components/EnhancedAIChat';
import { ErrorBoundary } from "@/components/error/error-boundary";

export default function AgentPage() {
  return (
    <section className="h-full">
      <div className="w-full h-[calc(100vh-64px)]">
        <ErrorBoundary
          fallback={<div>Error loading AI chat. Please try again later.</div>}
        >
          <EnhancedAIChat />
        </ErrorBoundary>
      </div>
    </section>
  );
}
