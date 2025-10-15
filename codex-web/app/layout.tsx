import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Codex Web",
  description: "Browser-based companion for the Codex CLI authentication flow."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
              <div className="container flex h-16 items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Codex
                  </p>
                  <h1 className="text-lg font-bold">Web Companion</h1>
                </div>
                <ThemeToggle />
              </div>
            </header>
            <main className="container flex-1 py-10">{children}</main>
            <footer className="border-t bg-muted/30 py-6">
              <div className="container text-sm text-muted-foreground">
                Built with Next.js, Tailwind CSS, and shadcn/ui to mirror the Codex CLI onboarding experience.
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
