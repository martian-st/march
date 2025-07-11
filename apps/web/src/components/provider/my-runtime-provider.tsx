"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  TextContentPart,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
// import { apiClient } from "@/lib/api";
import axios from "axios";
import { BACKEND_URL } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { extractMessageData } from "@/lib/utils";

interface MyModelAdapterConfig {
  session: string;
}

const createModelAdapter = (
  config: MyModelAdapterConfig
): ChatModelAdapter => ({
  async run({ messages, abortSignal }) {
    try {
      // Get the last message and extract its text content
      const lastMessage = messages[messages.length - 1];
      const textContent =
        lastMessage.content.find(
          (part): part is TextContentPart => part.type === "text"
        )?.text || "";

      if (!config.session) {
        throw new Error("No session available");
      }

      const data = await axios.get(
        `${BACKEND_URL}/ai/ask?query=${encodeURIComponent(textContent)}`,
        {
          headers: {
            Authorization: `Bearer ${config.session}`,
          },
          signal: abortSignal,
          timeout: 10000, // 10 second timeout
        }
      );

      const text = extractMessageData(data);

      return {
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      };
    } catch (error) {
      console.error("AI request failed:", error);
      return {
        content: [
          {
            type: "text",
            text: "Sorry, I'm unable to process your request right now. Please try again later.",
          },
        ],
      };
    }
  },
});

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { session, loading } = useAuth();
  
  // Don't render the AI runtime if we're still loading or have no session
  if (loading) {
    return <>{children}</>;
  }
  
  // If no session, render children without AI runtime
  if (!session) {
    return <>{children}</>;
  }
  
  try {
    const modelAdapter = createModelAdapter({ session });
    const runtime = useLocalRuntime(modelAdapter);

    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    );
  } catch (error) {
    console.error("Error initializing AI runtime:", error);
    // Fallback: render children without AI runtime
    return <>{children}</>;
  }
}
