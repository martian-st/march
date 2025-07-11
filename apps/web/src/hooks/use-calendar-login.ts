"use client"

import { useCallback, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FRONTEND_URL } from "@/lib/constants"
import { apiClient } from "@/lib/api"
import { useGoogleLogin } from "@react-oauth/google"

const useGoogleCalendar = (
  redirectAfterAuth: string,
  redirectAfterRevoke: string = redirectAfterAuth 
): {
  handleCalendarLogin: () => Promise<void>,
  handleRevokeAccess: () => Promise<void>,
  isLoading: boolean,
  error: string | null
} => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProviderAvailable, setIsProviderAvailable] = useState(false)
  
  // Check if we're in a browser environment and if the Google OAuth provider is available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // This will throw an error if GoogleOAuthProvider is not available
        setIsProviderAvailable(true)
      } catch (err) {
        console.error("Google OAuth provider not available:", err)
        setError("Google Calendar authentication is not available at the moment")
        setIsProviderAvailable(false)
      }
    }
  }, [])
  
  // Only initialize the login hook if the provider is available
  const googleCalendarLogin = isProviderAvailable ? useGoogleLogin({
    onError: (error) => {
      console.error("Google Calendar login failed:", error)
      setError("Failed to authenticate with Google Calendar")
      setIsLoading(false)
    },
    flow: "auth-code",
    ux_mode: "redirect",
    redirect_uri: `${FRONTEND_URL}/api/auth/google-calendar`,
    scope: "https://www.googleapis.com/auth/calendar",
    state: JSON.stringify({ redirect: redirectAfterAuth }),
  }) : undefined
  
  const handleCalendarLogin = useCallback(async () => {
    try {
      if (!isProviderAvailable || !googleCalendarLogin) {
        throw new Error("Google OAuth provider is not available")
      }
      
      setIsLoading(true)
      setError(null)
      await googleCalendarLogin()
    } catch (error) {
      console.error("Failed to initiate Google Calendar login:", error)
      setError((error as Error).message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [googleCalendarLogin, isProviderAvailable])
  
  const handleRevokeAccess = useCallback(async () => {
    try {
      const response = await apiClient.get("/calendar/revoke-access/")
      
      if (!response) {
        throw new Error(`Failed to revoke access`)
      }
      
      router.push(redirectAfterRevoke)
    } catch (error) {
      console.error("Failed to revoke Google Calendar access:", error)
    }
  }, [router, redirectAfterRevoke])
  
  return { handleCalendarLogin, handleRevokeAccess, isLoading, error }
}

export default useGoogleCalendar