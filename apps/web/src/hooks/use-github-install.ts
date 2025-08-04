import { useState } from "react";
import { useCallback } from "react";

export const useGithubInstall = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGithubInstall = useCallback(async () => {
    try {
      setIsLoading(true);

      const url = process.env.NEXT_PUBLIC_GITHUB_APP_URL;
      if (!url) {
        throw new Error("GITHUB_INSTALL_URL is not set");
      }

      // Create a URL object to manipulate the URL
      const githubUrl = new URL(url);
      
      // Set the redirect_uri to our frontend callback
      const frontendUrl = window.location.origin;
      githubUrl.searchParams.append('redirect_uri', `${frontendUrl}/github/callback`);
      
      // Redirect to GitHub for installation
      window.location.href = githubUrl.toString();
    } catch (error) {
      console.error("Failed to install Github app:", error);
    }
  }, []);

  return { isLoading, handleGithubInstall };
};
