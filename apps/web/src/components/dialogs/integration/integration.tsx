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
          "flex items-center text-sm w-full py-3 px-3 rounded-lg transition-colors duration-200",
          isCollapsed ? "justify-center" : "gap-3"
        )}
      >
        {userAvatar ? (
          <Image
            src={userAvatar}
            alt="avatar"
            width={isCollapsed ? 24 : 20}
            height={isCollapsed ? 24 : 20}
            className="rounded-full"
          />
        ) : (
          <UserCircle
            className={cn(
              "text-gray-500",
              isCollapsed ? "h-6 w-6" : "h-5 w-5"
            )}
          />
        )}
        {!isCollapsed && <span className="text-gray-700 font-medium">{userName}</span>}
      </button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center text-sm w-full py-3 px-3 rounded-lg transition-colors duration-200 hover:bg-gray-50",
              isCollapsed ? "justify-center" : "gap-3"
            )}
          >
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt="avatar"
                width={isCollapsed ? 24 : 20}
                height={isCollapsed ? 24 : 20}
                className="rounded-full"
              />
            ) : (
              <UserCircle
                className={cn(
                  "text-gray-500",
                  isCollapsed ? "h-6 w-6" : "h-5 w-5"
                )}
              />
            )}
            {!isCollapsed && <span className="text-gray-700 font-medium">{user?.fullName ?? userName}</span>}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 border-gray-200">
          <DropdownMenuItem onSelect={() => setIntegrationsOpen(true)} className="hover:bg-gray-50">
            <Settings className="mr-2 h-4 w-4 text-gray-500" />
            <span className="text-gray-700">Integrations</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-200" />
          <DropdownMenuItem onSelect={() => signOut()} className="hover:bg-gray-50">
            <LogOut className="mr-2 h-4 w-4 text-gray-500" />
            <span className="text-gray-700">Log out</span>
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
