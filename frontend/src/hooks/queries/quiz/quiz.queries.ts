import { useQuery } from "@tanstack/react-query";
import { quizService } from "@/services/quiz.service";

export const quizKeys = {
  templates: ["quiz-templates"] as const,
  template: (id: string) => ["quiz-templates", id] as const,
};

export function useQuizTemplates() {
  return useQuery({
    queryKey: quizKeys.templates,
    queryFn: quizService.listTemplates,
  });
}

export function useQuizTemplate(id: string) {
  return useQuery({
    queryKey: quizKeys.template(id),
    queryFn: () => quizService.getTemplate(id),
    enabled: Boolean(id),
  });
}
