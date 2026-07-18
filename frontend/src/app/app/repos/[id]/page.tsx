import { RepoDetailView } from "./view";

export default async function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RepoDetailView id={id} />;
}
