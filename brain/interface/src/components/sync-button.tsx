"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");
  const [result, setResult] = useState<string>("");

  const handleSync = async () => {
    if (state === "syncing") return;
    setState("syncing");
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setResult(`synced ${data.synced}`);
      } else {
        setResult(data.error || "failed");
      }

      setState("done");
      router.refresh();

      setTimeout(() => {
        setState("idle");
        setResult("");
      }, 3000);
    } catch {
      setResult("failed");
      setState("done");
      setTimeout(() => {
        setState("idle");
        setResult("");
      }, 3000);
    }
  };

  const label = state === "syncing" ? "syncing..." : state === "done" ? result : "sync";

  return (
    <button
      onClick={handleSync}
      disabled={state === "syncing"}
      className="text-sm text-gray-400 hover:text-gray-900 transition-all duration-200 ease-out disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}
