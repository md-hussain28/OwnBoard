import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  type Employee,
  type EmployeeInvitation,
  employeeInviteListSchema,
  employeeInviteSchema,
  employeeListSchema,
  employeeSchema,
  type InviteEmployeeInput,
  type UpdateEmployeeInput,
} from "@/schemas/employee.schema";

export const employeeService = {
  async list(): Promise<Employee[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.employees);
    return employeeListSchema.parse(data);
  },

  async get(id: string): Promise<Employee> {
    const { data } = await getApiClient().get(API_ENDPOINTS.employee(id));
    return employeeSchema.parse(data);
  },

  async listInvitations(): Promise<EmployeeInvitation[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.employeeInvitations);
    return employeeInviteListSchema.parse(data);
  },

  async invite(input: InviteEmployeeInput): Promise<EmployeeInvitation> {
    const body: Record<string, unknown> = {
      email: input.email,
      app_role: input.appRole ?? "member",
    };
    if (input.role !== undefined) body.role = input.role;
    if (input.githubHandle !== undefined) body.github_handle = input.githubHandle;
    if (input.domainId !== undefined) body.domain_id = input.domainId;
    const { data } = await getApiClient().post(API_ENDPOINTS.employeeInvitations, body);
    return employeeInviteSchema.parse(data);
  },

  async revokeInvitation(id: string): Promise<EmployeeInvitation> {
    const { data } = await getApiClient().delete(API_ENDPOINTS.employeeInvitation(id));
    return employeeInviteSchema.parse(data);
  },

  async update(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.role !== undefined) body.role = input.role;
    if (input.githubHandle !== undefined) body.github_handle = input.githubHandle;
    if (input.appRole !== undefined) body.app_role = input.appRole;
    if (input.domainId !== undefined) body.domain_id = input.domainId;
    const { data } = await getApiClient().patch(API_ENDPOINTS.employee(id), body);
    return employeeSchema.parse(data);
  },
};
