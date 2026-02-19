"use client";

import { GOOGLE_SCOPES } from "@/lib/constants";

export default function SignInPage() {
  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri =
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ||
      `${window.location.origin}/api/auth/google`;

    const params = new URLSearchParams({
      client_id: clientId || "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="text-center">
        <h1 className="text-lg font-medium text-gray-900 mb-1">Brain</h1>
        <p className="text-xs text-gray-400">Your second brain for email</p>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="px-5 py-2 text-sm text-gray-400 hover:text-gray-900 transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  );
}
