import { MyRuntimeProvider } from "@/components/provider/my-runtime-provider";
import { AuthProvider } from "@/contexts/auth-context";
import QueryProvider from "@/components/provider/query-client-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ErrorBoundary } from "@/components/error/error-boundary";
import React from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Get Google Client ID and handle missing environment variable
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  
  // If Google Client ID is missing, still render children but without Google OAuth
  if (!googleClientId) {
    console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set - Google OAuth will be disabled");
    return (
      <ErrorBoundary fallback={<div>Error loading application. Please refresh the page.</div>}>
        <AuthProvider>
          <MyRuntimeProvider>
            <QueryProvider>{children}</QueryProvider>
          </MyRuntimeProvider>
        </AuthProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={<div>Error loading application. Please refresh the page.</div>}>
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
