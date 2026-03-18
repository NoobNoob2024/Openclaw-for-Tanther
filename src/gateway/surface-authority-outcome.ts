export type SurfaceAuthorityStatus =
  | "success"
  | "invalid-request"
  | "approval-required"
  | "denied"
  | "expired"
  | "blocked"
  | "recording-failed"
  | "unavailable";

export function normalizeSurfaceAuthorityStatus(params: {
  code?: string | null;
  message?: string | null;
}): SurfaceAuthorityStatus {
  const code = params.code ?? "";
  const message = (params.message ?? "").toLowerCase();
  if (code === "INVALID_REQUEST") {
    return "invalid-request";
  }
  if (code === "APPROVAL_REQUIRED") {
    return "approval-required";
  }
  if (code === "APPROVAL_EXPIRED") {
    return "expired";
  }
  if (message.includes("approval required")) {
    return "approval-required";
  }
  if (
    message.includes("approval-timeout") ||
    message.includes("approval expired or not found") ||
    message.includes("approval expired") ||
    message.includes("unknown or expired approval id")
  ) {
    return "expired";
  }
  if (code === "APPROVAL_ALREADY_CONSUMED" || code === "APPROVAL_REQUEST_MISMATCH") {
    return "blocked";
  }
  if (message.includes("approval request mismatch")) {
    return "blocked";
  }
  if (message.includes("record failed")) {
    return "recording-failed";
  }
  if (message.includes("denied")) {
    return "denied";
  }
  return "unavailable";
}

export function resolveSurfaceAuthorityStatusFromError(err: unknown): SurfaceAuthorityStatus {
  if (
    err &&
    typeof err === "object" &&
    "details" in err &&
    err.details &&
    typeof err.details === "object"
  ) {
    const details = err.details as { code?: unknown; status?: unknown };
    if (typeof details.status === "string") {
      return details.status as SurfaceAuthorityStatus;
    }
    return normalizeSurfaceAuthorityStatus({
      code: typeof details.code === "string" ? details.code : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
  }
  return normalizeSurfaceAuthorityStatus({
    message: err instanceof Error ? err.message : String(err),
  });
}
