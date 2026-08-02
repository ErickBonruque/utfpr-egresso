"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/// Class-based theming (adds `.dark` to <html>), following the OS by
/// default. The 3-state toggle lives in ThemeToggle.
///
/// `nonce`: o next-themes injeta um script inline no documento para aplicar o
/// tema antes da hidratação (é o que evita o flash de tela clara). Com o CSP
/// da Fase 9 esse script precisa carregar o nonce da resposta — sem ele o
/// navegador bloqueia a execução e o tema escuro pisca a cada navegação.
export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </NextThemesProvider>
  );
}
