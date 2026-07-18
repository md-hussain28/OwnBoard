import { ProjectContextViewPage } from "./view";

export default async function ProjectContextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectContextViewPage id={id} />;
}
