import type { ErrorShape } from "./types.js";

export const ErrorCodes = {
  NOT_LINKED: "NOT_LINKED",
  NOT_PAIRED: "NOT_PAIRED",
  AGENT_TIMEOUT: "AGENT_TIMEOUT",
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAVAILABLE: "UNAVAILABLE",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  APPROVAL_EXPIRED: "APPROVAL_EXPIRED",
  APPROVAL_ALREADY_CONSUMED: "APPROVAL_ALREADY_CONSUMED",
  APPROVAL_REQUEST_MISMATCH: "APPROVAL_REQUEST_MISMATCH",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export function errorShape(
  code: ErrorCode,
  message: string,
  opts?: { details?: unknown; retryable?: boolean; retryAfterMs?: number },
): ErrorShape {
  return {
    code,
    message,
    ...opts,
  };
}
