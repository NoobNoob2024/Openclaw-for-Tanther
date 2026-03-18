import type { ExecApprovalRequestPayload } from "./exec-approvals.js";

export type TantherApprovalDecision = "allow-once" | "allow-always";

export type TantherAuthorityFailure = {
  ok: false;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type TantherApprovalResolution = {
  decision: TantherApprovalDecision;
  currentState: string;
  approvalId?: string;
  approverId?: string | null;
  consumedRunIds?: string[] | undefined;
};

export type TantherPostExecResult = {
  success: boolean;
  timedOut: boolean;
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
  error?: string | null;
};

export type TantherApprovalTransportGrant<TAuthority> = {
  approved: true;
  approvalDecision: TantherApprovalDecision;
  approvalAuthority: TAuthority;
  approvalRequest: ExecApprovalRequestPayload;
};
