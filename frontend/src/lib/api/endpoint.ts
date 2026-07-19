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
  projectSkills: (id: string) => `/projects/${id}/skills`,
  projectDocs: (id: string) => `/projects/${id}/docs`,
  /** Direct-to-storage upload: mint Supabase signed upload URLs (bypasses the Vercel body cap). */
  projectDocsUploadUrls: (id: string) => `/projects/${id}/docs/upload-urls`,
  /** Register objects already uploaded to storage → creates rows + starts ingest. */
  projectDocsRegister: (id: string) => `/projects/${id}/docs/register`,
  projectDoc: (id: string, documentId: string) => `/projects/${id}/docs/${documentId}`,
  /** Re-queue a failed reference doc for ingestion. */
  projectDocRetry: (id: string, documentId: string) => `/projects/${id}/docs/${documentId}/retry`,
  projectDocTypesForDoc: (id: string, documentId: string) =>
    `/projects/${id}/docs/${documentId}/types`,
  projectDocReposForDoc: (id: string, documentId: string) =>
    `/projects/${id}/docs/${documentId}/repos`,
  projectDocTypes: (id: string) => `/projects/${id}/doc-types`,
  projectDocType: (id: string, typeId: string) => `/projects/${id}/doc-types/${typeId}`,
  projectMember: (id: string, employeeId: string) => `/projects/${id}/members/${employeeId}`,
  projectRepoMembers: (id: string, repoId: string) => `/projects/${id}/repos/${repoId}/members`,
  projectTracks: (id: string) => `/projects/${id}/tracks`,
  projectTrackAssignment: (id: string, trackId: string) =>
    `/projects/${id}/tracks/${trackId}/assignment`,
  projectRepos: (id: string) => `/projects/${id}/repos`,
  projectRepo: (id: string, repoId: string) => `/projects/${id}/repos/${repoId}`,
  projectFunctionTypes: (id: string) => `/projects/${id}/function-types`,
  projectFunctionType: (id: string, functionTypeId: string) =>
    `/projects/${id}/function-types/${functionTypeId}`,
  projectModules: (id: string) => `/projects/${id}/modules`,
  projectModule: (id: string, moduleId: string) => `/projects/${id}/modules/${moduleId}`,
  projectModuleProgress: (id: string, moduleId: string) =>
    `/projects/${id}/modules/${moduleId}/progress`,
  /** Streaming project Q&A — Vercel AI SDK UI-message-stream over SSE (useChat transport, not axios). */
  projectAsk: (id: string) => `/projects/${id}/ask`,
  /** Ranked grounding context (JSON) — debug/inspection view of `/ask`. */
  projectAskContext: (id: string) => `/projects/${id}/ask/context`,
  /** Ordered extracted text for one project doc — opens when a citation is clicked. */
  projectDocContent: (id: string, documentId: string) =>
    `/projects/${id}/docs/${documentId}/content`,

  quizDomains: "/quiz-domains",
  quizDomain: (id: string) => `/quiz-domains/${id}`,

  // Doc Packs (Doc Pack PRD §6)
  docPacks: "/doc-packs",
  docPack: (id: string) => `/doc-packs/${id}`,
  docPackDocuments: (id: string) => `/doc-packs/${id}/documents`,
  /** Direct-to-storage upload: mint Supabase signed upload URLs (bypasses the Vercel body cap). */
  docPackDocumentUploadUrls: (id: string) => `/doc-packs/${id}/documents/upload-urls`,
  /** Register objects already uploaded to storage → creates rows + starts ingest. */
  docPackDocumentsRegister: (id: string) => `/doc-packs/${id}/documents/register`,
  docPackDocument: (id: string, documentId: string) => `/doc-packs/${id}/documents/${documentId}`,
  /** Re-queue a failed document for ingestion (extract → chunk → embed). */
  docPackDocumentRetry: (id: string, documentId: string) =>
    `/doc-packs/${id}/documents/${documentId}/retry`,
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

  // GitHub knowledge base — push-model ingestion + skill graph + experts + archaeology (repo-scoped).
  ingestKeys: (repoId: string) => `/repos/${repoId}/ingest-keys`,
  ingestKey: (repoId: string, keyId: string) => `/repos/${repoId}/ingest-keys/${keyId}`,
  skillGraphExpertise: (repoId: string) => `/repos/${repoId}/skill-graph/expertise`,
  skillGraphBusFactor: (repoId: string) => `/repos/${repoId}/skill-graph/bus-factor`,
  repoExperts: (repoId: string) => `/repos/${repoId}/experts`,
  repoChatAsk: (repoId: string) => `/repos/${repoId}/chat/ask`,
  repoChunkAndEmbed: (repoId: string) => `/repos/${repoId}/rag/chunk-and-embed`,
} as const;
