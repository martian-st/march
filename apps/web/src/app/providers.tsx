import { MyRuntimeProvider } from "@/components/provider/my-runtime-provider";
import { AuthProvider } from "@/contexts/auth-context";
import QueryProvider from "@/components/provider/query-client-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ErrorBoundary } from "@/components/error/error-boundary";
import React from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Get Google Client ID and handle missing environment variable
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  
  // Simple error fallback without event handlers for SSR compatibility
  const errorFallback = (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial', 
      textAlign: 'center',
      backgroundColor: '#fee',
      color: '#900',
      border: '1px solid #faa'
    }}>
      <h1>🚨 Application Error</h1>
      <p>An error occurred while loading the application.</p>
      <p>Please check the browser console for detailed error information.</p>
      <p>Try refreshing the page or contact support if the issue persists.</p>
    </div>
  );
  
  // If Google Client ID is missing, still render children but without Google OAuth
  if (!googleClientId) {
    return (
      <ErrorBoundary fallback={errorFallback}>
        <AuthProvider>
          <MyRuntimeProvider>
            <QueryProvider>{children}</QueryProvider>
          </MyRuntimeProvider>
        </AuthProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={errorFallback}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <MyRuntimeProvider>
            <QueryProvider>{children}</QueryProvider>
          </MyRuntimeProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
