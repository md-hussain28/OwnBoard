import { DocPackDetailView } from "./view";

export default async function DocPackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocPackDetailView id={id} />;
}
