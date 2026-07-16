/**
 * Mock backend payloads for Storybook. Shapes mirror the *wire* format each
 * zod schema in `src/schemas/` expects (snake_case where the schema has a
 * `.transform()`, camelCase where it doesn't — e.g. dashboard).
 */

// --- Repos (repo.schema.ts — accepts snake or camel `ingested_at`) ---
export const mockRepos = [
  {
    id: "repo_a1b2c3d4e5f6g7h8i9",
    url: "https://github.com/ownboard/api",
    name: "ownboard-api",
    ingested_at: "2026-07-10T09:30:00Z",
  },
  {
    id: "repo_j1k2l3m4n5o6p7q8r9",
    url: "https://github.com/ownboard/web",
    name: "ownboard-web",
    ingested_at: null,
  },
];

// --- Dashboard (dashboard.schema.ts — camelCase, no transform) ---
export const mockBusFactor = [
  { subsystem: "auth", topContributorShare: 0.92, riskLevel: "high" },
  { subsystem: "billing", topContributorShare: 0.61, riskLevel: "medium" },
  { subsystem: "notifications", topContributorShare: 0.34, riskLevel: "low" },
];

export const mockQuizAnalytics = {
  passRate: 0.78,
  commonFailurePoints: [
    "How the ingestion pipeline dedupes commits",
    "Which service owns webhook retries",
  ],
};

// --- Employees (employee.schema.ts — snake_case) ---
export const mockEmployees = [
  { id: "emp_a1b2c3d4e5f6g7h8i9", org_id: "org_demo", name: "Priya Sharma", role: "Backend Engineer", github_handle: "priyash" },
  { id: "emp_b2c3d4e5f6g7h8i9j0", org_id: "org_demo", name: "Diego Alvarez", role: "Frontend Engineer", github_handle: "dalvarez" },
  { id: "emp_c3d4e5f6g7h8i9j0k1", org_id: "org_demo", name: "Mei Lin", role: null, github_handle: null },
];

// --- Doc packs (docPack.schema.ts — snake_case) ---
export const mockDocPacks = [
  {
    id: "pack_a1b2c3d4e5f6g7h8i9",
    name: "Security & Compliance",
    description: "SOC 2 controls, incident response, and data handling policies.",
    status: "active",
    created_by: "emp_a1b2c3d4e5f6g7h8i9",
    created_at: "2026-07-01T12:00:00Z",
  },
  {
    id: "pack_b2c3d4e5f6g7h8i9j0",
    name: "Engineering Handbook",
    description: null,
    status: "draft",
    created_by: null,
    created_at: "2026-07-08T15:30:00Z",
  },
];

export const mockDocuments = [
  {
    id: "doc_a1b2c3d4e5f6g7h8i9",
    doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
    title: "Incident Response Runbook",
    file_type: "pdf",
    file_size_bytes: 482_133,
    status: "processed",
    page_count: 14,
    error_message: null,
    created_at: "2026-07-02T10:00:00Z",
  },
  {
    id: "doc_b2c3d4e5f6g7h8i9j0",
    doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
    title: "Data Handling Policy",
    file_type: "md",
    file_size_bytes: 18_204,
    status: "processing",
    page_count: null,
    error_message: null,
    created_at: "2026-07-02T10:01:00Z",
  },
  {
    id: "doc_c3d4e5f6g7h8i9j0k1",
    doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
    title: "Vendor Review Checklist",
    file_type: "docx",
    file_size_bytes: 93_500,
    status: "failed",
    page_count: null,
    error_message: "Unsupported encoding on page 3",
    created_at: "2026-07-02T10:02:00Z",
  },
];

export const mockDocPackDetail = {
  ...mockDocPacks[0],
  documents: mockDocuments,
};

// --- Pack assignments (packAssignment.schema.ts — snake_case) ---
export const mockAssignments = [
  {
    id: "asg_a1b2c3d4e5f6g7h8i9",
    doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
    employee_id: "emp_a1b2c3d4e5f6g7h8i9",
    assigned_by: "emp_b2c3d4e5f6g7h8i9j0",
    assigned_at: "2026-07-05T09:00:00Z",
    status: "reading",
    quiz_template_id: null,
    completed_at: null,
    acks: [{ document_id: "doc_a1b2c3d4e5f6g7h8i9", acknowledged_at: "2026-07-06T11:00:00Z" }],
  },
  {
    id: "asg_b2c3d4e5f6g7h8i9j0",
    doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
    employee_id: "emp_b2c3d4e5f6g7h8i9j0",
    assigned_by: null,
    assigned_at: "2026-07-04T09:00:00Z",
    status: "passed",
    quiz_template_id: "qt_a1b2c3d4e5f6g7h8i9",
    completed_at: "2026-07-07T16:45:00Z",
    acks: [],
  },
];

