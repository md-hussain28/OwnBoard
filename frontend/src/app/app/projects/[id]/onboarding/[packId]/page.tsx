import { ProjectOnboardingModuleView } from "./view";

export default async function ProjectOnboardingModulePage({
  params,
}: {
  params: Promise<{ id: string; packId: string }>;
}) {
  const { id, packId } = await params;
  return <ProjectOnboardingModuleView projectId={id} packId={packId} />;
}
