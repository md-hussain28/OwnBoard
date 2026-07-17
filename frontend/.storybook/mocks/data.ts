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
  {
    id: "emp_a1b2c3d4e5f6g7h8i9",
    org_id: "org_demo",
    name: "Priya Sharma",
    role: "Backend Engineer",
    app_role: "admin",
    github_handle: "priyash",
    domain_id: "dom_developer",
    domain_name: "Developer",
  },
  {
    id: "emp_b2c3d4e5f6g7h8i9j0",
    org_id: "org_demo",
    name: "Diego Alvarez",
    role: "Frontend Engineer",
    app_role: "member",
    github_handle: "dalvarez",
    domain_id: "dom_developer",
    domain_name: "Developer",
  },
  {
    id: "emp_c3d4e5f6g7h8i9j0k1",
    org_id: "org_demo",
    name: "Mei Lin",
    role: null,
    app_role: "member",
    github_handle: null,
    domain_id: "dom_marketing",
    domain_name: "Marketing",
  },
];

export const mockPendingInvitations = [
  {
    id: "inv_a1b2c3d4e5f6g7h8i9",
    email_address: "jordan.lee@example.com",
    app_role: "member",
    status: "pending",
    role: "Product Designer",
    github_handle: "jlee",
    domain_id: "dom_design",
    domain_name: "Design",
    created_at: "2026-07-16T10:00:00Z",
  },
  {
    id: "inv_b2c3d4e5f6g7h8i9j0",
    email_address: "sam.okafor@example.com",
    app_role: "admin",
    status: "pending",
    role: null,
    github_handle: null,
    domain_id: null,
    domain_name: null,
    created_at: "2026-07-17T08:30:00Z",
  },
];

export const mockOrgDomains = [
  { id: "dom_developer", org_id: "org_demo", name: "Developer", is_default: true },
  { id: "dom_marketing", org_id: "org_demo", name: "Marketing", is_default: true },
  { id: "dom_design", org_id: "org_demo", name: "Design", is_default: true },
  { id: "dom_product", org_id: "org_demo", name: "Product", is_default: true },
  { id: "dom_sales", org_id: "org_demo", name: "Sales", is_default: true },
  { id: "dom_operations", org_id: "org_demo", name: "Operations", is_default: true },
  { id: "dom_people", org_id: "org_demo", name: "People", is_default: true },
  { id: "dom_finance", org_id: "org_demo", name: "Finance", is_default: true },
];

export const mockQuizDomains = [
  { id: "qdom_policy", org_id: "org_demo", name: "Policy", is_default: true },
  { id: "qdom_security", org_id: "org_demo", name: "Security", is_default: true },
  { id: "qdom_holiday", org_id: "org_demo", name: "Holiday", is_default: true },
  { id: "qdom_onboarding", org_id: "org_demo", name: "Onboarding", is_default: true },
  { id: "qdom_benefits", org_id: "org_demo", name: "Benefits", is_default: true },
  { id: "qdom_codebase", org_id: "org_demo", name: "Codebase", is_default: true },
];

export const mockMe = {
  user_id: "user_storybook",
  org_id: "org_2abcDEFghiJKLmno",
  employee_id: "emp_a1b2c3d4e5f6g7h8i9",
  app_role: "admin",
};

// --- Doc packs (docPack.schema.ts — snake_case) ---
export const mockDocPacks = [
  {
    id: "pack_a1b2c3d4e5f6g7h8i9",
    name: "Security & Compliance",
    description: "SOC 2 controls, incident response, and data handling policies.",
    status: "active",
    created_by: "emp_a1b2c3d4e5f6g7h8i9",
    created_at: "2026-07-01T12:00:00Z",
    domain_id: "qdom_security",
    domain_name: "Security",
  },
  {
    id: "pack_b2c3d4e5f6g7h8i9j0",
    name: "Engineering Handbook",
    description: null,
    status: "draft",
    created_by: null,
    created_at: "2026-07-08T15:30:00Z",
    domain_id: "qdom_onboarding",
    domain_name: "Onboarding",
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

// Lightweight ingest-status poll (docPackIngestStatusSchema — snake_case)
export const mockDocPackIngestStatus = {
  pack_id: "pack_a1b2c3d4e5f6g7h8i9",
  total: mockDocuments.length,
  processed: mockDocuments.filter((d) => d.status === "processed").length,
  failed: mockDocuments.filter((d) => d.status === "failed").length,
  pending: mockDocuments.filter((d) => d.status === "processing" || d.status === "uploaded").length,
  is_complete: false,
  documents: mockDocuments.map((d) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    page_count: d.page_count,
    error_message: d.error_message,
  })),
};

