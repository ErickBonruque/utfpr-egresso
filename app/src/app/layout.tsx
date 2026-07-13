import type { Metadata } from "next";
import { Geist, Geist_Mono, Jost } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Títulos em Jost (geométrica open-source, eco da Futura MD BT do manual
// de marca UTFPR — que é comercial). Corpo/UI seguem em Geist. (Fase 5)
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CEA — Conexão Egresso-Aluno",
  description:
    "Plataforma de acompanhamento de egressos e gamificação acadêmica da UTFPR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes stamps the `.dark` class on
    // <html> before hydration.
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${jost.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
