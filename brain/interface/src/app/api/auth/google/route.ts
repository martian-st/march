import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForTokens,
  fetchGoogleUserProfile,
} from "@/lib/google";
import { createSessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(error)}`, appUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/signin?error=no_code", appUrl));
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/signin?error=no_access_token", appUrl)
      );
    }

    // Fetch user profile from Google
    const profile = await fetchGoogleUserProfile(tokens.access_token);

    // Upsert user record
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      create: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
      },
      update: {
        name: profile.name,
        avatarUrl: profile.picture,
      },
    });

    // Calculate token expiry (Google tokens typically expire in 1 hour)
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Upsert Gmail tokens
    await prisma.gmailTokens.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || "",
        expiresAt,
        email: profile.email,
      },
      update: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
        expiresAt,
      },
    });

    // Create session JWT
    const sessionToken = await createSessionToken(user.id, user.email);

    // Set cookie and redirect to inbox
    const response = NextResponse.redirect(new URL("/", appUrl));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/signin?error=auth_failed", appUrl)
    );
  }
}
