import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

interface UseLinearLoginReturn {
  handleLinearLogin: () => Promise<void>;
  handleLinearRevoke: () => Promise<void>;
}

export function useLinearLogin(
  redirectAfterAuth: string,
  redirectAfterRevoke: string = redirectAfterAuth,
): UseLinearLoginReturn {
  const router = useRouter();

  const handleLinearLogin = useCallback(async () => {
    try {
      const { authUrl } = await apiClient.internal.get<{ authUrl: string }>(
        `/api/auth/linear-url?redirectTo=${encodeURIComponent(redirectAfterAuth)}`,
      );

      if (!authUrl) {
        throw new Error("No auth URL received");
      }

      console.log("Redirecting to Linear OAuth URL:", authUrl);
      window.location.href = authUrl;
    } catch (err) {
      console.error("failed to login to linear", err);
      toast.error("Failed to login to linear");
    }
  }, [redirectAfterAuth]);

  const handleLinearRevoke = useCallback(async () => {
    try {
      const response = await apiClient.post("/linear/revoke-access/");

      if (!response) {
        throw new Error("failed to revoke linear access");
      }
      router.push(redirectAfterRevoke);
    } catch (error) {
      console.error("failed to revoke linear access", error);
      toast.error("Failed to revoke linear access");
    }
  }, [router, redirectAfterRevoke]);

  return { handleLinearLogin, handleLinearRevoke };
}

