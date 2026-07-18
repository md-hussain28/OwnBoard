export const API_ENDPOINTS = {
  me: "/me",
  adminMe: "/admin/me",
  adminTenants: "/admin/tenants",
  adminTenant: (id: string) => `/admin/tenants/${id}`,
  repos: "/repos",
  repo: (id: string) => `/repos/${id}`,
  employees: "/employees",
  employee: (id: string) => `/employees/${id}`,
  employeeInvitations: "/employees/invitations",
  employeeInvitation: (id: string) => `/employees/invitations/${id}`,
  employeeAssignments: (employeeId: string) => `/employees/${employeeId}/assignments`,

  domains: "/domains",
  domain: (id: string) => `/domains/${id}`,

  // Projects (Projects PRD §1)
  projects: "/projects",
  myProjects: "/projects/mine",
  project: (id: string) => `/projects/${id}`,
  projectMembers: (id: string) => `/projects/${id}/members`,
  projectMember: (id: string, employeeId: string) => `/projects/${id}/members/${employeeId}`,
  projectTracks: (id: string) => `/projects/${id}/tracks`,
  projectRepos: (id: string) => `/projects/${id}/repos`,
  projectRepo: (id: string, repoId: string) => `/projects/${id}/repos/${repoId}`,
  projectFunctionTypes: (id: string) => `/projects/${id}/function-types`,
  projectFunctionType: (id: string, functionTypeId: string) =>
    `/projects/${id}/function-types/${functionTypeId}`,
  projectModules: (id: string) => `/projects/${id}/modules`,
  projectModule: (id: string, moduleId: string) => `/projects/${id}/modules/${moduleId}`,
  projectModuleProgress: (id: string, moduleId: string) =>
    `/projects/${id}/modules/${moduleId}/progress`,

  quizDomains: "/quiz-domains",
  quizDomain: (id: string) => `/quiz-domains/${id}`,

  // Doc Packs (Doc Pack PRD §6)
  docPacks: "/doc-packs",
  docPack: (id: string) => `/doc-packs/${id}`,
  docPackDocuments: (id: string) => `/doc-packs/${id}/documents`,
  docPackDocument: (id: string, documentId: string) => `/doc-packs/${id}/documents/${documentId}`,
  docPackDocumentsStatus: (id: string) => `/doc-packs/${id}/documents/status`,
  docPackGenerateQuiz: (id: string) => `/doc-packs/${id}/generate-quiz`,
  docPackQuiz: (id: string) => `/doc-packs/${id}/quiz`,
  docPackRegenerateQuestions: (id: string) => `/doc-packs/${id}/quiz/regenerate-questions`,
  docPackAssignments: (id: string) => `/doc-packs/${id}/assignments`,
  docPackAudiencePreview: "/doc-packs/audience-preview",

  // Assignments (Doc Pack PRD §6)
  assignmentOutcomes: "/assignments/outcomes",
  onboardingCohort: "/onboarding/cohort",
  assignment: (id: string) => `/assignments/${id}`,
  assignmentDocumentContent: (id: string, documentId: string) =>
    `/assignments/${id}/documents/${documentId}/content`,
  assignmentAck: (id: string, documentId: string) =>
    `/assignments/${id}/documents/${documentId}/ack`,
  assignmentStartQuiz: (id: string) => `/assignments/${id}/start-quiz`,

  // Quiz grading — reused across policy/codebase/doc_pack (fixes PRD §9 path mismatch)
  gradeAttempt: (attemptId: string) => `/quizzes/attempts/${attemptId}/grade`,

  // Notifications
  notifications: "/notifications",
  notificationsUnreadCount: "/notifications/unread-count",
  notificationRead: (id: string) => `/notifications/${id}/read`,
  notificationsReadAll: "/notifications/read-all",

  chat: "/chat",
  experts: "/experts",
  dashboardBusFactor: (repoId: string) => `/dashboard/bus-factor?repoId=${repoId}`,
  dashboardQuizAnalytics: (repoId: string) => `/dashboard/quiz-analytics?repoId=${repoId}`,

  // GitHub knowledge base — ingest keys + skill graph + experts (repo-scoped).
  ingestKeys: (repoId: string) => `/repos/${repoId}/ingest-keys`,
  ingestKey: (repoId: string, keyId: string) => `/repos/${repoId}/ingest-keys/${keyId}`,
  skillGraphExpertise: (repoId: string) => `/repos/${repoId}/skill-graph/expertise`,
  skillGraphBusFactor: (repoId: string) => `/repos/${repoId}/skill-graph/bus-factor`,
  repoExperts: (repoId: string) => `/repos/${repoId}/experts`,
} as const;
