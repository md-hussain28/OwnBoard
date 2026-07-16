import Link from "next/link";

const NAV_LINKS = [
  { href: "/onboarding", label: "Onboarding" },
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Dashboard" },
];

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Onboard
        </Link>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
