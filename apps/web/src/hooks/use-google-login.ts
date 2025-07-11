"use client";

import { useCallback, useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { FRONTEND_URL } from "@/lib/constants";

const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProviderAvailable, setIsProviderAvailable] = useState(false);
  
  // Check if we're in a browser environment and if the Google OAuth provider is available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // This will throw an error if GoogleOAuthProvider is not available
        setIsProviderAvailable(true);
      } catch (err) {
        console.error("Google OAuth provider not available:", err);
        setError("Google authentication is not available at the moment");
        setIsProviderAvailable(false);
      }
    }
  }, []);

  // Only initialize the login hook if the provider is available
  const googleLogin = isProviderAvailable ? useGoogleLogin({
    onError: (error) => {
      console.error("Google login failed:", error);
      setError("Failed to authenticate with Google");
      setIsLoading(false);
    },
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: `${FRONTEND_URL}/api/auth/google`,
  }) : undefined;

  const handleGoogleLogin = useCallback(async () => {
    try {
      if (!isProviderAvailable || !googleLogin) {
        throw new Error("Google OAuth provider is not available");
      }
      
      setIsLoading(true);
      setError(null);
      await googleLogin();
    } catch (error) {
      console.error("Google login error:", error);
      setError((error as Error).message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [googleLogin, isProviderAvailable]);

  return {
    handleGoogleLogin,
    isLoading,
    error,
  };
};

export default useGoogleAuth;
