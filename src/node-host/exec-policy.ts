import type { ExecAsk, ExecSecurity } from "../infra/exec-approvals.js";
import {
  evaluateTantherSystemRunPolicy,
  type ExecApprovalDecision,
  type TantherSystemRunPolicyDecision,
} from "../infra/tanther-exec-policy.js";

export type SystemRunPolicyDecision = {
  analysisOk: boolean;
  allowlistSatisfied: boolean;
  shellWrapperBlocked: boolean;
  windowsShellWrapperBlocked: boolean;
  requiresAsk: boolean;
  approvalDecision: ExecApprovalDecision;
  approvedByAsk: boolean;
} & (
  | {
      allowed: true;
    }
  | {
      allowed: false;
      eventReason: "security=deny" | "approval-required" | "allowlist-miss";
      errorMessage: string;
    }
);

export function resolveExecApprovalDecision(value: unknown): ExecApprovalDecision {
  if (value === "allow-once" || value === "allow-always") {
    return value;
  }
  return null;
}

export function formatSystemRunAllowlistMissMessage(params?: {
  shellWrapperBlocked?: boolean;
  windowsShellWrapperBlocked?: boolean;
}): string {
  if (params?.windowsShellWrapperBlocked) {
    return (
      "SYSTEM_RUN_DENIED: allowlist miss " +
      "(Windows shell wrappers like cmd.exe /c require approval; " +
      "approve once/always or run with --ask on-miss|always)"
    );
  }
  if (params?.shellWrapperBlocked) {
    return (
      "SYSTEM_RUN_DENIED: allowlist miss " +
      "(shell wrappers like sh/bash/zsh -c require approval; " +
      "approve once/always or run with --ask on-miss|always)"
    );
  }
  return "SYSTEM_RUN_DENIED: allowlist miss";
}

function materializeSystemRunPolicyDecision(
  decision: TantherSystemRunPolicyDecision,
): SystemRunPolicyDecision {
  if (decision.allowed) {
    return {
      allowed: true,
      analysisOk: decision.analysisOk,
      allowlistSatisfied: decision.allowlistSatisfied,
      shellWrapperBlocked: decision.shellWrapperBlocked,
      windowsShellWrapperBlocked: decision.windowsShellWrapperBlocked,
      requiresAsk: decision.requiresAsk,
      approvalDecision: decision.approvalDecision,
      approvedByAsk: decision.approvedByAsk,
    };
  }
  const eventReason = decision.eventReason ?? "approval-required";
  const errorMessage =
    eventReason === "security=deny"
      ? "SYSTEM_RUN_DISABLED: security=deny"
      : eventReason === "allowlist-miss"
        ? formatSystemRunAllowlistMissMessage({
            shellWrapperBlocked: decision.shellWrapperBlocked,
            windowsShellWrapperBlocked: decision.windowsShellWrapperBlocked,
          })
        : "SYSTEM_RUN_DENIED: approval required";
  return {
    allowed: false,
    eventReason,
    errorMessage,
    analysisOk: decision.analysisOk,
    allowlistSatisfied: decision.allowlistSatisfied,
    shellWrapperBlocked: decision.shellWrapperBlocked,
    windowsShellWrapperBlocked: decision.windowsShellWrapperBlocked,
    requiresAsk: decision.requiresAsk,
    approvalDecision: decision.approvalDecision,
    approvedByAsk: decision.approvedByAsk,
  };
}

export function evaluateSystemRunPolicy(params: {
  security: ExecSecurity;
  ask: ExecAsk;
  analysisOk: boolean;
  allowlistSatisfied: boolean;
  approvalDecision: ExecApprovalDecision;
  approved?: boolean;
  isWindows: boolean;
  cmdInvocation: boolean;
  shellWrapperInvocation: boolean;
}): SystemRunPolicyDecision {
  return materializeSystemRunPolicyDecision(evaluateTantherSystemRunPolicy(params));
}
