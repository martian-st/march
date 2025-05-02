"use client";

import React, { useEffect, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Search, Plus, FileText, File } from "lucide-react";
import { useInboxObjects, useTodayObjects } from "@/hooks/use-objects";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: inboxObjects = [] } = useInboxObjects();
  const { data: todayObjects = [] } = useTodayObjects();
  
  // Combine and deduplicate objects from both sources
  const objects = React.useMemo(() => {
    const allObjects = [...inboxObjects, ...todayObjects];
    const uniqueIds = new Set();
    return allObjects.filter(obj => {
      if (uniqueIds.has(obj._id)) return false;
      uniqueIds.add(obj._id);
      return true;
    });
  }, [inboxObjects, todayObjects]);
  const router = useRouter();
  
  // Filter objects based on search query
  const filteredObjects = objects?.filter(obj => 
    obj.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Recent objects (limit to 8)
  const recentObjects = objects?.slice(0, 8) || [];

  const handleSelectObject = (id: string) => {
    router.push(`/object/${id}`);
    onOpenChange(false);
  };

  const handleCreateObject = () => {
    // Implement object creation logic
    onOpenChange(false);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
      
      // Close with Escape
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Search Objects</DialogTitle>
          <div className="flex items-center px-4 py-3 border-b">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search for an object..."
              className="flex-1 outline-none text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </DialogHeader>
        
        <div className="max-h-[70vh] overflow-y-auto">
          {/* Recent Objects Section */}
          {searchQuery === "" && (
            <div>
              <div className="px-4 py-2 text-xs text-gray-500">
                Recent Objects
              </div>
              <div>
                {recentObjects.map((object) => (
                  <div 
                    key={object._id}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectObject(object._id)}
                  >
                    <div className="w-6 h-6 mr-3 flex items-center justify-center text-blue-500">
                      {object.type === "document" ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <File className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{object.title}</div>
                      <div className="text-xs text-gray-500">
                        {object.type === "document" ? "Document" : "Page"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchQuery !== "" && filteredObjects.length > 0 && (
            <div>
              {filteredObjects.map((object) => (
                <div 
                  key={object._id}
                  className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelectObject(object._id)}
                >
                  <div className="w-6 h-6 mr-3 flex items-center justify-center text-blue-500">
                    {object.type === "document" ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <File className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{object.title}</div>
                    <div className="text-xs text-gray-500">
                      {object.type === "document" ? "Document" : "Page"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery !== "" && filteredObjects.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              No objects found matching "{searchQuery}"
            </div>
          )}

          {/* Actions Section */}
          <div className="border-t mt-2">
            <div className="px-4 py-2 text-xs text-gray-500">
              Actions
            </div>
            <div 
              className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={handleCreateObject}
            >
              <div className="w-6 h-6 mr-3 flex items-center justify-center">
                <Plus className="h-4 w-4" />
              </div>
              <div className="text-sm">Create Object</div>
              <div className="ml-auto flex items-center">
                <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">⌘</kbd>
                <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded">N</kbd>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
