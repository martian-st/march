"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

export default function GitHubCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code and installation_id from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const installationId = urlParams.get("installation_id");

        if (!code || !installationId) {
          setError("Missing required parameters");
          setLoading(false);
          return;
        }

        // Call the backend API with the code and installation_id
        await apiClient.get(`/github/callback?code=${code}&installation_id=${installationId}`);

        // Redirect to inbox on success
        router.push("/inbox");
      } catch (err) {
        console.error("Failed to complete GitHub installation:", err);
        setError("Failed to complete GitHub installation");
        setLoading(false);
      }
    };

    handleCallback();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Completing GitHub Installation...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => router.push("/agenda")}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go to Agenda
        </button>
      </div>
    );
  }

  return null;
}
