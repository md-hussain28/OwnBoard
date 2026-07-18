"use client";

import {
  ASSIGNMENT_STATUS_LABEL,
  AssignmentRoster,
  assignmentStatusVariant,
} from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui";

export { ASSIGNMENT_STATUS_LABEL, assignmentStatusVariant };

export function DocPackAssignments({
  packId,
  quizPublished,
}: {
  packId: string;
  quizPublished: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!quizPublished && (
          <p className="text-sm text-muted-foreground">
            Save a curated quiz first — packs without a published quiz can’t be assigned.
          </p>
        )}
        <AssignmentRoster
          packId={packId}
          quizPublished={quizPublished}
          chooseHeading="Assign to employees"
        />
      </CardContent>
    </Card>
  );
}
