/** Key factory only — quiz templates are fetched through their owning domain (doc packs, assignments). */
export const quizKeys = {
  attempts: ["quiz-attempts"] as const,
  attempt: (id: string) => ["quiz-attempts", id] as const,
};
