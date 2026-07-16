"use client";

import { use } from "react";
import { QuizBuilderFlow } from "@/components/doc-pack/quiz-builder-flow";

export default function DocPackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QuizBuilderFlow packId={id} />;
}