// --- Pack assignments (packAssignment.schema.ts — snake_case) ---
export const mockAssignments = [
  {
    id: "asg_a1b2c3d4e5f6g7h8i9",
    doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
    doc_pack_name: "Security & Compliance",
    employee_id: "emp_a1b2c3d4e5f6g7h8i9",
    assigned_by: "emp_b2c3d4e5f6g7h8i9j0",
    assigned_at: "2026-07-05T09:00:00Z",
    status: "reading",
    quiz_template_id: null,
    completed_at: null,
    acks: [{ document_id: "doc_a1b2c3d4e5f6g7h8i9", acknowledged_at: "2026-07-06T11:00:00Z" }],
  },
  {
    id: "asg_c3d4e5f6g7h8i9j0k1",
    doc_pack_id: "pack_b2c3d4e5f6g7h8i9j0",
    doc_pack_name: "Engineering Handbook",
    employee_id: "emp_a1b2c3d4e5f6g7h8i9",
    assigned_by: "emp_b2c3d4e5f6g7h8i9j0",
    assigned_at: "2026-07-16T14:00:00Z",
    status: "assigned",
    quiz_template_id: null,
    completed_at: null,
    acks: [],
  },
  {
    id: "asg_b2c3d4e5f6g7h8i9j0",
    doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
    doc_pack_name: "Security & Compliance",
    employee_id: "emp_b2c3d4e5f6g7h8i9j0",
    assigned_by: null,
    assigned_at: "2026-07-04T09:00:00Z",
    status: "passed",
    quiz_template_id: "qt_a1b2c3d4e5f6g7h8i9",
    completed_at: "2026-07-07T16:45:00Z",
    acks: [],
  },
];

