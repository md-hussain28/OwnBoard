import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { type CohortDashboard, cohortDashboardSchema } from "@/schemas/cohort.schema";
import {
  type AssignmentDetail,
  type AssignmentDocumentContent,
  type AssignmentOutcome,
  assignmentDetailSchema,
  assignmentDocumentContentSchema,
  assignmentOutcomeListSchema,
  type PackAssignment,
  packAssignmentListSchema,
  packAssignmentSchema,
  type StartQuizResponse,
  startQuizResponseSchema,
} from "@/schemas/packAssignment.schema";

export const packAssignmentService = {
  async createForPack(packId: string, employeeIds: string[]): Promise<PackAssignment[]> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPackAssignments(packId), {
      employee_ids: employeeIds,
    });
    return packAssignmentListSchema.parse(data);
  },

  async listForPack(packId: string): Promise<PackAssignment[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.docPackAssignments(packId));
    return packAssignmentListSchema.parse(data);
  },

  async listForEmployee(employeeId: string): Promise<PackAssignment[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.employeeAssignments(employeeId));
    return packAssignmentListSchema.parse(data);
  },

  async listOutcomes(): Promise<AssignmentOutcome[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.assignmentOutcomes);
    return assignmentOutcomeListSchema.parse(data);
  },

  /** Admin cohort matrix: employees × tracks with aggregate onboarding stats. */
  async getCohort(): Promise<CohortDashboard> {
    const { data } = await getApiClient().get(API_ENDPOINTS.onboardingCohort);
    return cohortDashboardSchema.parse(data);
  },

  async getDetail(assignmentId: string): Promise<AssignmentDetail> {
    const { data } = await getApiClient().get(API_ENDPOINTS.assignment(assignmentId));
    return assignmentDetailSchema.parse(data);
  },

  async revoke(assignmentId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.assignment(assignmentId));
  },

  async getDocumentContent(
    assignmentId: string,
    documentId: string,
  ): Promise<AssignmentDocumentContent> {
    const { data } = await getApiClient().get(
      API_ENDPOINTS.assignmentDocumentContent(assignmentId, documentId),
      { timeout: 60_000 },
    );
    return assignmentDocumentContentSchema.parse(data);
  },

  async ackDocument(assignmentId: string, documentId: string): Promise<PackAssignment> {
    const { data } = await getApiClient().post(
      API_ENDPOINTS.assignmentAck(assignmentId, documentId),
    );
    return packAssignmentSchema.parse(data);
  },

  async startQuiz(assignmentId: string): Promise<StartQuizResponse> {
    const { data } = await getApiClient().post(API_ENDPOINTS.assignmentStartQuiz(assignmentId));
    return startQuizResponseSchema.parse(data);
  },
};
