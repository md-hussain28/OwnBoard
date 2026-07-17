import { delay, HttpResponse, http } from "msw";
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
  mockMe,
  mockOrgDomains,
  mockPendingInvitations,
  mockQuizAnalytics,
  mockQuizAttempt,
  mockQuizDomains,
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
    return HttpResponse.json(
      { id: "repo_new1234567890abcd", ...body, ingested_at: null },
      { status: 201 },
    );
  }),
];

export const dashboardHandlers = [
  http.get("/api/dashboard/bus-factor", () => HttpResponse.json(mockBusFactor)),
  http.get("/api/dashboard/quiz-analytics", () => HttpResponse.json(mockQuizAnalytics)),
];

/** Mirrors the backend: an absent or null `domain_id` clears the domain; otherwise look it up. */
function findMockDomain(domainId: string | null | undefined) {
  if (domainId === undefined || domainId === null) return null;
  return mockOrgDomains.find((d) => d.id === domainId) ?? null;
}

export const employeeHandlers = [
  http.get("/api/me", () => HttpResponse.json(mockMe)),
  http.get("/api/employees", () => HttpResponse.json(mockEmployees)),
  http.get("/api/employees/:employeeId/assignments", () => HttpResponse.json(mockAssignments)),
  http.get("/api/employees/invitations", () => HttpResponse.json(mockPendingInvitations)),
  http.post("/api/employees/invitations", async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      app_role?: string;
      role?: string | null;
      github_handle?: string | null;
      domain_id?: string | null;
    };
    const domain = findMockDomain(body.domain_id);
    return HttpResponse.json(
      {
        id: `inv_${Date.now()}`,
        email_address: body.email,
        app_role: body.app_role ?? "member",
        status: "pending",
        role: body.role ?? null,
        github_handle: body.github_handle ?? null,
        domain_id: body.domain_id ?? null,
        domain_name: domain?.name ?? null,
        created_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),
  http.delete("/api/employees/invitations/:id", ({ params }) => {
    const existing =
      mockPendingInvitations.find((invite) => invite.id === params.id) ?? mockPendingInvitations[0];
    return HttpResponse.json({
      ...existing,
      id: String(params.id),
      status: "revoked",
    });
  }),
  http.patch("/api/employees/:id", async ({ params, request }) => {
    const body = (await request.json()) as {
      app_role?: string;
      role?: string | null;
      domain_id?: string | null;
    };
    const existing = mockEmployees.find((e) => e.id === params.id) ?? mockEmployees[0];
    const domain = findMockDomain(body.domain_id);
    return HttpResponse.json({
      ...existing,
      app_role: body.app_role ?? existing.app_role,
      role: body.role !== undefined ? body.role : existing.role,
      domain_id: body.domain_id !== undefined ? body.domain_id : existing.domain_id,
      domain_name: body.domain_id !== undefined ? (domain?.name ?? null) : existing.domain_name,
    });
  }),
];

export const domainHandlers = [
  http.get("/api/domains", () => HttpResponse.json(mockOrgDomains)),
  http.post("/api/domains", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json(
      {
        id: `dom_${body.name.toLowerCase().replace(/\s+/g, "_")}`,
        org_id: "org_demo",
        name: body.name,
        is_default: false,
      },
      { status: 201 },
    );
  }),
  http.delete("/api/domains/:id", () => new HttpResponse(null, { status: 204 })),
];

export const quizDomainHandlers = [
  http.get("/api/quiz-domains", () => HttpResponse.json(mockQuizDomains)),
  http.post("/api/quiz-domains", async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json(
      {
        id: `qdom_${body.name.toLowerCase().replace(/\s+/g, "_")}`,
        org_id: "org_demo",
        name: body.name,
        is_default: false,
      },
      { status: 201 },
    );
  }),
  http.delete("/api/quiz-domains/:id", () => new HttpResponse(null, { status: 204 })),
];

export const docPackHandlers = [
  http.get("/api/doc-packs", () => HttpResponse.json(mockDocPacks)),
  http.get("/api/doc-packs/:id", () => HttpResponse.json(mockDocPackDetail)),
  http.get("/api/doc-packs/:id/documents/status", () => HttpResponse.json(mockDocPackIngestStatus)),
  http.post("/api/doc-packs", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      domain_id?: string | null;
    };
    const domain = mockQuizDomains.find((d) => d.id === body.domain_id);
    return HttpResponse.json(
      {
        id: "pack_new1234567890abcd",
        name: body.name,
        description: body.description ?? null,
        status: "draft",
        created_by: null,
        created_at: "2026-07-16T12:00:00Z",
        domain_id: domain?.id ?? null,
        domain_name: domain?.name ?? null,
        documents: [],
      },
      { status: 201 },
    );
  }),
  http.patch("/api/doc-packs/:id", async ({ request }) => {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      domain_id?: string | null;
    };
    const domain =
      body.domain_id === undefined
        ? mockQuizDomains.find((d) => d.id === mockDocPackDetail.domain_id)
        : mockQuizDomains.find((d) => d.id === body.domain_id);
    return HttpResponse.json({
      ...mockDocPackDetail,
      ...body,
      domain_id: body.domain_id === undefined ? mockDocPackDetail.domain_id : (domain?.id ?? null),
      domain_name:
        body.domain_id === undefined ? mockDocPackDetail.domain_name : (domain?.name ?? null),
    });
  }),
  http.get("/api/doc-packs/:id/quiz", () => HttpResponse.json(mockAdminQuizTemplate)),
  http.put("/api/doc-packs/:id/quiz", () => HttpResponse.json(mockAdminQuizTemplate)),
  http.get("/api/doc-packs/:id/assignments", () => HttpResponse.json(mockAssignments)),
  http.post("/api/doc-packs/:id/assignments", () =>
    HttpResponse.json(mockAssignments, { status: 201 }),
  ),
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
    return HttpResponse.json({
      ...mockQuizAttempt,
      score: 1,
      passed: true,
      completed_at: "2026-07-16T12:05:00Z",
    });
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
  http.get("/api/admin/me", () =>
    HttpResponse.json({ isPlatformAdmin: true, email: "admin@ownboard.dev" }),
  ),
  http.get("/api/admin/tenants", () => HttpResponse.json(mockTenants)),
];

/** Default happy-path handlers applied to every story (see .storybook/preview.tsx). */
export const handlers = [
  ...repoHandlers,
  ...dashboardHandlers,
  ...employeeHandlers,
  ...domainHandlers,
  ...quizDomainHandlers,
  ...docPackHandlers,
  ...assignmentHandlers,
  ...quizHandlers,
  ...chatHandlers,
  ...adminHandlers,
];
