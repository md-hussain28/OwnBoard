import { ProjectDocsView } from "./view";

export default async function ProjectDocsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDocsView id={id} />;
}
