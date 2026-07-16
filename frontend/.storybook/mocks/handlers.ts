import { delay, http, HttpResponse } from "msw";
import {
  mockAdminQuizTemplate,
  mockAssignmentDetail,
  mockAssignmentDocumentContent,
  mockAssignments,
  mockBusFactor,
  mockChatResponse,
  mockDocPackDetail,
  mockDocPackIngestStatus,
  mockDocPacks,
  mockEmployees,
  mockExperts,
  mockQuizAnalytics,
  mockQuizAttempt,
  mockQuizTemplate,
  mockRepos,
  mockTenants,
} from "./data";

/** Story helper: the backend's stub-domain answer (see `isNotImplementedError`). */
export const notImplemented = (method: "get" | "post", path: string) =>
  http[method](path, () => HttpResponse.json({ detail: "Not implemented" }, { status: 501 }));

/** Story helper: a request that never resolves, freezing the component's loading state. */
export const loadingForever = (method: "get" | "post", path: string) =>
  http[method](path, async () => {
    await delay("infinite");
    return HttpResponse.json(null);
  });

export const repoHandlers = [
  http.get("/api/repos", () => HttpResponse.json(mockRepos)),
  http.post("/api/repos", async ({ request }) => {
    const body = (await request.json()) as { url: string; name: string };
    return HttpResponse.json({ id: "repo_new1234567890abcd", ...body, ingested_at: null }, { status: 201 });
  }),
];

export const dashboardHandlers = [
  http.get("/api/dashboard/bus-factor", () => HttpResponse.json(mockBusFactor)),
  http.get("/api/dashboard/quiz-analytics", () => HttpResponse.json(mockQuizAnalytics)),
];

export const employeeHandlers = [
  http.get("/api/employees", () => HttpResponse.json(mockEmployees)),
  http.get("/api/employees/:employeeId/assignments", () => HttpResponse.json(mockAssignments)),
];

export const docPackHandlers = [
  http.get("/api/doc-packs", () => HttpResponse.json(mockDocPacks)),
  http.get("/api/doc-packs/:id", () => HttpResponse.json(mockDocPackDetail)),
  http.get("/api/doc-packs/:id/documents/status", () => HttpResponse.json(mockDocPackIngestStatus)),
  http.post("/api/doc-packs", async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string };
    return HttpResponse.json(
      { id: "pack_new1234567890abcd", name: body.name, description: body.description ?? null, status: "draft", created_by: null, created_at: "2026-07-16T12:00:00Z", documents: [] },
      { status: 201 },
    );
  }),
  http.get("/api/doc-packs/:id/quiz", () => HttpResponse.json(mockAdminQuizTemplate)),
  http.put("/api/doc-packs/:id/quiz", () => HttpResponse.json(mockAdminQuizTemplate)),
  http.get("/api/doc-packs/:id/assignments", () => HttpResponse.json(mockAssignments)),
  http.post("/api/doc-packs/:id/assignments", () => HttpResponse.json(mockAssignments, { status: 201 })),
];

export const assignmentHandlers = [
  http.get("/api/assignments/:id", () => HttpResponse.json(mockAssignmentDetail)),
  http.get("/api/assignments/:id/documents/:documentId/content", () =>
    HttpResponse.json(mockAssignmentDocumentContent),
  ),
  http.post("/api/assignments/:id/documents/:documentId/ack", () =>
    HttpResponse.json(mockAssignments[0]),
  ),
  http.post("/api/assignments/:id/start-quiz", () =>
    HttpResponse.json({ attempt: mockQuizAttempt, template: mockQuizTemplate }),
  ),
];

export const quizHandlers = [
  // Grading is pass/fail on 100% — the mock passes when every answer matches.
  http.post("/api/quizzes/attempts/:attemptId/grade", async () => {
    await delay(400);
    return HttpResponse.json({ ...mockQuizAttempt, score: 1, passed: true, completed_at: "2026-07-16T12:05:00Z" });
  }),
];

export const chatHandlers = [
  http.post("/api/chat", async () => {
    await delay(600); // small realistic latency so pending UI is visible
    return HttpResponse.json(mockChatResponse);
  }),
  http.get("/api/experts", () => HttpResponse.json(mockExperts)),
];

export const adminHandlers = [
  http.get("/api/admin/me", () => HttpResponse.json({ isPlatformAdmin: true, email: "admin@ownboard.dev" })),
  http.get("/api/admin/tenants", () => HttpResponse.json(mockTenants)),
];

/** Default happy-path handlers applied to every story (see .storybook/preview.tsx). */
export const handlers = [
  ...repoHandlers,
  ...dashboardHandlers,
  ...employeeHandlers,
  ...docPackHandlers,
  ...assignmentHandlers,
  ...quizHandlers,
  ...chatHandlers,
  ...adminHandlers,
];
