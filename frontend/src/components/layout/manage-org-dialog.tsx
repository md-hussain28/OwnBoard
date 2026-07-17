"use client";

import { useOrganization } from "@clerk/nextjs";
import {
  Building2Icon,
  ImagePlusIcon,
  Loader2Icon,
  Trash2Icon,
  UsersRoundIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";

type ManageOrgDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type OrgResource = NonNullable<ReturnType<typeof useOrganization>["organization"]>;

function orgInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Push the pending name/logo edits to Clerk. */
async function persistOrgChanges(
  organization: OrgResource,
  name: string,
  logoFile: File | null,
  removeLogo: boolean,
) {
  if (name !== organization.name) {
    await organization.update({ name });
  }
  if (logoFile) {
    await organization.setLogo({ file: logoFile });
  } else if (removeLogo) {
    await organization.setLogo({ file: null });
  }
}

function saveErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Could not update organization.";
}

/** Draft state for the logo picker: preview URL (remote or blob), pending file, removal flag. */
function useLogoDraft(open: boolean, organization: OrgResource | null | undefined) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !organization) return;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreviewUrl(organization.imageUrl);
    setLogoFile(null);
    setRemoveLogo(false);
  }, [open, organization]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  function pickLogo(file: File | null) {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (!file) {
      setLogoFile(null);
      setPreviewUrl(removeLogo ? null : (organization?.imageUrl ?? null));
      return;
    }
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setLogoFile(file);
    setRemoveLogo(false);
    setPreviewUrl(url);
  }

  function clearLogo() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setLogoFile(null);
    setRemoveLogo(true);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return { previewUrl, logoFile, removeLogo, fileInputRef, pickLogo, clearLogo };
}

function LogoSection({
  logoId,
  disabled,
  previewUrl,
  initials,
  canRemove,
  fileInputRef,
  onPick,
  onRemove,
}: {
  logoId: string;
  disabled: boolean;
  previewUrl: string | null;
  initials: string;
  canRemove: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/60 px-4 py-5">
      <button
        type="button"
        id={logoId}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
          "bg-brand-gradient text-lg font-bold tracking-tight text-white shadow-button",
          "outline-hidden transition-transform duration-200 ease-out",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          "motion-safe:active:scale-[0.98]",
        )}
        aria-label="Change organization logo"
      >
        {previewUrl ? (
          // Org logo preview — remote Clerk URL or local blob: URL, so skip the optimizer
          <Image
            src={previewUrl}
            alt=""
            width={80}
            height={80}
            unoptimized
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-foreground/45 opacity-0 transition-opacity duration-150 ease-out",
            "group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
          aria-hidden
        >
          <ImagePlusIcon className="size-5 text-white" strokeWidth={1.75} />
        </span>
      </button>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlusIcon className="size-3.5" strokeWidth={1.75} />
            Upload
          </Button>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon className="size-3.5" strokeWidth={1.75} />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG or JPG · appears in the sidebar</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function NameField({
  nameId,
  name,
  disabled,
  invalid,
  onChange,
}: {
  nameId: string;
  name: string;
  disabled: boolean;
  invalid: boolean;
  onChange: (name: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={nameId} className="text-xs font-medium text-muted-foreground">
        Name
      </label>
      <div className="relative">
        <Building2Icon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <Input
          id={nameId}
          value={name}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Organization name"
          className="pl-9"
          disabled={disabled}
          required
          autoComplete="organization"
          aria-invalid={invalid}
        />
      </div>
    </div>
  );
}

function ManageTeamLink({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Link
      href="/team"
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/80 bg-card px-3 py-2.5",
        "text-left outline-hidden transition-[border-color,background-color] duration-150 ease-out",
        "hover:border-primary/25 hover:bg-muted/50",
        "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-honey/15">
        <UsersRoundIcon className="size-3.5 text-brand-honey" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">Manage Team</span>
        <span className="block text-xs text-muted-foreground">Invites, roles, and domains</span>
      </span>
    </Link>
  );
}

function SaveFooter({
  saving,
  canSave,
  onCancel,
}: {
  saving: boolean;
  canSave: boolean;
  onCancel: () => void;
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" form="manage-org-form" disabled={!canSave}>
        {saving ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Saving
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </DialogFooter>
  );
}

/** Rename + logo only — member management lives on /team. */
export function ManageOrgDialog({ open, onOpenChange }: ManageOrgDialogProps) {
  const { organization, isLoaded } = useOrganization();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const logoId = useId();
  const logo = useLogoDraft(open, organization);

  useEffect(() => {
    if (!open || !organization) return;
    setName(organization.name);
    setError(null);
  }, [open, organization]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!organization) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Organization name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await persistOrgChanges(organization, trimmed, logo.logoFile, logo.removeLogo);
      onOpenChange(false);
    } catch (err) {
      setError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const showPreview = !!logo.previewUrl && !logo.removeLogo;
  const ready = isLoaded && !!organization;
  const nameChanged = !!organization && name.trim() !== organization.name.trim();
  const logoChanged = !!logo.logoFile || logo.removeLogo;
  const dirty = nameChanged || logoChanged;
  const canSave = ready && dirty && name.trim().length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-md" showCloseButton>
        <DialogHeader className="pr-8">
          <DialogTitle>Workspace</DialogTitle>
          <DialogDescription>Update the name and logo shown across OwnBoard.</DialogDescription>
        </DialogHeader>

        <form id="manage-org-form" onSubmit={handleSave} className="grid gap-5">
          <LogoSection
            logoId={logoId}
            disabled={!ready || saving}
            previewUrl={showPreview ? logo.previewUrl : null}
            initials={orgInitials(name || organization?.name || "?")}
            canRemove={showPreview || !!logo.logoFile}
            fileInputRef={logo.fileInputRef}
            onPick={logo.pickLogo}
            onRemove={logo.clearLogo}
          />

          <NameField
            nameId={nameId}
            name={name}
            disabled={!ready || saving}
            invalid={!!error && !name.trim()}
            onChange={setName}
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </form>

        <ManageTeamLink onNavigate={() => onOpenChange(false)} />

        <SaveFooter saving={saving} canSave={canSave} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
