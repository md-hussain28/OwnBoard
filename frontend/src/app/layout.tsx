import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AppHeader } from "@/components/layout/app-header";
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <QueryProvider>
            <AppHeader />
            <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
