"use client";

import React, { createContext, useState, useEffect, useContext } from "react";

import { clearSession, getSession } from "@/actions/session";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

interface AuthContextType {
  session: string;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [session, setSession] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadSessionFromCookie(): Promise<void> {
      try {
        setLoading(true);
        setError(null);
        const session = await getSession();
        setSession(session || "");
      } catch (error) {
        console.error("Failed to load session", error);
        setError("Failed to load session");
        setSession(""); // Ensure session is empty on error
      } finally {
        setLoading(false);
      }
    }
    
    // Add a small delay to prevent hydration issues
    const timeoutId = setTimeout(() => {
      void loadSessionFromCookie();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  /**
   * Logs out the user.
   */
  const signOut = async (): Promise<void> => {
    try {
      console.log("Signing out...");
      // First call the backend to invalidate the token
      if (session) {
        try {
          await apiClient.post('/auth/logout/');
          console.log('Successfully logged out on server');
        } catch (apiError) {
          console.error("Backend logout error", apiError);
          // Continue with local logout even if backend call fails
        }
      }
      
      // Then clear the local session
      await clearSession();
      
      // Clear the session state
      setSession("");
      
      // Use window.location for a full page refresh to avoid React router issues
      window.location.href = '/signin';
    } catch (error) {
      console.error("Logout error", error);
      // Fallback: manually clear session and redirect with full page refresh
      setSession("");
      window.location.href = '/signin';
    }
  };

  const value = { session, loading, signOut };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        {error}
        <br />
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
