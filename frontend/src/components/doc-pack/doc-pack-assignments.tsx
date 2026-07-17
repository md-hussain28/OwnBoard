"use client";

import { AssignmentRoster } from "@/components/shared/assignment-roster";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

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
