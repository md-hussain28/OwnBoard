"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";

interface QuizQuestionCardProps {
  prompt: string;
  options: string[];
  citation: string;
  onAnswer?: (index: number) => void;
}

export function QuizQuestionCard({ prompt, options, citation, onAnswer }: QuizQuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(index: number) {
    setSelected(index);
    onAnswer?.(index);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-normal">{prompt}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {options.map((option, index) => (
            <Button
              key={option}
              type="button"
              variant={selected === index ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleSelect(index)}
            >
              {option}
            </Button>
          ))}
        </div>
        {selected !== null && (
          <Badge variant="secondary" className="w-fit">
            Cited: {citation}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
