import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { EmployeePackList } from "@/components/doc-pack/employee-pack-list";
import { docPackHandlers, employeeHandlers } from "../../../.storybook/mocks/handlers";

const meta = {
  title: "Components/DocPack/EmployeePackList",
  component: EmployeePackList,
} satisfies Meta<typeof EmployeePackList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The signed-in member's own tracks, resolved from the Clerk session (global handlers). */
export const Interactive: Story = {};

export const AllPassed: Story = {
  parameters: {
    msw: {
      handlers: [
        ...employeeHandlers.filter((h) => !h.info.path.toString().includes("assignments")),
        ...docPackHandlers,
        http.get("/api/employees/:employeeId/assignments", () =>
          HttpResponse.json([
            {
              id: "asg_passed1234567890ab",
              doc_pack_id: "pack_a1b2c3d4e5f6g7h8i9",
              employee_id: "emp_a1b2c3d4e5f6g7h8i9",
              assigned_by: null,
              assigned_at: "2026-07-04T09:00:00Z",
              status: "passed",
              quiz_template_id: "qt_a1b2c3d4e5f6g7h8i9",
              completed_at: "2026-07-07T16:45:00Z",
              acks: [],
              doc_pack_name: "Company Policy",
            },
          ]),
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        ...employeeHandlers.filter((h) => !h.info.path.toString().includes("assignments")),
        ...docPackHandlers,
        http.get("/api/employees/:employeeId/assignments", () => HttpResponse.json([])),
      ],
    },
  },
};
