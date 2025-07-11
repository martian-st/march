import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

const useGitHubLogin = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGithubLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

      console.log("github: ",GITHUB_CLIENT_ID);
      const GITHUB_SCOPE = "user:email";

      if (!GITHUB_CLIENT_ID) {
        throw new Error("GitHub Client ID is not set");
      }

      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${GITHUB_SCOPE}`;
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
