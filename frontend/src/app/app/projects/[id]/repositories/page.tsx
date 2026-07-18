import { ProjectRepositoriesView } from "./view";

export default async function ProjectRepositoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectRepositoriesView id={id} />;
}
