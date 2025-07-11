import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FRONTEND_URL } from "@/lib/constants";

const useGitHubLogin = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGithubLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
      const GITHUB_SCOPE = "user:email";
      const GITHUB_REDIRECT_URI = `${FRONTEND_URL}/api/auth/github`;

      if (!GITHUB_CLIENT_ID) {
        throw new Error("GitHub Client ID is not set");
      }

      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${GITHUB_SCOPE}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}`;
      router.push(githubAuthUrl);
    } catch (error) {
      console.error("Failed to initiate GitHub login:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to initiate GitHub login"
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    handleGithubLogin,
    isLoading,
    error,
  };
};

export default useGitHubLogin;
