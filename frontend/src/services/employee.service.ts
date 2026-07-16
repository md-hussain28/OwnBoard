import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { employeeListSchema, employeeSchema, type Employee } from "@/schemas/employee.schema";

export const employeeService = {
  async list(): Promise<Employee[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.employees);
    return employeeListSchema.parse(data);
  },

  async get(id: string): Promise<Employee> {
    const { data } = await getApiClient().get(API_ENDPOINTS.employee(id));
    return employeeSchema.parse(data);
  },
};
