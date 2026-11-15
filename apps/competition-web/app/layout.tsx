import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { COLOR_MODE_BOOTSTRAP } from "@enigmic-co/ui/color-mode";
import { PageContainer } from "@enigmic-co/ui/PageContainer";
import { SiteHeader } from "../components/site-chrome";
import { SiteFooter } from "../components/site-footer";
import { AuthProvider } from "../components/auth-provider";
import { ConfirmProvider } from "../components/confirm-dialog";
import { ToastProvider } from "../components/toast";
import { oidcEnabled } from "../lib/session/core";
import "./globals.css";

// Styling guide (D-064): Geist, like Enigmic Cards.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Enigmic League",
  description: "Fixtures, schedules, results and standings for Enigmic leagues.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Competition Tools kept its own colour-mode key before the shared one; carry a
// saved choice over once, then the shared bootstrap applies it.
const MIGRATE_COLOR_MODE = `try{var o=localStorage.getItem("enigmic-competition-theme");if(o){if(!localStorage.getItem("enigmic-color-mode"))localStorage.setItem("enigmic-color-mode",o);localStorage.removeItem("enigmic-competition-theme");}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The bootstrap sets data-color-mode on <html> before hydration (D-049).
    <html lang="en" data-color-mode="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `${MIGRATE_COLOR_MODE};${COLOR_MODE_BOOTSTRAP}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <div className="min-h-screen bg-background">
          {/* Read at build time (static layout): Vercel builds with the same env it runs with. */}
          <AuthProvider provider={oidcEnabled() ? "authentik" : "local"}>
            <ToastProvider>
              <ConfirmProvider>
                <SiteHeader />
                <PageContainer>{children}</PageContainer>
                <SiteFooter />
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
