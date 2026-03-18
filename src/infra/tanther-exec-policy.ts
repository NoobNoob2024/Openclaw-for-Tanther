import { execFileSync } from "node:child_process";
import type { ExecAsk, ExecSecurity } from "./exec-approvals.js";

export type ExecApprovalDecision = "allow-once" | "allow-always" | null;

export type TantherSystemRunPolicyDecision = {
  allowed: boolean;
  eventReason?: "security=deny" | "approval-required" | "allowlist-miss";
  analysisOk: boolean;
  allowlistSatisfied: boolean;
  shellWrapperBlocked: boolean;
  windowsShellWrapperBlocked: boolean;
  requiresAsk: boolean;
  approvalDecision: ExecApprovalDecision;
  approvedByAsk: boolean;
};

function resolveTantherHome(): string {
  const configuredHome = process.env.OPENCLAW_TANTHER_HOME?.trim();
  if (configuredHome) {
    return configuredHome;
  }
  throw new Error("OPENCLAW_TANTHER_HOME is required");
}

export function evaluateTantherSystemRunPolicy(params: {
  security: ExecSecurity;
  ask: ExecAsk;
  analysisOk: boolean;
  allowlistSatisfied: boolean;
  approvalDecision: ExecApprovalDecision;
  approved?: boolean;
  isWindows: boolean;
  cmdInvocation: boolean;
  shellWrapperInvocation: boolean;
}): TantherSystemRunPolicyDecision {
  const tantherHome = resolveTantherHome();
  const stdout = execFileSync("python3", ["-m", "tanther.adapters.openclaw_exec_authority"], {
    input: JSON.stringify({
      action: "policy",
      security: params.security,
      ask: params.ask,
      analysisOk: params.analysisOk,
      allowlistSatisfied: params.allowlistSatisfied,
      approvalDecision: params.approvalDecision,
      approved: params.approved === true,
      isWindows: params.isWindows,
      cmdInvocation: params.cmdInvocation,
      shellWrapperInvocation: params.shellWrapperInvocation,
    }),
    encoding: "utf8",
    cwd: tantherHome,
    env: {
      ...process.env,
      OPENCLAW_TANTHER_HOME: tantherHome,
      PYTHONPATH: tantherHome,
    },
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout) as TantherSystemRunPolicyDecision;
}
