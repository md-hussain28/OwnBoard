import { AssignmentView } from "./view";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <AssignmentView assignmentId={assignmentId} />;
}
