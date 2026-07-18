import { ProjectExpertsView } from "./view";

export default async function ProjectExpertsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectExpertsView id={id} />;
}
