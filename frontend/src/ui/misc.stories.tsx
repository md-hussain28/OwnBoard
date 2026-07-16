import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/ui/button";
import { Progress } from "@/ui/progress";
import { Separator } from "@/ui/separator";
import { Skeleton } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

const meta = {
  title: "UI/Progress & Feedback",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProgressBar: Story = {
  render: () => (
    <div className="max-w-md space-y-3">
      <Progress value={25} />
      <Progress value={78} />
      <Progress value={100} />
    </div>
  ),
};

export const LoadingSkeleton: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  ),
};

export const SeparatorExample: Story = {
  render: () => (
    <div className="max-w-md space-y-3 text-sm">
      <p>Policy quiz</p>
      <Separator />
      <p>Codebase quiz</p>
    </div>
  ),
};

export const TooltipExample: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Grounded in real git history</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
