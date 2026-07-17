import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MemberProjectDetail } from "@/components/project/member-project-detail";
import { projectDetailSchema } from "@/schemas/project.schema";
import { mockProjectDetailLocked, mockProjectDetailReady } from "../../../.storybook/mocks/data";
import { handlers } from "../../../.storybook/mocks/handlers";

const meta = {
  title: "Components/Project/MemberProjectDetail",
  component: MemberProjectDetail,
  parameters: { msw: { handlers } },
} satisfies Meta<typeof MemberProjectDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Gate not yet cleared: the onboarding tracks show, the team panel stays locked. */
export const Locked: Story = {
  args: { project: projectDetailSchema.parse(mockProjectDetailLocked) },
};

/** Gate cleared: every track passed and the team panel (go-to people) is revealed. */
export const Ready: Story = {
  args: { project: projectDetailSchema.parse(mockProjectDetailReady) },
};
