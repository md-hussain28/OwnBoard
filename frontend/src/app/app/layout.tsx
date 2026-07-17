import { AppShell } from "@/components/layout/app-shell";
import { UploadProgressWidget } from "@/components/layout/upload-progress-widget";

export default function ConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      {children}
      <UploadProgressWidget />
    </AppShell>
  );
}
