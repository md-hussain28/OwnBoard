"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { QuizAssignmentPanel } from "@/components/doc-pack/quiz-assignment-panel";
import { QuizPackList } from "@/components/doc-pack/quiz-pack-list";
import { ViewPackPanel } from "@/components/doc-pack/view-pack-panel";
import { useDocPacks } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { usePackAssignmentProgress } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import type { DocPackListItem } from "@/schemas/docPack.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ui/sheet";
import { Skeleton } from "@/ui/skeleton";

const PACK_STATUS_LABEL: Record<DocPackListItem["status"], string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
  needs_review: "Needs review",
};

function packStatusVariant(status: DocPackListItem["status"]) {
  if (status === "active") return "success" as const;
  if (status === "needs_review") return "warning" as const;
  if (status === "archived") return "outline" as const;
  return "secondary" as const;
}

export function QuizDesk() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin, isLoading: roleLoading } = useAppRole();
  const { data: packs, isLoading: packsLoading } = useDocPacks({
    enabled: !roleLoading && isAdmin,
  });

  // Support both ?assign= (preferred) and legacy ?pack=
  const assignPackId = searchParams.get("assign") ?? searchParams.get("pack");
  const viewPackId = searchParams.get("view");

  const assignPack = useMemo(() => {
    if (!assignPackId || !packs) return null;
    return packs.find((p) => p.id === assignPackId) ?? null;
  }, [packs, assignPackId]);

  const viewPack = useMemo(() => {
    if (!viewPackId || !packs) return null;
    return packs.find((p) => p.id === viewPackId) ?? null;
  }, [packs, viewPackId]);

  const viewProgressByPackId = usePackAssignmentProgress(
    viewPackId ? [viewPackId] : [],
    isAdmin && Boolean(viewPackId),
  );

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openAssign = useCallback(
    (packId: string) => {
      replaceParams((params) => {
        params.delete("pack");
        params.delete("view");
        params.set("assign", packId);
      });
    },
    [replaceParams],
  );

  const openView = useCallback(
    (packId: string) => {
      replaceParams((params) => {
        params.delete("pack");
        params.delete("assign");
        params.set("view", packId);
      });
    },
    [replaceParams],
  );

  const closeAssign = useCallback(() => {
    replaceParams((params) => {
      params.delete("assign");
      params.delete("pack");
    });
  }, [replaceParams]);

  const closeView = useCallback(() => {
    replaceParams((params) => {
      params.delete("view");
    });
  }, [replaceParams]);

  // Drop stale sheet ids when the pack is gone.
  useEffect(() => {
    if (!packs) return;
    if (assignPackId && !packs.some((p) => p.id === assignPackId)) closeAssign();
    if (viewPackId && !packs.some((p) => p.id === viewPackId)) closeView();
  }, [packs, assignPackId, viewPackId, closeAssign, closeView]);

  if (roleLoading) {
    return (
      <div className="space-y-3 px-4 py-5">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
        <p className="font-medium">Admins only</p>
        <p className="text-sm text-muted-foreground text-pretty">
          Module creation and assignment live here. Your assigned reading is under My modules.
        </p>
        <Button asChild>
          <Link href="/app/onboarding/packs">Go to My modules</Link>
        </Button>
      </div>
    );
  }

  const assignSheetOpen = Boolean(assignPackId);
  const viewSheetOpen = Boolean(viewPackId);
  const showAssignLoading = assignSheetOpen && packsLoading;
  const showViewLoading = viewSheetOpen && packsLoading;

  return (
    <>
      <QuizPackList onAssignPack={openAssign} onViewPack={openView} />

      <Sheet
        open={viewSheetOpen}
        onOpenChange={(open) => {
          if (!open) closeView();
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-3 px-4 pt-4 pb-6 sm:max-w-md"
        >
          {showViewLoading && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          )}

          {!showViewLoading && viewPack && (
            <>
              <SheetHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0 p-0 pr-10 text-left">
                <SheetTitle className="min-w-0 flex-1 truncate text-base leading-snug">
                  {viewPack.name}
                </SheetTitle>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {viewPack.domainName && (
                    <Badge
                      variant="outline"
                      className="h-5 max-w-[9rem] truncate px-1.5 text-[0.6875rem] font-normal"
                    >
                      {viewPack.domainName}
                    </Badge>
                  )}
                  <Badge
                    variant={packStatusVariant(viewPack.status)}
                    className="h-5 px-1.5 text-[0.6875rem]"
                  >
                    {PACK_STATUS_LABEL[viewPack.status]}
                  </Badge>
                </div>
                <SheetDescription className="sr-only">
                  Module details — view only. Use Edit to change documents or the quiz.
                </SheetDescription>
              </SheetHeader>
              <ViewPackPanel
                pack={viewPack}
                progress={viewProgressByPackId.get(viewPack.id)}
                onAssign={() => openAssign(viewPack.id)}
                onClose={closeView}
                isAdmin={isAdmin}
              />
            </>
          )}

          {!showViewLoading && viewSheetOpen && !viewPack && (
            <p className="text-sm text-muted-foreground">This module could not be found.</p>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={assignSheetOpen}
        onOpenChange={(open) => {
          if (!open) closeAssign();
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col gap-4 overflow-hidden sm:max-w-lg">
          {showAssignLoading && (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          )}

          {!showAssignLoading && assignPack && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="pr-8 text-balance">Assign · {assignPack.name}</DialogTitle>
                <DialogDescription className="text-pretty">
                  Search and select members to assign, then track who is reading, in quiz, or
                  passed.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <QuizAssignmentPanel pack={assignPack} />
              </div>
            </>
          )}

          {!showAssignLoading && assignSheetOpen && !assignPack && (
            <p className="text-sm text-muted-foreground">This module could not be found.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
