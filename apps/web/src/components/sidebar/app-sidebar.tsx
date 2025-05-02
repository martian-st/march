"use client";
import { Calendar, Inbox, Database, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "@/components/provider/command-palette-provider";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import IntegrationMenu from "../dialogs/integration/integration";

// Custom styles to override hover effects
const noHoverStyles =
  "!hover:bg-transparent !hover:text-inherit !active:bg-transparent !data-[active=true]:bg-transparent";

export function AppSidebar() {
  const pathname = usePathname();
  const { openCommandPalette } = useCommandPalette();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="bg-white border-r">
      <SidebarHeader>
        <div className="p-4 flex justify-start pl-4">
          {/* Empty header space */}
        </div>
      </SidebarHeader>
      <SidebarContent className="mt-2">
        <SidebarMenu>
          {/* Search Button */}
          <SidebarMenuItem>
            <SidebarMenuButton
              className={cn(
                noHoverStyles,
                "flex items-center gap-3 w-full p-2 rounded-md"
              )}
              onClick={openCommandPalette}
            >
              <div className="flex items-center gap-3 w-full">
                <Search
                  className={cn(
                    "text-gray-800",
                    isCollapsed ? "h-7 w-7" : "h-5 w-5"
                  )}
                />
                {!isCollapsed && (
                  <div className="flex justify-between w-full">
                    <span>Search</span>
                    <kbd className="flex h-5 items-center gap-1 rounded border bg-gray-50 px-1.5 text-[10px] font-medium text-gray-500">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </div>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild className={noHoverStyles}>
              <Link
                href="/inbox"
                className={cn(
                  "flex items-center text-sm rounded-md",
                  isCollapsed
                    ? "justify-center py-3 px-0 mx-auto w-full"
                    : "gap-3 px-4 py-2.5",
                  pathname === "/inbox"
                    ? "text-black font-medium"
                    : "text-[#6E6E6E]"
                )}
              >
                <Inbox
                  className={cn(
                    pathname === "/inbox" ? "text-black" : "text-[#6E6E6E]",
                    isCollapsed ? "h-7 w-7" : "h-5 w-5"
                  )}
                />
                {!isCollapsed && <span>Inbox</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild className={noHoverStyles}>
              <Link
                href="/agenda"
                className={cn(
                  "flex items-center text-sm rounded-md",
                  isCollapsed
                    ? "justify-center py-3 px-0 mx-auto w-full"
                    : "gap-3 px-4 py-2.5",
                  pathname === "/agenda"
                    ? "text-black font-medium"
                    : "text-[#6E6E6E]"
                )}
              >
                <Calendar
                  className={cn(
                    pathname === "/agenda" ? "text-black" : "text-[#6E6E6E]",
                    isCollapsed ? "h-7 w-7" : "h-5 w-5"
                  )}
                />
                {!isCollapsed && <span>Agenda</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className={noHoverStyles}>
              <Link
                href="/objects"
                className={cn(
                  "flex items-center text-sm rounded-md",
                  isCollapsed
                    ? "justify-center py-3 px-0 mx-auto w-full"
                    : "gap-3 px-4 py-2.5",
                  pathname === "/objects"
                    ? "text-black font-medium"
                    : "text-[#6E6E6E]"
                )}
              >
                <Database
                  className={cn(
                    pathname === "/objects" ? "text-black" : "text-[#6E6E6E]",
                    isCollapsed ? "h-7 w-7" : "h-5 w-5"
                  )}
                />
                {!isCollapsed && <span>Objects</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <IntegrationMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
