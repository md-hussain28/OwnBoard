import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

const meta = {
  title: "UI/Sheet",
  component: Sheet,
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Assignment details</SheetTitle>
          <SheetDescription>Reading progress and quiz status for this pack.</SheetDescription>
        </SheetHeader>
        <p className="px-4 text-sm text-muted-foreground">
          2 of 3 documents acknowledged. Quiz unlocks once every document is read.
        </p>
        <SheetFooter>
          <Button>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
