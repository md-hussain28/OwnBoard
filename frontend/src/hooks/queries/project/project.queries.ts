import { useQuery } from "@tanstack/react-query";
import { projectService } from "@/services/project.service";

export const projectKeys = {
  all: ["projects"] as const,
  mine: ["projects", "mine"] as const,
  detail: (id: string) => ["projects", id] as const,
  members: (id: string) => ["projects", id, "members"] as const,
  skills: (id: string) => ["projects", id, "skills"] as const,
  docs: (id: string) => ["projects", id, "docs"] as const,
  tracks: (id: string) => ["projects", id, "tracks"] as const,
  functionTypes: (id: string) => ["projects", id, "function-types"] as const,
  modules: (id: string) => ["projects", id, "modules"] as const,
};

/** Admin: every project in the org. */
export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: projectService.list });
}

/** Member: the projects I'm on, with lock/progress state. */
export function useMyProjects() {
  return useQuery({ queryKey: projectKeys.mine, queryFn: projectService.listMine });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectService.get(id),
    enabled: !!id,
  });
}

export function useProjectMembers(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.members(id),
    queryFn: () => projectService.listMembers(id),
    enabled: !!id && enabled,
  });
}

export function useProjectSkills(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.skills(id),
    queryFn: () => projectService.listMemberSkills(id),
    enabled: !!id && enabled,
  });
}

export function useProjectDocs(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.docs(id),
    queryFn: () => projectService.getDocs(id),
    enabled: !!id && enabled,
    // Poll while any document is still being extracted/embedded so status flips to "processed" live.
    refetchInterval: (query) => {
      const docs = query.state.data?.documents ?? [];
      return docs.some((d) => d.status === "uploaded" || d.status === "processing") ? 3000 : false;
    },
  });
}

export function useProjectTracks(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.tracks(id),
    queryFn: () => projectService.listTracks(id),
    enabled: !!id && enabled,
  });
}

export function useProjectFunctionTypes(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.functionTypes(id),
    queryFn: () => projectService.listFunctionTypes(id),
    enabled: !!id && enabled,
  });
}

export function useProjectModules(id: string, enabled = true) {
  return useQuery({
    queryKey: projectKeys.modules(id),
    queryFn: () => projectService.listModules(id),
    enabled: !!id && enabled,
  });
}
