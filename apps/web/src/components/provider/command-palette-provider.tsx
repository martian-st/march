"use client";

import React, { createContext, useContext, useState } from "react";
import { CommandPalette } from "@/components/command/command-palette";

interface CommandPaletteContextType {
  open: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType>({
  open: false,
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
});

export const useCommandPalette = () => useContext(CommandPaletteContext);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openCommandPalette = () => setOpen(true);
  const closeCommandPalette = () => setOpen(false);

  return (
    <CommandPaletteContext.Provider
      value={{
        open,
        openCommandPalette,
        closeCommandPalette,
      }}
    >
      {children}
      <CommandPalette 
        open={open} 
        onOpenChange={setOpen} 
      />
    </CommandPaletteContext.Provider>
  );
}
