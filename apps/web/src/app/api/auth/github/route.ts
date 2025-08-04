import {
  ACCESS_TOKEN,
  BACKEND_URL,
  FRONTEND_URL,
  REFRESH_TOKEN,
} from "@/lib/constants";
import { GitHubAuthResponse } from "@/types/auth";
import axios, { AxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const encodedCode = searchParams.get("code");
  const redirectUrl = FRONTEND_URL + "/signin";

  if (!encodedCode) {
    console.error("No code received from GitHub");
    return NextResponse.redirect(new URL("/login?error=no_code", redirectUrl));
  }

  const code = decodeURIComponent(encodedCode);

  let res: GitHubAuthResponse;

  try {
    const { data } = await axios.get(`${BACKEND_URL}/auth/github/login`, {
      params: { code },
    });

    res = data as GitHubAuthResponse;
  } catch (error) {
    const e = error as AxiosError;

    if (e.response?.status === 401) {
      console.error("github auth error", e.response?.data);
    } else {
      console.error("github auth error", e.cause);
    }

    return NextResponse.redirect(new URL("/signin", redirectUrl));
  }

  if (!res.accessToken) {
    console.error("access token is missing from the response");
    return NextResponse.redirect(new URL("/signin", redirectUrl));
  }

  const response = NextResponse.redirect(new URL("/inbox", redirectUrl));

  response.cookies.set(ACCESS_TOKEN, res.accessToken, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  response.cookies.set(REFRESH_TOKEN, res.refreshToken, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
