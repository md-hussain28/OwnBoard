import { AppShell, ColdStartGate, UploadProgressWidget } from "@/components/layout";

export default function ConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Warm the free-tier backend before the shell fires its queries, so a cold start shows a
  // friendly "waking up" screen instead of a shell full of failed requests.
  return (
    <ColdStartGate>
      <AppShell>
        {children}
        <UploadProgressWidget />
      </AppShell>
    </ColdStartGate>
  );
}
