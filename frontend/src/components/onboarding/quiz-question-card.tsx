"use client";

import { useState } from "react";
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
}

export function QuizQuestionCard({
  questionText,
  options,
  sourceCitation,
  selected: controlledSelected,
  onSelect,
}: QuizQuestionCardProps) {
  // Uncontrolled fallback keeps demo/mock usages interactive without wiring state.
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selected = controlledSelected !== undefined ? controlledSelected : internalSelected;

  function handleSelect(option: string) {
    setInternalSelected(option);
    onSelect?.(option);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-normal">{questionText}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {options.map((option) => (
            <Button
              key={option}
              type="button"
              variant={selected === option ? "default" : "outline"}
              className="w-full justify-start whitespace-normal text-left h-auto py-2"
              onClick={() => handleSelect(option)}
            >
              {option}
            </Button>
          ))}
        </div>
        {sourceCitation && (
          <Badge variant="secondary" className="w-fit">
            Cited: {sourceCitation}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
