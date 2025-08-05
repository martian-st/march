"use client";
import { Calendar, Inbox, Database, Bot } from "lucide-react";
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

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="bg-white border-r border-gray-100">
      <SidebarHeader>
        <div className="p-6 flex justify-start">
          {/* Empty header space for better spacing */}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu className="space-y-0">
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent p-0 h-auto"
            >
              <Link
                href="/inbox"
                className={cn(
                  "flex items-center text-sm py-2 px-3 rounded-lg transition-colors duration-200",
                  isCollapsed
                    ? "justify-center w-full"
                    : "gap-3",
                  pathname === "/inbox"
                    ? "text-black"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Inbox
                  className={cn(
                    "transition-colors duration-200",
                    pathname === "/inbox" ? "text-black" : "text-gray-500",
                    isCollapsed ? "h-6 w-6" : "h-5 w-5"
                  )}
                />
                {!isCollapsed && <span className="font-medium">Inbox</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent p-0 h-auto"
            >
              <Link
                href="/agenda"
                className={cn(
                  "flex items-center text-sm py-2 px-3 rounded-lg transition-colors duration-200",
                  isCollapsed
                    ? "justify-center w-full"
                    : "gap-3",
                  pathname === "/agenda"
                    ? "text-black"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Calendar
                  className={cn(
                    "transition-colors duration-200",
                    pathname === "/agenda" ? "text-black" : "text-gray-500",
                    isCollapsed ? "h-6 w-6" : "h-5 w-5"
                  )}
                />
                {!isCollapsed && <span className="font-medium">Agenda</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent p-0 h-auto"
            >
              <Link
                href="/objects"
                className={cn(
                  "flex items-center text-sm py-2 px-3 rounded-lg transition-colors duration-200",
                  isCollapsed
                    ? "justify-center w-full"
                    : "gap-3",
                  pathname === "/objects"
                    ? "text-black"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Database
                  className={cn(
                    "transition-colors duration-200",
                    pathname === "/objects" ? "text-black" : "text-gray-500",
                    isCollapsed ? "h-6 w-6" : "h-5 w-5"
                  )}
                />
                {!isCollapsed && <span className="font-medium">Objects</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="hover:bg-transparent active:bg-transparent data-[active=true]:bg-transparent p-0 h-auto"
            >
              <Link
                href="/agent"
                className={cn(
                  "flex items-center text-sm py-2 px-3 rounded-lg transition-colors duration-200",
                  isCollapsed
                    ? "justify-center w-full"
                    : "gap-3",
                  pathname === "/agent"
                    ? "text-black"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Bot
                  className={cn(
                    "transition-colors duration-200",
                    pathname === "/agent" ? "text-black" : "text-gray-500",
                    isCollapsed ? "h-6 w-6" : "h-5 w-5"
                  )}
                />
                {!isCollapsed && <span className="font-medium">AI Chat</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {/* <div className="px-3 py-1">
            <button className={cn(
              "flex items-center w-full text-sm py-2 px-3 rounded-lg transition-colors duration-200",
              isCollapsed ? "justify-center w-full" : "gap-3",
              "text-gray-500 hover:bg-gray-100"
            )}>
              <div className="flex items-center justify-center h-5 w-5 rounded-full border border-gray-300">
                <Plus className="h-3 w-3 text-gray-500" />
              </div>
              {!isCollapsed && <span className="text-sm font-medium">New space</span>}
            </button>
          </div> */}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <IntegrationMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
