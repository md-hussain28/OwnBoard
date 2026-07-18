import { create } from "zustand";
import { ID_PREFIXES, typedId, validateFiles as validateUploadFiles } from "@/lib";
import { getApiErrorMessage } from "@/lib/api";
import { docPackService } from "@/services";

// Upload limits + validation live in @/lib/upload (shared with the project-docs upload flow).
// Re-exported here so existing importers of the store keep working.
export {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILE_SIZE_MB,
  MAX_UPLOAD_FILES_PER_BATCH,
} from "@/lib";

export type UploadPhase = "uploading" | "processing" | "complete" | "failed";

export type UploadJob = {
  id: string;
  packId: string;
  packName: string;
  fileNames: string[];
  /** 0–100 transfer progress while `phase === "uploading"`. */
  progress: number;
  phase: UploadPhase;
  error: string | null;
  /** Ids of the created documents, known once the upload POST resolves. */
  documentIds: string[];
};

type StartUploadInput = {
  packId: string;
  packName: string;
  files: File[];
  /** Fired when the POST resolves and documents exist on the pack (invalidate queries here). */
  onUploaded?: () => void;
};

type UploadStore = {
  jobs: UploadJob[];
  minimized: boolean;
  toggleMinimized: () => void;
  dismissJob: (jobId: string) => void;
  /** Client-side pre-flight check; returns an error message or null when the batch is acceptable. */
  validateFiles: (files: File[]) => string | null;
  /** Kicks off a background upload and returns the job id. Never throws — failures land on the job. */
  startUpload: (input: StartUploadInput) => string;
  markJob: (jobId: string, patch: Partial<UploadJob>) => void;
};

export const useUploadStore = create<UploadStore>()((set, get) => ({
  jobs: [],
  minimized: false,

  toggleMinimized: () => set((state) => ({ minimized: !state.minimized })),

  dismissJob: (jobId) => set((state) => ({ jobs: state.jobs.filter((job) => job.id !== jobId) })),

  markJob: (jobId, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
    })),

  validateFiles: (files) => validateUploadFiles(files),

  startUpload: ({ packId, packName, files, onUploaded }) => {
    const jobId = typedId(ID_PREFIXES.uploadJob);
    set((state) => ({
      minimized: false,
      jobs: [
        ...state.jobs,
        {
          id: jobId,
          packId,
          packName,
          fileNames: files.map((f) => f.name),
          progress: 0,
          phase: "uploading",
          error: null,
          documentIds: [],
        },
      ],
    }));

    void docPackService
      .uploadDocuments(packId, files, {
        onUploadProgress: (percent) => get().markJob(jobId, { progress: percent }),
      })
      .then((documents) => {
        get().markJob(jobId, {
          phase: "processing",
          progress: 100,
          documentIds: documents.map((d) => d.id),
        });
        onUploaded?.();
      })
      .catch((error) => {
        get().markJob(jobId, {
          phase: "failed",
          error: getApiErrorMessage(error, "Upload failed."),
        });
      });

    return jobId;
  },
}));
