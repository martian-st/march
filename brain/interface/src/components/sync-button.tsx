"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");
  const [result, setResult] = useState<string>("");
  const [hovered, setHovered] = useState(false);

  const handleSync = async () => {
    if (state === "syncing") return;
    setState("syncing");
    try {
      const res = await fetch("/api/gmail/sync", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setResult(`Synced ${data.synced}`);
      } else {
        setResult(data.error || "Failed");
      }

      setState("done");
      router.refresh();

      setTimeout(() => {
        setState("idle");
        setResult("");
      }, 3000);
    } catch {
      setResult("Failed");
      setState("done");
      setTimeout(() => {
        setState("idle");
        setResult("");
      }, 3000);
    }
  };

  const tooltipLabel = state === "syncing" ? "Syncing..." : state === "done" ? result : "Sync";

  return (
    <div className="relative">
      <button
        onClick={handleSync}
        disabled={state === "syncing"}
        className={`
          flex items-center justify-center w-10 h-10
          transition-all duration-200 ease-out
          disabled:opacity-50 disabled:cursor-not-allowed
          ${state === "syncing" ? "text-gray-600 animate-spin" : "text-gray-400 hover:text-gray-600"}
        `}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Sync emails"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
        </svg>
      </button>

      {/* Tooltip */}
      <div
        className={`
          absolute left-full ml-3 top-1/2 -translate-y-1/2
          px-3 py-1.5 bg-gray-900 text-white
          text-xs font-medium rounded-lg shadow-lg
          transition-all duration-200 ease-out
          pointer-events-none whitespace-nowrap
          ${hovered || state === "done" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}
        `}
      >
        {tooltipLabel}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </div>
    </div>
  );
}
