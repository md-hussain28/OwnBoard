import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { publicConfig } from "@/lib/api";
import { AppClerkProvider, QueryProvider, ThemeProvider } from "@/providers";
import { Toaster } from "@/ui";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/** Soft optical serif — OwnBoard wordmark only (pairs with Jakarta UI sans). */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: publicConfig.NEXT_PUBLIC_APP_NAME,
  description: "OwnBoard: cited, commit-grounded engineering onboarding.",
  icons: {
    icon: [
      { url: "/brand/ownboard-mark.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/brand/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${fraunces.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AppClerkProvider>
            <QueryProvider>{children}</QueryProvider>
          </AppClerkProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
