import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppClerkProvider } from "@/providers/app-clerk-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { publicConfig } from "@/lib/api/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: publicConfig.NEXT_PUBLIC_APP_NAME,
  description: "Onboard: cited, commit-grounded engineering onboarding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AppClerkProvider>
            <QueryProvider>{children}</QueryProvider>
          </AppClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
