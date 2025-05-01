"use client";

import { toast } from "sonner";
import { Button } from "./ui/button";

export function TestToast() {
  const handleClick = () => {
    toast.success("Test toast notification", {
      duration: 3000,
      position: "top-right"
    });
  };

  return (
    <div className="p-4">
      <Button onClick={handleClick} variant="outline">
        Test Toast Notification
      </Button>
    </div>
  );
}
