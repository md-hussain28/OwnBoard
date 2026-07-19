import { BrandLogo } from "@/components/brand";
import { EXHIBITS, type ExhibitKey } from "./cite-chip";
import { LandingCtas } from "./landing-ctas";

const AUDIENCES = [
  {
    role: "For the new hire",
    line: "Proves what they know with citations — and is never mocked for what they don't know yet.",
  },
  {
    role: "For the senior engineer",
    line: "Interrupted only when the system is genuinely stuck, and always with the context attached.",
  },
  {
    role: "For the engineering manager",
    line: "Readiness and bus-factor risk as numbers with receipts, visible before they become exits.",
  },
] as const;

function AudienceStrip() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <h2 className="landing-reveal max-w-[24ch] text-[clamp(1.6rem,2.8vw,2.15rem)] font-bold tracking-tight text-foreground">
          Built for the three people in the room
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0">
          {AUDIENCES.map((audience, index) => (
            <div
              key={audience.role}
              className={`landing-reveal space-y-2.5 md:px-8 ${
                index > 0 ? "border-t border-border pt-8 md:border-l md:border-t-0 md:pt-0" : ""
              } ${index === 0 ? "md:pl-0" : ""} ${index === AUDIENCES.length - 1 ? "md:pr-0" : ""}`}
            >
              <h3 className="text-base font-bold tracking-tight text-foreground">
                {audience.role}
              </h3>
              <p className="max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
                {audience.line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20 lg:pt-28">
      <div className="landing-ink landing-reveal relative overflow-hidden rounded-[1.5rem] px-6 py-14 text-center sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-honey/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-brand-teal/20 blur-3xl" />
        <div className="relative mx-auto max-w-xl space-y-6">
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold tracking-tight text-white">
            Start with{" "}
            <em className="font-brand font-semibold italic tracking-[-0.02em] text-brand-honey">
              evidence
            </em>
            , not hope
          </h2>
          <p className="text-base leading-relaxed text-white/70">
            Create an organization, push a repo, and run the first cited readiness check — the
            pipeline keeps everything fresh from there.
          </p>
          <LandingCtas onInk className="items-center justify-center sm:justify-center" />
        </div>
      </div>
    </section>
  );
}

/** Bibliography footer — the page's cite chips resolve here, like any honest paper. */
function Sources() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16">
      <h2 className="text-[0.8125rem] font-semibold text-foreground">Sources</h2>
      <ul className="mt-4 space-y-2 border-t border-border/70 pt-4">
        {(Object.keys(EXHIBITS) as ExhibitKey[]).map((key) => (
          <li key={key}>
            <a
              href={`#${EXHIBITS[key].id}`}
              className="group inline-flex flex-wrap items-baseline gap-x-2 font-mono text-[0.6875rem] leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="text-brand-teal">[{key}]</span>
              <span className="font-semibold">{EXHIBITS[key].title}</span>
              <span>— {EXHIBITS[key].source}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 font-mono text-[0.6875rem] text-muted-foreground">
        This page cites its sources. So does the product.
      </p>
    </section>
  );
}

export function LandingClosing() {
  return (
    <>
      <AudienceStrip />
      <ClosingCta />
      <Sources />
      <footer className="mx-auto mt-16 flex max-w-6xl flex-col items-center gap-3 px-6 text-center">
        <BrandLogo
          markClassName="size-7 rounded-[0.5rem]"
          wordmarkClassName="text-[0.9375rem] font-semibold"
        />
        <p className="font-mono text-[0.6875rem] text-muted-foreground">
          Verifiable engineering onboarding
        </p>
      </footer>
    </>
  );
}
