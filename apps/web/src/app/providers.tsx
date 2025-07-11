import { MyRuntimeProvider } from "@/components/provider/my-runtime-provider";
import { AuthProvider } from "@/contexts/auth-context";
import QueryProvider from "@/components/provider/query-client-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ErrorBoundary } from "@/components/error/error-boundary";
import React from "react";

// Enhanced error fallback component
function ErrorFallback() {
  return (
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
      <p>Check the browser console for detailed error information.</p>
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.reload()}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#900', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Refresh Page
        </button>
        <a 
          href="/emergency" 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#090', 
            color: 'white', 
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Emergency Page
        </a>
      </div>
    </div>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // Get Google Client ID and handle missing environment variable
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  
  console.log("Providers: Google Client ID available:", !!googleClientId);
  
  // If Google Client ID is missing, still render children but without Google OAuth
  if (!googleClientId) {
    console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set - Google OAuth will be disabled");
    return (
      <ErrorBoundary fallback={<ErrorFallback />}>
        <AuthProvider>
          <MyRuntimeProvider>
            <QueryProvider>{children}</QueryProvider>
          </MyRuntimeProvider>
        </AuthProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
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