/** Admin inbox — passed/failed only (GET /assignments/outcomes). */
export const mockAssignmentOutcomes = [
  {
    id: "asg_b2c3d4e5f6g7h8i9j0",
    doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
    doc_pack_name: "Security & Compliance",
    employee_id: "emp_b2c3d4e5f6g7h8i9j0",
    employee_name: "Diego Alvarez",
    status: "passed",
    assigned_at: "2026-07-04T09:00:00Z",
    completed_at: "2026-07-07T16:45:00Z",
    updated_at: "2026-07-07T16:45:00Z",
  },
  {
    id: "asg_d4e5f6g7h8i9j0k1l2",
    doc_pack_id: "pack_b2c3d4e5f6g7h8i9j0",
    doc_pack_name: "Engineering Handbook",
    employee_id: "emp_a1b2c3d4e5f6g7h8i9",
    employee_name: "Priya Sharma",
    status: "failed",
    assigned_at: "2026-07-10T10:00:00Z",
    completed_at: null,
    updated_at: "2026-07-16T11:20:00Z",
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
  // Storybook has no real storage — empty file_url falls back to extracted text in the reader.
  file_url: null,
};

// --- Quizzes (quiz.schema.ts — snake_case, admin shape includes correct_answer) ---
export const mockAdminQuizTemplate = {
  id: "qt_a1b2c3d4e5f6g7h8i9",
  type: "doc_pack",
  source_ref: "pack_a1b2c3d4e5f6g7h8i9",
  custom_instructions: null,
  is_published: true,
  open_book: false,
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

// --- Projects (project.schema.ts — snake_case wire shape, schema .transform()s to camelCase) ---
const lockedReadiness = {
  locked: true,
  total_tracks: 3,
  passed_tracks: 1,
  in_progress_tracks: 2,
  progress_pct: 33,
};
const readyReadiness = {
  locked: false,
  total_tracks: 3,
  passed_tracks: 3,
  in_progress_tracks: 0,
  progress_pct: 100,
};

const projectBase = {
  org_id: "org_demo",
  created_by: "emp_a1b2c3d4e5f6g7h8i9",
  created_at: "2026-07-01T09:00:00Z",
  updated_at: "2026-07-14T09:00:00Z",
};

export const mockProjects = [
  {
    ...projectBase,
    id: "proj_a1b2c3d4e5f6g7h8i9",
    name: "Payments Service",
    description: "The core billing and payments platform.",
    status: "active",
    repo_id: "repo_a1b2c3d4e5f6g7h8i9",
    repo_name: "payments-service",
    member_count: 4,
    track_count: 3,
  },
  {
    ...projectBase,
    id: "proj_b2c3d4e5f6g7h8i9j0",
    name: "Growth Experiments",
    description: "A/B testing and growth analytics.",
    status: "active",
    repo_id: null,
    repo_name: null,
    member_count: 2,
    track_count: 1,
  },
  {
    ...projectBase,
    id: "proj_c3d4e5f6g7h8i9j0k1",
    name: "Legacy Monolith",
    description: "Deprecated — kept for reference only.",
    status: "archived",
    repo_id: null,
    repo_name: null,
    member_count: 0,
    track_count: 0,
  },
];

export const mockMyProjects = [
  { ...mockProjects[0], readiness: lockedReadiness },
  { ...mockProjects[1], readiness: readyReadiness },
];

export const mockProjectTracks = [
  {
    id: "pack_p1a2b3c4d5e6f7g8h9",
    name: "Payments Codebase Walkthrough",
    description: "Architecture, services, and the money-movement flow.",
    status: "active",
    sequence_order: 0,
    estimated_minutes: 45,
    due_offset_days: 7,
    assignment_id: "asgn_p1a2b3c4d5e6f7g8h9",
    my_status: "passed",
    passed: true,
  },
  {
    id: "pack_p2b3c4d5e6f7g8h9i0",
    name: "PCI Compliance Basics",
    description: "What you can and can't touch when handling card data.",
    status: "active",
    sequence_order: 1,
    estimated_minutes: 30,
    due_offset_days: 14,
    assignment_id: "asgn_p2b3c4d5e6f7g8h9i0",
    my_status: "assigned",
    passed: false,
  },
  {
    id: "pack_p3c4d5e6f7g8h9i0j1",
    name: "On-call Runbook",
    description: "Incident response for the payments oncall rotation.",
    status: "draft",
    sequence_order: 2,
    estimated_minutes: null,
    due_offset_days: null,
    assignment_id: null,
    my_status: "not_assigned",
    passed: false,
  },
];

export const mockProjectMembers = [
  {
    employee_id: "emp_a1b2c3d4e5f6g7h8i9",
    name: "Priya Sharma",
    role: "Backend Engineer",
    app_role: "member",
    github_handle: "priyash",
    domain_name: "Developer",
    readiness: readyReadiness,
    is_go_to: true,
  },
  {
    employee_id: "emp_b2c3d4e5f6g7h8i9j0",
    name: "Diego Alvarez",
    role: "Frontend Engineer",
    app_role: "member",
    github_handle: "dalvarez",
    domain_name: "Developer",
    readiness: lockedReadiness,
    is_go_to: false,
  },
];

/** Member's view of a locked project: gate not yet cleared, team panel hidden. */
export const mockProjectDetailLocked = {
  ...mockProjects[0],
  repo_url: "https://github.com/example/payments-service",
  tracks: mockProjectTracks,
  my_readiness: lockedReadiness,
  is_member: true,
  is_admin: false,
  locked: true,
};

/** Member's view of an unlocked project: gate cleared, team panel visible. */
export const mockProjectDetailReady = {
  ...mockProjectDetailLocked,
  tracks: mockProjectTracks.map((t) => ({ ...t, passed: true, my_status: "passed" })),
  my_readiness: readyReadiness,
  locked: false,
};

/** Admin's view of a project (not a member — no personal readiness). */
export const mockProjectDetailAdmin = {
  ...mockProjectDetailLocked,
  my_readiness: null,
  is_member: false,
  is_admin: true,
  locked: false,
};

// --- Admin (admin.schema.ts — camelCase, no transform) ---
export const mockTenants = [
  {
    id: "org_2abcDEFghiJKLmno",
    name: "Acme Robotics",
    slug: "acme-robotics",
    membersCount: 24,
    createdAt: "2026-06-01T08:00:00Z",
  },
  {
    id: "org_2pqrSTUvwxYZAbcd",
    name: "Nimbus Health",
    slug: null,
    membersCount: 7,
    createdAt: "2026-07-11T14:20:00Z",
  },
];
