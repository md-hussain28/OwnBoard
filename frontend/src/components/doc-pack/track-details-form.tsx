"use client";

import { useState } from "react";
import { useUpdateDocPack } from "@/hooks/queries/doc-pack";
import { notify } from "@/lib";
import type { DocPack } from "@/schemas";
import { Button, Input, Spinner, Textarea } from "@/ui";
import { AudienceField } from "./audience-field";
import { QuizDomainsField } from "./quiz-domains-field";

/** Parse a required non-negative count field, defaulting blanks/garbage to 0. */
function parseCount(raw: string): number {
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

/** Parse an optional non-negative count field — blank/garbage becomes null (no value). */
function parseOptionalCount(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) ? null : Math.max(0, n);
}

/**
 * Edit a Track's name, description, topic, and audience. Saving a wider audience
 * fans the track out to newly-matching employees immediately (backend re-syncs on audience change).
 */
export function TrackDetailsForm({
  pack,
  onSaved,
}: {
  pack: DocPack;
  /** Called after a successful save (e.g. advance to the Documents step). */
  onSaved?: () => void;
}) {
  const update = useUpdateDocPack(pack.id);

  const [name, setName] = useState(pack.name);
  const [description, setDescription] = useState(pack.description ?? "");
  const [domainId, setDomainId] = useState<string | null>(pack.domainId);
  const [assignToAll, setAssignToAll] = useState(pack.assignToAll);
  const [audienceDomainIds, setAudienceDomainIds] = useState<string[]>(pack.audienceDomainIds);
  const [sequenceOrder, setSequenceOrder] = useState(String(pack.sequenceOrder));
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    pack.estimatedMinutes != null ? String(pack.estimatedMinutes) : "",
  );
  const [dueOffsetDays, setDueOffsetDays] = useState(
    pack.dueOffsetDays != null ? String(pack.dueOffsetDays) : "",
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    update.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        domain_id: domainId,
        assign_to_all: assignToAll,
        audience_domain_ids: assignToAll ? [] : audienceDomainIds,
        sequence_order: parseCount(sequenceOrder),
        estimated_minutes: parseOptionalCount(estimatedMinutes),
        due_offset_days: parseOptionalCount(dueOffsetDays),
      },
      {
        onSuccess: () => {
          notify.success("Module updated", { id: `pack-update:${pack.id}` });
          onSaved?.();
        },
        onError: (err) => {
          notify.apiError(err, "Could not update module", { id: `pack-update-error:${pack.id}` });
        },
      },
    );
  }

  let saveLabel = "Save changes";
  if (update.isPending) saveLabel = "Saving…";
  else if (onSaved) saveLabel = "Save & continue";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-border bg-background p-5 shadow-soft sm:p-6"
    >
      <div className="space-y-2">
        <label htmlFor="track-name" className="text-sm font-medium">
          Module name
        </label>
        <Input id="track-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <QuizDomainsField value={domainId} onChange={setDomainId} />

      <AudienceField
        assignToAll={assignToAll}
        domainIds={audienceDomainIds}
        onAssignToAllChange={setAssignToAll}
        onDomainIdsChange={setAudienceDomainIds}
      />

      <div className="space-y-2">
        <label htmlFor="track-description" className="text-sm font-medium">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="track-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <fieldset className="space-y-3 border-t border-border pt-4">
        <legend className="text-sm font-medium">Onboarding policy</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="track-order" className="text-xs font-medium">
              Onboarding order
            </label>
            <Input
              id="track-order"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={sequenceOrder}
              onChange={(e) => setSequenceOrder(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-pretty">
              Modules are shown to employees in this order; a module stays locked until earlier ones
              are passed.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="track-minutes" className="text-xs font-medium">
              Estimated time{" "}
              <span className="font-normal text-muted-foreground">(minutes, optional)</span>
            </label>
            <Input
              id="track-minutes"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="e.g. 20"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-pretty">
              Shown to employees as &ldquo;~N min&rdquo;.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="track-due" className="text-xs font-medium">
              Due in <span className="font-normal text-muted-foreground">(days, optional)</span>
            </label>
            <Input
              id="track-due"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="No due date"
              value={dueOffsetDays}
              onChange={(e) => setDueOffsetDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-pretty">
              Days after assignment the module is due. Leave blank for no due date.
            </p>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={update.isPending || !name.trim()}>
          {update.isPending && <Spinner />}
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}
