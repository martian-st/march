import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ACCESS_TOKEN, BACKEND_URL, PUBLIC_PATHS } from "@/lib/constants";

interface TokenVerificationResponse {
  isValidUser: boolean;
}

interface TokenCache {
  [token: string]: {
    valid: boolean;
    timestamp: number;
  };
}

// In-memory cache (will be reset on server restart)
const tokenVerificationCache: TokenCache = {};

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

const PUBLIC_PATH_ARRAY = [PUBLIC_PATHS.HOME, PUBLIC_PATHS.SIGNIN] as const;

// Token verification with caching
async function verifyToken(token: string): Promise<boolean> {
  // Check cache first
  const cachedResult = tokenVerificationCache[token];
  const now = Date.now();
  
  if (cachedResult && (now - cachedResult.timestamp) < CACHE_EXPIRATION) {
    // Use cached result if it's still valid
    return cachedResult.valid;
  }
  
  // If not in cache or expired, verify with backend
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${BACKEND_URL}/auth/user-verification/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as TokenVerificationResponse;
    const isValid = data.isValidUser;
    
    // Update cache
    tokenVerificationCache[token] = {
      valid: isValid,
      timestamp: now
    };
    
    return isValid;
  } catch (error) {
    console.error(
      "Token verification failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    // Cache the failure to avoid repeated calls
    tokenVerificationCache[token] = {
      valid: false,
      timestamp: now
    };
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without authentication
  if (PUBLIC_PATH_ARRAY.includes(pathname as any)) {
    return NextResponse.next();
  }

  // Get the token from cookies
  const token = request.cookies.get(ACCESS_TOKEN)?.value;

  if (!token) {
    // No token, redirect to signin
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // Verify the token
  const isValid = await verifyToken(token);

  if (!isValid) {
    // Invalid token, redirect to signin
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // Token is valid, allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
