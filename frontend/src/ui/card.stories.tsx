import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/card";

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Connected repos</CardTitle>
        <CardDescription>Repositories powering codebase quizzes.</CardDescription>
        <CardAction>
          <Badge variant="secondary">2 repos</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Connect a repository to generate git-history-grounded onboarding quizzes.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Add repo</Button>
      </CardFooter>
    </Card>
  ),
};
