import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WebSocketMessage } from "@/types/objects";
import { QUERY_KEYS } from "@/hooks/use-objects";
import { getSession } from "@/actions/session";

/* eslint-disable @typescript-eslint/no-explicit-any */

const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080";

interface WebSocketContextType {
  isConnected: boolean;
  messages: any[];
  sendMessage: (message: any, isBinary?: boolean) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

let socketInstance: WebSocket | null = null;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeWebSocket = async () => {
      if (socketInstance) {
        return;
      }

      try {
        const session = await getSession();
        
        // Don't try to connect if no session or backend URL is not available
        if (!session || !WEBSOCKET_URL || WEBSOCKET_URL.includes('localhost')) {
          console.log('Skipping WebSocket connection - no session or backend not available');
          return;
        }
        
        socketInstance = new WebSocket(WEBSOCKET_URL, session);

        socketInstance.onopen = () => {
          setIsConnected(true);
        };

        socketInstance.onmessage = async (event) => {
          try {
            let message: WebSocketMessage;
            if (
              event.data instanceof Blob ||
              event.data instanceof ArrayBuffer
            ) {
              const arrayBuffer =
                event.data instanceof Blob
                  ? await event.data.arrayBuffer()
                  : event.data;
              const textDecoder = new TextDecoder("utf-8");
              const decodedMessage = textDecoder.decode(arrayBuffer);
              message = JSON.parse(decodedMessage);
            } else {
              message = JSON.parse(event.data.toString());
            }

            if (message?.type !== "linear") return;
            const { item, action } = message;

            // Handle different actions
            if (action === "delete" || action === "unassigned") {
              // Immediately invalidate queries to force a refresh
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.INBOX,
              });
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.TODAY,
              });

              // Also update the cache immediately
              [QUERY_KEYS.INBOX, QUERY_KEYS.TODAY].forEach((queryKey) => {
                queryClient.setQueryData(queryKey, (old: any) => {
                  if (!old?.response) return old;

                  if (queryKey === QUERY_KEYS.INBOX) {
                    return {
                      ...old,
                      response: old.response.filter(
                        (i: any) => i._id !== item._id
                      ),
                    };
                  }

                  // Handle today objects
                  return {
                    ...old,
                    response: {
                      todayObjects: (old.response.todayObjects || []).filter(
                        (i: any) => i._id !== item._id
                      ),
                      overdueObjects: (
                        old.response.overdueObjects || []
                      ).filter((i: any) => i._id !== item._id),
                    },
                  };
                });
              });
            } else if (action === "create" || action === "update") {
              // Immediately invalidate queries to force a refresh
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.INBOX,
              });
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.TODAY,
              });

              // Also update the cache immediately
              [QUERY_KEYS.INBOX, QUERY_KEYS.TODAY].forEach((queryKey) => {
                queryClient.setQueryData(queryKey, (old: any) => {
                  if (!old?.response) return old;

                  if (queryKey === QUERY_KEYS.INBOX) {
                    const existingItems = old.response.filter(
                      (i: any) => i._id !== item._id
                    );
                    return {
                      ...old,
                      response:
                        action === "create"
                          ? [item, ...existingItems] // Add new items at the start
                          : existingItems.map((i: any) =>
                              i._id === item._id ? item : i
                            ), // Update existing item
                    };
                  }

                  // Handle today objects
                  const existingTodayItems = (
                    old.response.todayObjects || []
                  ).filter((i: any) => i._id !== item._id);
                  const existingOverdueItems = (
                    old.response.overdueObjects || []
                  ).filter((i: any) => i._id !== item._id);

                  return {
                    ...old,
                    response: {
                      todayObjects:
                        action === "create"
                          ? [item, ...existingTodayItems] // Add new items at the start
                          : existingTodayItems.map((i: any) =>
                              i._id === item._id ? item : i
                            ), // Update existing item
                      overdueObjects: existingOverdueItems,
                    },
                  };
                });
              });
            }

            setMessages((prev) => [...prev, message]);
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };

        socketInstance.onclose = () => {
          setIsConnected(false);
          socketInstance = null;
        };

        socketInstance.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Error initializing WebSocket:", error);
      }
    };

    initializeWebSocket();

    // Keep connection alive with ping
    const pingInterval = setInterval(() => {
      if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
        socketInstance.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);

    return () => {
      if (socketInstance) {
        socketInstance.close();
        socketInstance = null;
      }
      clearInterval(pingInterval);
    };
  }, [queryClient]);

  const sendMessage = (message: any, isBinary: boolean = false) => {
    if (socketInstance && socketInstance.readyState === WebSocket.OPEN) {
      const msgToSend = isBinary
        ? new TextEncoder().encode(JSON.stringify(message))
        : JSON.stringify(message);
      socketInstance.send(msgToSend);
    } else {
      console.warn("Cannot send message, WebSocket is not open");
    }
  };

  const value = {
    isConnected,
    messages,
    sendMessage,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
