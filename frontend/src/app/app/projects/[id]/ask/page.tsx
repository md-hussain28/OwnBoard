import { ProjectAskView } from "@/components/ask";

export default async function ProjectAskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectAskView id={id} />;
}
