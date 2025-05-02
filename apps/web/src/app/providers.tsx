import { MyRuntimeProvider } from "@/components/provider/my-runtime-provider";
import { AuthProvider } from "@/contexts/auth-context";
import QueryProvider from "@/components/provider/query-client-provider";
import { CommandPaletteProvider } from "@/components/provider/command-palette-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import React from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider
      clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}
    >
      <AuthProvider>
        <MyRuntimeProvider>
          <QueryProvider>
            <CommandPaletteProvider>
              {children}
            </CommandPaletteProvider>
          </QueryProvider>
        </MyRuntimeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
