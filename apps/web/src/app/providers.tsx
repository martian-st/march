import { MyRuntimeProvider } from "@/components/provider/my-runtime-provider";
import { AuthProvider } from "@/contexts/auth-context";
import QueryProvider from "@/components/provider/query-client-provider";
// import { GoogleOAuthProvider } from "@react-oauth/google";
import { ErrorBoundary } from "@/components/error/error-boundary";
import React from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Google OAuth provider temporarily disabled
  // const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  
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
  
  // Google OAuth provider temporarily disabled
  /*
  // Always render with GoogleOAuthProvider, even if clientId is empty string
  // This ensures components that use Google OAuth hooks won't break
  const clientId = googleClientId || "";
  
  // Log warning in development if Google Client ID is missing
  if (!googleClientId && process.env.NODE_ENV === "development") {
    console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Google OAuth functionality will not work properly.");
  }
  */

  return (
    <ErrorBoundary fallback={errorFallback}>
      {/* GoogleOAuthProvider temporarily disabled */}
      {/* <GoogleOAuthProvider clientId={clientId}> */}
        <AuthProvider>
          <MyRuntimeProvider>
            <QueryProvider>{children}</QueryProvider>
          </MyRuntimeProvider>
        </AuthProvider>
      {/* </GoogleOAuthProvider> */}
    </ErrorBoundary>
  );
}
