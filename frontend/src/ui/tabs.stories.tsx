import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="documents" className="max-w-md">
      <TabsList>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="quiz">Quiz</TabsTrigger>
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
      </TabsList>
      <TabsContent value="documents" className="text-sm text-muted-foreground">
        Upload and manage the documents in this pack.
      </TabsContent>
      <TabsContent value="quiz" className="text-sm text-muted-foreground">
        Generate and curate the pack quiz.
      </TabsContent>
      <TabsContent value="assignments" className="text-sm text-muted-foreground">
        Assign this pack to employees and track progress.
      </TabsContent>
    </Tabs>
  ),
};
