import { ProjectMembersView } from "./view";

export default async function ProjectMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectMembersView id={id} />;
}
