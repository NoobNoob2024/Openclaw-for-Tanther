import { normalizeSurfaceAuthorityStatus } from "../gateway/surface-authority-outcome.js";
import { buildExecDeniedError } from "../infra/exec-denied-surface.js";

export type ApprovalSurfaceStatus =
  | "approved"
  | "user-denied"
  | "approval-required"
  | "approval-expired"
  | "invalid-decision";

export function isApprovalExpiredSurfaceError(message: string): boolean {
  return normalizeSurfaceAuthorityStatus({ message }) === "expired";
}

export function isApprovalRequiredSurfaceError(message: string): boolean {
  return normalizeSurfaceAuthorityStatus({ message }) === "approval-required";
}

export function resolveApprovalSurfaceStatus(decision: unknown): ApprovalSurfaceStatus {
  if (decision === "allow-once" || decision === "allow-always") {
    return "approved";
  }
  if (decision === "deny") {
    return "user-denied";
  }
  if (decision === undefined || decision === null) {
    return "approval-expired";
  }
  return "invalid-decision";
}

export function buildApprovalSurfaceError(status: Exclude<ApprovalSurfaceStatus, "approved">): Error {
  if (status === "user-denied") {
    return buildExecDeniedError({ status: "user-denied" });
  }
  if (status === "approval-expired") {
    return buildExecDeniedError({ status: "approval-expired" });
  }
  if (status === "approval-required") {
    return buildExecDeniedError({ status: "approval-required" });
  }
  return buildExecDeniedError({ status: "invalid-approval-decision" });
}
