// Repo detail nested under its project so the sidebar keeps the project context and the
// breadcrumb reads Projects → Project → Repos → repo. Reuses the same RepoDetailView as the
// top-level /app/repos/[id] route — only the URL (and therefore the surrounding chrome) differs.
import { RepoDetailView } from "../../../../repos/[id]/view";

export default async function ProjectRepoDetailPage({
  params,
}: {
  params: Promise<{ id: string; repoId: string }>;
}) {
  const { id, repoId } = await params;
  return <RepoDetailView id={repoId} projectId={id} />;
}
