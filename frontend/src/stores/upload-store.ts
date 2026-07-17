import { create } from "zustand";
import { getApiErrorMessage } from "@/lib/api/errors";
import { ID_PREFIXES, typedId } from "@/lib/ids";
import { docPackService } from "@/services/doc-pack.service";

// Mirror the backend limits (backend/onboard/config/constants.py) so bad batches fail
// instantly in the browser instead of tying up the 512MB API instance.
export const MAX_UPLOAD_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_MB = MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024);
export const MAX_UPLOAD_FILES_PER_BATCH = 10;
const ALLOWED_EXTENSIONS = new Set(["pdf"]);

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

/** First problem with a single file (type, emptiness, size), or null when it is acceptable. */
function fileError(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return `${file.name} is not supported — only PDF files up to ${MAX_UPLOAD_FILE_SIZE_MB} MB.`;
  }
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return `${file.name} is larger than ${MAX_UPLOAD_FILE_SIZE_MB} MB.`;
  }
  return null;
}

export const useUploadStore = create<UploadStore>()((set, get) => ({
  jobs: [],
  minimized: false,

  toggleMinimized: () => set((state) => ({ minimized: !state.minimized })),

  dismissJob: (jobId) => set((state) => ({ jobs: state.jobs.filter((job) => job.id !== jobId) })),

  markJob: (jobId, patch) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
    })),

  validateFiles: (files) => {
    if (files.length === 0) return "Choose at least one file.";
    if (files.length > MAX_UPLOAD_FILES_PER_BATCH)
      return `Upload at most ${MAX_UPLOAD_FILES_PER_BATCH} files at a time.`;
    for (const file of files) {
      const error = fileError(file);
      if (error) return error;
    }
    return null;
  },

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
