"use client";
import { Calendar, Inbox, Database } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
                {!isCollapsed && <span>All Objects</span>}
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
