import { Badge } from "@/ui/badge";

/** Inline "Incoming" tag for a feature/section whose backend is still a stub. */
export function IncomingBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={className}>
      Incoming
    </Badge>
  );
}

/** Drop-in replacement for an isError branch when the failure is specifically "not implemented yet" —
 * pair with `isNotImplementedError` from `@/lib/api/errors` so real failures still show as errors. */
export function IncomingFeature({ description }: { description: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
      <IncomingBadge className="shrink-0" />
      <p>{description}</p>
    </div>
  );
}
