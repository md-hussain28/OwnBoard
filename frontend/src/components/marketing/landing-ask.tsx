import { ArrowRight, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";
import { appPath } from "@/lib";
import { CiteChip } from "./cite-chip";

const ASK_CHAT_PATH = appPath("chat");

const SUGGESTED_PROMPTS = [
  "Why is this retry loop here?",
  "Who actually owns the auth module?",
  "Why does this feature flag still exist?",
  "What changed in payments last quarter?",
] as const;

/**
 * Standalone "Ask the codebase" invite — a faux composer that hands the visitor
 * straight into the app's Ask AI chat (Clerk walks signed-out visitors through
 * sign-in on the way).
 */
export function LandingAsk() {
  return (
    <section className="border-y border-border/60 bg-brand-teal-soft/25">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center lg:py-24">
        <h2 className="landing-reveal mx-auto max-w-[20ch] text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold tracking-tight text-foreground">
          Ask the codebase{" "}
          <em className="font-brand font-semibold italic tracking-[-0.02em] text-brand-teal">
            why
          </em>
        </h2>
        <p className="landing-reveal mx-auto mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Cited, commit-grounded answers about why the code is the way it is <CiteChip to="B" /> —
          and when OwnBoard isn&apos;t sure, it routes you to the right person instead of guessing{" "}
          <CiteChip to="D" />.
        </p>

        <div className="landing-reveal mx-auto mt-8 max-w-xl">
          <Link
            href={ASK_CHAT_PATH}
            className="group flex items-center gap-3 rounded-2xl border border-border/80 bg-card py-2.5 pl-5 pr-2.5 text-left shadow-soft transition-shadow duration-200 hover:shadow-card-hover"
          >
            <span className="flex-1 truncate text-[0.9375rem] text-muted-foreground">
              Why is this retry loop here?
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-button transition-transform duration-200 group-hover:translate-x-0.5">
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
        </div>

        <ul className="landing-reveal mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <li key={prompt}>
              <Link
                href={ASK_CHAT_PATH}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1.5 text-[0.8125rem] text-muted-foreground transition-colors duration-200 hover:border-brand-teal/40 hover:text-brand-teal"
              >
                <MessageCircleQuestion className="size-3.5 text-brand-teal" aria-hidden />
                {prompt}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
