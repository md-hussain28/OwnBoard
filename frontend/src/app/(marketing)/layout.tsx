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
      <main className="relative z-0 mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
