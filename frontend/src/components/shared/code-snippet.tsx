"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { cn, notify } from "@/lib";
import { Button } from "@/ui";

type CodeSnippetProps = {
  code: string;
  /** Optional caption above the block (e.g. a filename). */
  label?: string;
  className?: string;
};

/** A copyable monospace block. The one place we render code/config for the user to paste. */
export function CodeSnippet({ code, label, className }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      notify.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="group relative">
        <pre className="overflow-x-auto rounded-md bg-muted p-3 pr-12 font-mono text-[0.8125rem] leading-relaxed">
          {code}
        </pre>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={copy}
          aria-label="Copy to clipboard"
          className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground"
        >
          {copied ? <CheckIcon className="text-brand-moss" /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  );
}
