"use client";

import { Button } from "@/components/ui/button";
import useGitHubLogin from "@/hooks/use-github-login";
// import useGoogleAuth from "@/hooks/use-google-login";
import { Github } from "lucide-react";

export default function SignInPage() {
  // const { handleGoogleLogin } = useGoogleAuth();
  const { handleGithubLogin } = useGitHubLogin();

  return (
    <div className="flex flex-col gap-4 justify-center items-center h-screen">
      {/* Google login button commented out temporarily
      <Button
        variant={"outline"}
        className="rounded-xl flex items-center gap-2 px-4 py-2 min-w-[220px]"
        onClick={handleGoogleLogin}
      >
        <span className="font-semibold text-base" style={{ color: "#24292F" }}>G</span>
        <span className="text-sm font-medium">Continue with Google</span>
      </Button>
      */}
      <Button
        variant={"outline"}
        className="rounded-xl flex items-center gap-2 px-4 py-2 min-w-[220px]"
        onClick={handleGithubLogin}
      >
        <Github size={20} />
        <span className="text-sm font-medium">Continue with GitHub</span>
      </Button>
    </div>
  );
}
