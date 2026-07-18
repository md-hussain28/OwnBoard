import { ProjectSkillGraphView } from "./view";

export default async function ProjectSkillGraphPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectSkillGraphView id={id} />;
}
