import { ProjectOverviewView } from "./view";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectOverviewView id={id} />;
}
