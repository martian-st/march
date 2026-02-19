"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");
  const [result, setResult] = useState<string>("");

  const handleSync = async () => {
    setState("syncing");
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setResult(`Synced ${data.synced} email${data.synced !== 1 ? "s" : ""}`);
      } else {
        setResult(data.error || "Sync failed");
      }

      setState("done");
      router.refresh();

      // Reset after 3 seconds
      setTimeout(() => {
        setState("idle");
        setResult("");
      }, 3000);
    } catch {
      setResult("Sync failed");
      setState("done");
      setTimeout(() => {
        setState("idle");
        setResult("");
      }, 3000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {state === "done" && (
        <span className="text-xs text-muted">{result}</span>
      )}
      <button
        onClick={handleSync}
        disabled={state === "syncing"}
        className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state === "syncing" ? "Syncing..." : "Sync Emails"}
      </button>
    </div>
  );
}
