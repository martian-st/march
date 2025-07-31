"use server"

import { ACCESS_TOKEN, REFRESH_TOKEN } from "@/lib/constants"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Asynchronously retrieves the session token.
 * @returns A Promise that resolves to a string representing the session token.
 */
const getSession = async (): Promise<string> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_TOKEN)
  const session = token?.value
  return session ?? ""
}

/**
 * Asynchronously sets the session token.
 * @param session The session token to set.
 * @returns A Promise that resolves to void.
 */
const setSession = async (session: string): Promise<void> => {
  const cookieStore = await cookies()
  cookieStore.set(ACCESS_TOKEN, session, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })
  return redirect("/today")
}

/**
 * Asynchronously clears the session token.
 * @returns A Promise that resolves to void.
 */
const clearSession = async (): Promise<void> => {
  const cookieStore = await cookies()
  cookieStore.delete(ACCESS_TOKEN)
  cookieStore.delete(REFRESH_TOKEN) // Also clear the refresh token
  // Don't redirect here, let the calling function handle navigation
}

export { getSession, setSession, clearSession }