export const mockAssignmentDetail = {
  id: "asg_a1b2c3d4e5f6g7h8i9",
  doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
  doc_pack_name: "Security & Compliance",
  employee_id: "emp_a1b2c3d4e5f6g7h8i9",
  status: "reading",
  quiz_template_id: null,
  assigned_at: "2026-07-05T09:00:00Z",
  completed_at: null,
  documents: [
    {
      id: "doc_a1b2c3d4e5f6g7h8i9",
      title: "Incident Response Runbook",
      file_type: "pdf",
      status: "processed",
      acknowledged_at: "2026-07-06T11:00:00Z",
    },
    {
      id: "doc_b2c3d4e5f6g7h8i9j0",
      title: "Data Handling Policy",
      file_type: "md",
      status: "processed",
      acknowledged_at: null,
    },
  ],
  quiz_unlocked: false,
};

export const mockAssignmentDocumentContent = {
  document_id: "doc_a1b2c3d4e5f6g7h8i9",
  title: "Incident Response Runbook",
  file_type: "pdf",
  content:
    "# Incident Response Runbook\n\n1. Page the on-call engineer within 5 minutes of a SEV-1.\n2. Open a dedicated incident channel and appoint an incident commander.\n3. Customer-visible impact must be posted to the status page within 30 minutes.\n4. A blameless postmortem is due within 5 business days.",
};

// --- Quizzes (quiz.schema.ts — snake_case, admin shape includes correct_answer) ---
export const mockAdminQuizTemplate = {
  id: "qt_a1b2c3d4e5f6g7h8i9",
  type: "doc_pack",
  source_ref: "pack_a1b2c3d4e5f6g7h8i9",
  custom_instructions: null,
  is_published: true,
  questions: [
    {
      id: "qq_a1b2c3d4e5f6g7h8i9",
      question_text: "Within how many minutes must a SEV-1 page reach the on-call engineer?",
      options: ["5 minutes", "15 minutes", "30 minutes", "60 minutes"],
      format: "mcq_4",
      source_citation: "Incident Response Runbook, §1",
      correct_answer: "5 minutes",
    },
    {
      id: "qq_b2c3d4e5f6g7h8i9j0",
      question_text: "A blameless postmortem is due within 5 business days of a SEV-1.",
      options: ["True", "False"],
      format: "true_false",
      source_citation: "Incident Response Runbook, §4",
      correct_answer: "True",
    },
  ],
};

export const mockQuizAttempt = {
  id: "qa_a1b2c3d4e5f6g7h8i9",
  employee_id: "emp_a1b2c3d4e5f6g7h8i9",
  quiz_template_id: "qt_a1b2c3d4e5f6g7h8i9",
  score: null,
  passed: null,
  started_at: "2026-07-16T10:00:00Z",
  completed_at: null,
};

/** Employee-facing template (no correct answers). */
export const mockQuizTemplate = {
  ...mockAdminQuizTemplate,
  questions: mockAdminQuizTemplate.questions.map((q) => {
    const { correct_answer, ...employeeView } = q;
    void correct_answer;
    return employeeView;
  }),
};

// --- Chat (chat.schema.ts — camelCase, no transform) ---
export const mockChatResponse = {
  message: {
    id: "msg_a1b2c3d4e5f6g7h8i9",
    role: "assistant",
    content:
      "Webhook retries are handled by the `notifications` service — the retry queue was introduced to stop duplicate deliveries after the 2025 incident.",
    sourceCitation: {
      commitSha: "d34eaacbb1f2",
      filePath: "services/notifications/retry_queue.py",
      summary: "Introduce idempotent webhook retry queue",
    },
    confidence: "high",
  },
  expertRouting: null,
};

export const mockExpertRouting = {
  contributorName: "Priya Sharma",
  evidence: "Authored 84% of commits touching services/auth/ over the last 12 months.",
  draftMessage:
    "Hi Priya! I'm onboarding and trying to understand how session revocation works in the auth service. The assistant pointed me to you as the expert here — do you have 15 minutes this week?",
};

export const mockExperts = [
  { id: "emp_a1b2c3d4e5f6g7h8i9", name: "Priya Sharma", subsystems: ["auth", "billing"] },
  { id: "emp_b2c3d4e5f6g7h8i9j0", name: "Diego Alvarez", subsystems: ["web"] },
];

// --- Admin (admin.schema.ts — camelCase, no transform) ---
export const mockTenants = [
  { id: "org_2abcDEFghiJKLmno", name: "Acme Robotics", slug: "acme-robotics", membersCount: 24, createdAt: "2026-06-01T08:00:00Z" },
  { id: "org_2pqrSTUvwxYZAbcd", name: "Nimbus Health", slug: null, membersCount: 7, createdAt: "2026-07-11T14:20:00Z" },
];
