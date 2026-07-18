"use client";

import { CheckIcon } from "lucide-react";
import type { ClipboardEvent, MouseEvent } from "react";
import { useState } from "react";
import { cn } from "@/lib";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/ui";

type Selection = string | string[] | null;

interface QuizQuestionCardProps {
  questionText: string;
  options: string[];
  sourceCitation?: string | null;
  /** "Select all that apply" — renders multi-select and emits a `string[]` selection. */
  multiple?: boolean;
  /** Current selection: option string (single) or option strings (multiple). */
  selected?: Selection;
  onSelect?: (value: string | string[]) => void;
  /** When true (default), blocks select/copy so questions are harder to paste into an LLM. */
  protectText?: boolean;
}

function blockClipboard(event: ClipboardEvent) {
  event.preventDefault();
}

function blockContextMenu(event: MouseEvent) {
  event.preventDefault();
}

function isChosen(selected: Selection, option: string): boolean {
  return Array.isArray(selected) ? selected.includes(option) : selected === option;
}

export function QuizQuestionCard({
  questionText,
  options,
  sourceCitation,
  multiple = false,
  selected: controlledSelected,
  onSelect,
  protectText = true,
}: QuizQuestionCardProps) {
  // Uncontrolled fallback keeps demo/mock usages interactive without wiring state.
  const [internalSelected, setInternalSelected] = useState<Selection>(multiple ? [] : null);
  const selected = controlledSelected !== undefined ? controlledSelected : internalSelected;

  function handleSelect(option: string) {
    if (multiple) {
      const current = Array.isArray(selected) ? selected : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      setInternalSelected(next);
      onSelect?.(next);
    } else {
      setInternalSelected(option);
      onSelect?.(option);
    }
  }

  return (
    <div
      className={cn(protectText && "select-none")}
      onCopy={protectText ? blockClipboard : undefined}
      onCut={protectText ? blockClipboard : undefined}
      onContextMenu={protectText ? blockContextMenu : undefined}
    >
      <Card>
        <CardHeader>
          <CardTitle className="select-none text-base font-normal">{questionText}</CardTitle>
          {multiple && (
            <p className="select-none text-xs text-muted-foreground">Select all that apply.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {options.map((option) => {
              const chosen = isChosen(selected, option);
              return (
                <Button
                  key={option}
                  type="button"
                  variant={chosen ? "default" : "outline"}
                  className="h-auto w-full justify-start gap-2 whitespace-normal py-2 text-left select-none"
                  aria-pressed={chosen}
                  onClick={() => handleSelect(option)}
                >
                  {multiple && (
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border",
                        chosen ? "border-current bg-current/20" : "border-muted-foreground/40",
                      )}
                      aria-hidden
                    >
                      {chosen && <CheckIcon className="size-3" />}
                    </span>
                  )}
                  {option}
                </Button>
              );
            })}
          </div>
          {sourceCitation && (
            <Badge variant="secondary" className="w-fit select-none">
              Cited: {sourceCitation}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
