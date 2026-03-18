import { buildExecDeniedError } from "../infra/exec-denied-surface.js";

type ExecApprovalSurfaceStatus =
  | "user-denied"
  | "approval-required"
  | "approval-expired"
  | "security-deny";

export function buildExecApprovalCliError(status: ExecApprovalSurfaceStatus): Error {
  if (status === "user-denied") {
    return buildExecDeniedError({ status: "user-denied" });
  }
  if (status === "approval-expired") {
    return buildExecDeniedError({ status: "approval-expired" });
  }
  if (status === "security-deny") {
    return buildExecDeniedError({ status: "security-deny", host: "node" });
  }
  return buildExecDeniedError({ status: "approval-required", approvalUiAvailable: false });
}
