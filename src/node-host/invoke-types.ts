import type { SkillBinTrustEntry, SystemRunApprovalPlan } from "../infra/exec-approvals.js";
import type { ExecApprovalRequestPayload } from "../infra/exec-approvals.js";
import type { TantherExecApprovalAuthorityRecord } from "../infra/tanther-exec-authority.js";
import type { TantherApprovalDecision } from "../infra/tanther-openclaw-contracts.js";

export type SystemRunParams = {
  command: string[];
  rawCommand?: string | null;
  systemRunPlan?: SystemRunApprovalPlan | null;
  cwd?: string | null;
  env?: Record<string, string>;
  timeoutMs?: number | null;
  needsScreenRecording?: boolean | null;
  agentId?: string | null;
  sessionKey?: string | null;
  approved?: boolean | null;
  approvalDecision?: TantherApprovalDecision | null;
  approvalAuthority?: TantherExecApprovalAuthorityRecord | null;
  approvalRequest?: ExecApprovalRequestPayload | null;
  runId?: string | null;
  suppressNotifyOnExit?: boolean | null;
};

export type RunResult = {
  exitCode?: number;
  timedOut: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string | null;
  truncated: boolean;
};

export type ExecEventPayload = {
  sessionKey: string;
  runId: string;
  host: string;
  command?: string;
  exitCode?: number;
  timedOut?: boolean;
  success?: boolean;
  output?: string;
  reason?: string;
  suppressNotifyOnExit?: boolean;
};

export type ExecFinishedResult = {
  stdout?: string;
  stderr?: string;
  error?: string | null;
  exitCode?: number | null;
  timedOut?: boolean;
  success?: boolean;
};

export type ExecFinishedEventParams = {
  sessionKey: string;
  runId: string;
  commandText: string;
  result: ExecFinishedResult;
  suppressNotifyOnExit?: boolean;
};

export type SkillBinsProvider = {
  current(force?: boolean): Promise<SkillBinTrustEntry[]>;
};
