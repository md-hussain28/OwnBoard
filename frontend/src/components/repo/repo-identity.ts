/**
 * Human-friendly repo identity helpers. A raw clone URL (`https://github.com/org/repo.git`) is
 * noise in a list — everywhere we show a repo we want the short `org/repo` slug instead.
 */

/** `org/repo` from any GitHub URL; falls back to the host-stripped URL for non-GitHub remotes. */
export function repoSlug(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  if (match) return `${match[1]}/${match[2]}`;
  return (
    url
      .replace(/^https?:\/\//, "")
      .replace(/\.git$/i, "")
      .replace(/\/$/, "") || null
  );
}
