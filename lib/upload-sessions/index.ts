// Token helpers
export { generateUploadToken, hashUploadToken } from "./tokens";

// Session management
export {
  createUploadSession,
  resolveUploadSession,
  resolveUploadSessionByHash,
  submitUploadSession,
  cancelUploadSession,
  getUploadSessionDetail,
  toUploadSessionView,
  type ResolvedUploadSession,
  type UploadSessionView,
} from "./session";

// Upload operations
export {
  signSessionUpload,
  confirmSessionUpload,
  addSessionVariant,
  addDraftSlot,
  renameDraftSlot,
} from "./uploads";

// Attachment (draft → product)
export { attachUploadSlot } from "./attach";

// Re-export input types from validation
export type {
  CreateUploadSessionInput,
  AddVariantInput,
  SignUploadInput,
  ConfirmUploadInput,
} from "@/lib/validation/schemas";
