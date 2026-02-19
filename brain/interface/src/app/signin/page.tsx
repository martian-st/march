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
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-1">Brain</h1>
        <p className="text-sm text-muted">Your second brain for email</p>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="px-6 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-foreground hover:text-background transition-colors"
      >
        Sign in with Google
      </button>
    </div>
  );
}
