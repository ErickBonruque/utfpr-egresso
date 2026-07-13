"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/// Class-based theming (adds `.dark` to <html>), following the OS by
/// default. The 3-state toggle lives in ThemeToggle.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
