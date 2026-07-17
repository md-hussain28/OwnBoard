import { AtmosphereBlobs } from "@/components/layout/atmosphere-blobs";
import { MarketingHeader } from "@/components/layout/marketing-header";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <AtmosphereBlobs />
      <MarketingHeader />
      <main className="relative z-0 flex-1">{children}</main>
    </div>
  );
}
