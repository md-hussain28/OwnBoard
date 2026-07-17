"use client";

import type { ClipboardEvent, MouseEvent } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

interface QuizQuestionCardProps {
  questionText: string;
  options: string[];
  sourceCitation?: string | null;
  /** Currently selected option text (answers are option strings, matching the backend grade API). */
  selected?: string | null;
  onSelect?: (option: string) => void;
  /** When true (default), blocks select/copy so questions are harder to paste into an LLM. */
  protectText?: boolean;
}

function blockClipboard(event: ClipboardEvent) {
  event.preventDefault();
}

function blockContextMenu(event: MouseEvent) {
  event.preventDefault();
}

export function QuizQuestionCard({
  questionText,
  options,
  sourceCitation,
  selected: controlledSelected,
  onSelect,
  protectText = true,
}: QuizQuestionCardProps) {
  // Uncontrolled fallback keeps demo/mock usages interactive without wiring state.
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selected = controlledSelected !== undefined ? controlledSelected : internalSelected;

  function handleSelect(option: string) {
    setInternalSelected(option);
    onSelect?.(option);
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {options.map((option) => (
              <Button
                key={option}
                type="button"
                variant={selected === option ? "default" : "outline"}
                className="h-auto w-full justify-start whitespace-normal py-2 text-left select-none"
                onClick={() => handleSelect(option)}
              >
                {option}
              </Button>
            ))}
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
