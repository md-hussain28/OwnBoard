import type { ProjectDetail } from "@/schemas";

/**
 * The repo the codebase-intelligence sections (skill graph, experts, ask) act on.
 * Prefers the project's primary linked repo, then the first linked repo, then the
 * legacy single-repo pointer. Returns null when the project has no repo yet.
 */
export function primaryProjectRepoId(project: ProjectDetail): string | null {
  if (project.repos.length > 0) {
    const primary = project.repos.find((r) => r.isPrimary);
    return (primary ?? project.repos[0]).repoId;
  }
  return project.repoId ?? null;
}
