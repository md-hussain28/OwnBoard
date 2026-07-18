import { ID_PREFIXES, typedId } from "@/lib";
import type {
  AddProjectRepoInput,
  CreateProjectInput,
  CreateProjectTrackInput,
  FunctionTypeInput,
  ModuleInput,
  Project,
  ProjectFunctionType,
  ProjectModule,
  ProjectRepo,
  ProjectTrack,
  UpdateProjectInput,
} from "@/schemas";

/**
 * Pure cache transforms shared by the project mutations — optimistic row builders (shown the
 * instant the user acts, reconciled by the next invalidate) and patch appliers (fold an update
 * payload onto a cached entity, leaving absent fields untouched). Kept out of the hook module so
 * it stays focused on wiring, and so these stay unit-testable without React Query.
 */

/** ISO timestamp for optimistic rows — replaced by the server value on the next invalidate. */
export function nowIso() {
  return new Date().toISOString();
}

/** `input.x !== undefined ? input.x : current` — keep the current value when the field is absent. */
export function keep<V>(next: V | undefined, current: V): V {
  return next !== undefined ? next : current;
}

/** Resolve function-type ids to their display names from the cached list (unknown ids dropped). */
export function namesForFunctionTypes(
  ids: string[],
  functionTypes: ProjectFunctionType[] | undefined,
) {
  return ids
    .map((tid) => functionTypes?.find((f) => f.id === tid)?.name)
    .filter((n): n is string => Boolean(n));
}

/** A stand-in project card shown the instant "Create" is clicked; the invalidate reconciles it. */
export function optimisticProject(input: CreateProjectInput): Project {
  const now = nowIso();
  return {
    id: typedId(ID_PREFIXES.draft),
    orgId: "",
    name: input.name,
    description: input.description ?? null,
    status: input.status ?? "active",
    isArchived: false,
    repoId: input.repoId ?? null,
    repoName: null,
    repos: [],
    leadEmployeeId: input.leadEmployeeId ?? null,
    leadName: null,
    techStack: input.techStack ?? [],
    resourceLinks: input.resourceLinks ?? [],
    glossary: input.glossary ?? [],
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    memberCount: 0,
    trackCount: 0,
    moduleCount: 0,
  };
}

/** Fields an update payload touches on a cached project — undefined inputs keep their value. */
export function applyProjectPatch<T extends Project>(project: T, input: UpdateProjectInput): T {
  return {
    ...project,
    name: input.name ?? project.name,
    description: input.description !== undefined ? input.description : project.description,
    status: input.status ?? project.status,
    isArchived: input.isArchived ?? project.isArchived,
    repoId: input.repoId !== undefined ? input.repoId : project.repoId,
    techStack: input.techStack ?? project.techStack,
    resourceLinks: input.resourceLinks ?? project.resourceLinks,
    glossary: input.glossary ?? project.glossary,
  };
}

/** Placeholder track appended the moment it's created, before the server assigns its real id. */
export function optimisticTrack(input: CreateProjectTrackInput, order: number): ProjectTrack {
  return {
    id: typedId(ID_PREFIXES.draft),
    name: input.name,
    description: input.description ?? null,
    status: "draft",
    sequenceOrder: input.sequenceOrder ?? order,
    estimatedMinutes: input.estimatedMinutes ?? null,
    dueOffsetDays: input.dueOffsetDays ?? null,
    assignScope: "all_members",
    assignedCount: 0,
    assigneeIds: [],
    assignmentId: null,
    myStatus: "not_assigned",
    passed: false,
  };
}

/** Placeholder repo row shown while the link/attach request is in flight. */
export function optimisticRepo(input: AddProjectRepoInput): ProjectRepo {
  return {
    repoId: input.repoId ?? typedId(ID_PREFIXES.draft),
    name: input.name ?? null,
    url: input.url ?? null,
    isPrimary: input.isPrimary ?? false,
    assignees: [],
  };
}

/** Placeholder function-type chip shown instantly; counts fill in on reconcile. */
export function optimisticFunctionType(
  input: FunctionTypeInput,
  order: number,
): ProjectFunctionType {
  return {
    id: typedId(ID_PREFIXES.draft),
    name: input.name,
    sortOrder: input.sortOrder ?? order,
    memberCount: 0,
    moduleCount: 0,
  };
}

/** Placeholder module row shown immediately; the invalidate swaps in the persisted one. */
export function optimisticModule(
  input: ModuleInput,
  order: number,
  functionTypes: ProjectFunctionType[] | undefined,
): ProjectModule {
  return {
    id: typedId(ID_PREFIXES.draft),
    name: input.name,
    description: input.description ?? null,
    content: input.content ?? null,
    resourceLinks: input.resourceLinks ?? [],
    status: input.status ?? "draft",
    sequenceOrder: input.sequenceOrder ?? order,
    estimatedMinutes: input.estimatedMinutes ?? null,
    functionTypeIds: input.functionTypeIds ?? [],
    functionTypeNames: namesForFunctionTypes(input.functionTypeIds ?? [], functionTypes),
    assignedCount: 0,
    myStatus: "not_assigned",
    myCompleted: false,
  };
}

/** Fold a partial module update onto a cached module, leaving absent fields untouched. */
export function applyModulePatch(
  m: ProjectModule,
  input: Partial<ModuleInput>,
  functionTypes: ProjectFunctionType[] | undefined,
): ProjectModule {
  return {
    ...m,
    name: input.name ?? m.name,
    description: keep(input.description, m.description),
    content: keep(input.content, m.content),
    resourceLinks: input.resourceLinks ?? m.resourceLinks,
    sequenceOrder: input.sequenceOrder ?? m.sequenceOrder,
    estimatedMinutes: keep(input.estimatedMinutes, m.estimatedMinutes),
    status: input.status ?? m.status,
    functionTypeIds: input.functionTypeIds ?? m.functionTypeIds,
    functionTypeNames: input.functionTypeIds
      ? namesForFunctionTypes(input.functionTypeIds, functionTypes)
      : m.functionTypeNames,
  };
}
