import { z } from "zod";
import { quizAttemptSchema, quizTemplateSchema } from "@/schemas/quiz.schema";

export const packAssignmentStatusSchema = z.enum([
  "assigned",
  "reading",
  "ready_for_quiz",
  "quiz_in_progress",
  "passed",
  "failed",
]);

export const packAssignmentSchema = z
  .object({
    id: z.string(),
    doc_pack_id: z.string(),
    employee_id: z.string(),
    assigned_by: z.string().nullable(),
    assigned_at: z.string(),
    status: packAssignmentStatusSchema,
    quiz_template_id: z.string().nullable(),
    completed_at: z.string().nullable(),
    doc_pack_name: z.string().nullable().optional(),
    acks: z.array(z.object({ document_id: z.string(), acknowledged_at: z.string() })).default([]),
  })
  .transform((a) => ({
    id: a.id,
    docPackId: a.doc_pack_id,
    employeeId: a.employee_id,
    assignedBy: a.assigned_by,
    assignedAt: a.assigned_at,
    status: a.status,
    quizTemplateId: a.quiz_template_id,
    completedAt: a.completed_at,
    docPackName: a.doc_pack_name ?? null,
    acks: a.acks.map((ack) => ({
      documentId: ack.document_id,
      acknowledgedAt: ack.acknowledged_at,
    })),
  }));

export const assignmentDetailSchema = z
  .object({
    id: z.string(),
    doc_pack_id: z.string(),
    doc_pack_name: z.string(),
    employee_id: z.string(),
    status: packAssignmentStatusSchema,
    quiz_template_id: z.string().nullable(),
    assigned_at: z.string(),
    completed_at: z.string().nullable(),
    documents: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        file_type: z.string(),
        status: z.string(),
        acknowledged_at: z.string().nullable(),
      }),
    ),
    quiz_unlocked: z.boolean(),
  })
  .transform((a) => ({
    id: a.id,
    docPackId: a.doc_pack_id,
    docPackName: a.doc_pack_name,
    employeeId: a.employee_id,
    status: a.status,
    quizTemplateId: a.quiz_template_id,
    assignedAt: a.assigned_at,
    completedAt: a.completed_at,
    documents: a.documents.map((d) => ({
      id: d.id,
      title: d.title,
      fileType: d.file_type,
      status: d.status,
      acknowledgedAt: d.acknowledged_at,
    })),
    quizUnlocked: a.quiz_unlocked,
  }));

export const assignmentDocumentContentSchema = z
  .object({
    document_id: z.string(),
    title: z.string(),
    file_type: z.string(),
    content: z.string(),
  })
  .transform((d) => ({
    documentId: d.document_id,
    title: d.title,
    fileType: d.file_type,
    content: d.content,
  }));

export const startQuizResponseSchema = z.object({
  attempt: quizAttemptSchema,
  template: quizTemplateSchema,
});

export const assignmentOutcomeSchema = z
  .object({
    id: z.string(),
    doc_pack_id: z.string(),
    doc_pack_name: z.string(),
    employee_id: z.string(),
    employee_name: z.string(),
    status: packAssignmentStatusSchema,
    assigned_at: z.string(),
    completed_at: z.string().nullable(),
    updated_at: z.string(),
  })
  .transform((o) => ({
    id: o.id,
    docPackId: o.doc_pack_id,
    docPackName: o.doc_pack_name,
    employeeId: o.employee_id,
    employeeName: o.employee_name,
    status: o.status,
    assignedAt: o.assigned_at,
    completedAt: o.completed_at,
    updatedAt: o.updated_at,
  }));

export const packAssignmentListSchema = z.array(packAssignmentSchema);
export const assignmentOutcomeListSchema = z.array(assignmentOutcomeSchema);

export type PackAssignmentStatus = z.infer<typeof packAssignmentStatusSchema>;
export type PackAssignment = z.infer<typeof packAssignmentSchema>;
export type AssignmentDetail = z.infer<typeof assignmentDetailSchema>;
export type AssignmentDocumentContent = z.infer<typeof assignmentDocumentContentSchema>;
export type StartQuizResponse = z.infer<typeof startQuizResponseSchema>;
export type AssignmentOutcome = z.infer<typeof assignmentOutcomeSchema>;
