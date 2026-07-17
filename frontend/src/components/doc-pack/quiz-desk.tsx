"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { QuizAssignmentPanel } from "@/components/doc-pack/quiz-assignment-panel";
import { QuizPackList } from "@/components/doc-pack/quiz-pack-list";
import { useDocPacks } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { Button } from "@/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ui/sheet";
import { Skeleton } from "@/ui/skeleton";

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

  const assignPack = useMemo(() => {
    if (!assignPackId || !packs) return null;
    return packs.find((p) => p.id === assignPackId) ?? null;
  }, [packs, assignPackId]);

  const openAssign = useCallback(
    (packId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("pack");
      params.set("assign", packId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeAssign = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("assign");
    params.delete("pack");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  // Drop stale assign id when the pack is gone.
  useEffect(() => {
    if (!packs || !assignPackId) return;
    if (!packs.some((p) => p.id === assignPackId)) {
      closeAssign();
    }
  }, [packs, assignPackId, closeAssign]);

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
          Quiz creation and assignment live here. Your assigned reading is under My quizzes.
        </p>
        <Button asChild>
          <Link href="/app/onboarding/packs">Go to My quizzes</Link>
        </Button>
      </div>
    );
  }

  const sheetOpen = Boolean(assignPackId);
  const showSheetLoading = sheetOpen && packsLoading;

  return (
    <>
      <QuizPackList onAssignPack={openAssign} />

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) closeAssign();
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col gap-4 px-4 pb-6 sm:max-w-md">
          {showSheetLoading && (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          )}

          {!showSheetLoading && assignPack && (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="pr-8 text-balance">Assign · {assignPack.name}</SheetTitle>
                <SheetDescription className="text-pretty">
                  Pick people to assign, then track who is reading, in quiz, or passed.
                </SheetDescription>
              </SheetHeader>
              <QuizAssignmentPanel pack={assignPack} />
            </>
          )}

          {!showSheetLoading && sheetOpen && !assignPack && (
            <p className="text-sm text-muted-foreground">This quiz could not be found.</p>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
