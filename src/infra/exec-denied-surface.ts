export type ExecDeniedSurfaceStatus =
  | "user-denied"
  | "approval-required"
  | "approval-expired"
  | "invalid-approval-decision"
  | "allowlist-miss"
  | "security-deny"
  | "allowlist-plan-unavailable";

export function buildExecDeniedError(params: {
  status: ExecDeniedSurfaceStatus;
  host?: "gateway" | "node";
  reason?: string;
  approvalUiAvailable?: boolean;
}): Error {
  if (params.status === "user-denied") {
    return new Error("exec denied: user denied");
  }
  if (params.status === "approval-required") {
    return new Error(
      params.approvalUiAvailable === false
        ? "exec denied: approval required (approval UI not available)"
        : "exec denied: approval required",
    );
  }
  if (params.status === "approval-expired") {
    return new Error("exec denied: approval timed out");
  }
  if (params.status === "invalid-approval-decision") {
    return new Error("exec denied: invalid approval decision");
  }
  if (params.status === "allowlist-miss") {
    return new Error("exec denied: allowlist miss");
  }
  if (params.status === "security-deny") {
    return new Error(`exec denied: host=${params.host ?? "node"} security=deny`);
  }
  return new Error(
    `exec denied: allowlist execution plan unavailable (${params.reason ?? "unknown"})`,
  );
}
