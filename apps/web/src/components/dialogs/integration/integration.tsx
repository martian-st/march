"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, UserCircle } from "lucide-react";
import { useState } from "react";
import { IntegrationsDialog } from "./integrations-dialog";
import { useUser } from "@/hooks/use-user";
import Image from "next/image";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function IntegrationMenu() {
  const { signOut } = useAuth();
  const { data: user, isLoading } = useUser();
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const userName = localStorage.getItem("userName");
  const userAvatar = localStorage.getItem("userAvatar");

  if (isLoading) {
    return (
      <button
        className={cn(
          "flex items-center text-sm w-full rounded-md transition-colors",
          isCollapsed ? "justify-center py-3 px-0 mx-auto" : "gap-3 px-4 py-2.5"
        )}
      >
        {userAvatar ? (
          <Image
            src={userAvatar}
            alt="avatar"
            width={isCollapsed ? 28 : 20}
            height={isCollapsed ? 28 : 20}
            className="rounded-full"
          />
        ) : (
          <UserCircle
            className={cn(
              "text-[#6E6E6E]",
              isCollapsed ? "h-7 w-7" : "h-5 w-5"
            )}
          />
        )}
        {!isCollapsed && <span>{userName}</span>}
      </button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center text-sm w-full hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
              isCollapsed
                ? "justify-center py-3 px-0 mx-auto"
                : "gap-3 px-4 py-2.5"
            )}
          >
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt="avatar"
                width={isCollapsed ? 28 : 20}
                height={isCollapsed ? 28 : 20}
                className="rounded-full"
              />
            ) : (
              <UserCircle
                className={cn(
                  "text-[#6E6E6E]",
                  isCollapsed ? "h-7 w-7" : "h-5 w-5"
                )}
              />
            )}
            {!isCollapsed && <span>{user?.fullName ?? userName}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onSelect={() => setIntegrationsOpen(true)}>
            <Settings className="mr-2 h-4 w-4 text-foreground/70" />
            <span>Integrations</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4 text-foreground/70" />
            <Button variant={"ghost"}>Log out</Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <IntegrationsDialog
        open={integrationsOpen}
        onOpenChange={setIntegrationsOpen}
      />
    </>
  );
}
