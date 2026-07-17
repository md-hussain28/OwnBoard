/** Frontend app (console) lives under `/app`. Marketing stays at `/`. */
export const APP_HOME = "/app";

/** Build a console path: `appPath("tracks", id)` → `/app/tracks/:id`. */
export function appPath(...segments: string[]): string {
  const tail = segments
    .filter(Boolean)
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .join("/");
  return tail ? `${APP_HOME}/${tail}` : APP_HOME;
}
