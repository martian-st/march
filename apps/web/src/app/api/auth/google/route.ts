import {
  ACCESS_TOKEN,
  BACKEND_URL,
  FRONTEND_URL,
  REFRESH_TOKEN,
} from "@/lib/constants";
import { GoogleAuthResponse } from "@/types/auth";
import axios, { AxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const encodedCode = searchParams.get("code");
  const redirectUrl = FRONTEND_URL + "/signin";

  if (!encodedCode) {
    return NextResponse.redirect(redirectUrl);
  }

  const code = decodeURIComponent(encodedCode);

  let res: GoogleAuthResponse;

  try {
    const { data } = await axios.post(
      `${BACKEND_URL}/auth/google/login`,
      null,
      {
        headers: {
          "x-google-auth": code,
        },
      }
    );

    res = data as GoogleAuthResponse;
  } catch (error) {
    const e = error as AxiosError;
    console.error("google auth error - full error object:", e);
    if (e.response?.status === 401) {
      console.error("google auth error - response data:", e.response?.data);
    } else {
      console.error("google auth error - cause:", e.cause);
    }
    return NextResponse.redirect(new URL("/signin", redirectUrl));
  }

  if (!res.accessToken) {
    console.error("access token is missing from the response");
    return NextResponse.redirect(new URL("/signin", redirectUrl));
  }

  const response = NextResponse.redirect(new URL("/agenda", redirectUrl));

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
