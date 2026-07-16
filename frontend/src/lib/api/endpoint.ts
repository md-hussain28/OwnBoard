export const API_ENDPOINTS = {
  me: "/me",
  adminMe: "/admin/me",
  adminTenants: "/admin/tenants",
  adminTenant: (id: string) => `/admin/tenants/${id}`,
  repos: "/repos",
  repo: (id: string) => `/repos/${id}`,
  employees: "/employees",
  employee: (id: string) => `/employees/${id}`,
  employeeAssignments: (employeeId: string) => `/employees/${employeeId}/assignments`,

  // Doc Packs (Doc Pack PRD §6)
  docPacks: "/doc-packs",
  docPack: (id: string) => `/doc-packs/${id}`,
  docPackDocuments: (id: string) => `/doc-packs/${id}/documents`,
  docPackDocument: (id: string, documentId: string) => `/doc-packs/${id}/documents/${documentId}`,
  docPackGenerateQuiz: (id: string) => `/doc-packs/${id}/generate-quiz`,
  docPackQuiz: (id: string) => `/doc-packs/${id}/quiz`,
  docPackRegenerateQuestions: (id: string) => `/doc-packs/${id}/quiz/regenerate-questions`,
  docPackAssignments: (id: string) => `/doc-packs/${id}/assignments`,

  // Assignments (Doc Pack PRD §6)
  assignment: (id: string) => `/assignments/${id}`,
  assignmentDocumentContent: (id: string, documentId: string) =>
    `/assignments/${id}/documents/${documentId}/content`,
  assignmentAck: (id: string, documentId: string) => `/assignments/${id}/documents/${documentId}/ack`,
  assignmentStartQuiz: (id: string) => `/assignments/${id}/start-quiz`,

  // Quiz grading — reused across policy/codebase/doc_pack (fixes PRD §9 path mismatch)
  gradeAttempt: (attemptId: string) => `/quizzes/attempts/${attemptId}/grade`,

  chat: "/chat",
  experts: "/experts",
  dashboardBusFactor: (repoId: string) => `/dashboard/bus-factor?repoId=${repoId}`,
  dashboardQuizAnalytics: (repoId: string) => `/dashboard/quiz-analytics?repoId=${repoId}`,
} as const;
