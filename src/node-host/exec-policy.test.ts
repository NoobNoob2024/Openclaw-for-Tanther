import { describe, expect, it, vi } from "vitest";
import {
  evaluateSystemRunPolicy,
  formatSystemRunAllowlistMissMessage,
  resolveExecApprovalDecision,
} from "./exec-policy.js";

vi.mock("../infra/tanther-exec-policy.js", () => ({
  evaluateTantherSystemRunPolicy: vi.fn((params: {
    security: "deny" | "allowlist" | "full";
    ask: "off" | "on-miss" | "always";
    analysisOk: boolean;
    allowlistSatisfied: boolean;
    approvalDecision: "allow-once" | "allow-always" | null;
    approved?: boolean;
    isWindows: boolean;
    cmdInvocation: boolean;
    shellWrapperInvocation: boolean;
  }) => {
    const shellWrapperBlocked = params.security === "allowlist" && params.shellWrapperInvocation;
    const windowsShellWrapperBlocked =
      shellWrapperBlocked && params.isWindows && params.cmdInvocation;
    const analysisOk = shellWrapperBlocked ? false : params.analysisOk;
    const allowlistSatisfied = shellWrapperBlocked ? false : params.allowlistSatisfied;
    const approvedByAsk = params.approvalDecision !== null || params.approved === true;
    if (params.security === "deny") {
      return {
        allowed: false,
        eventReason: "security=deny" as const,
        analysisOk,
        allowlistSatisfied,
        shellWrapperBlocked,
        windowsShellWrapperBlocked,
        requiresAsk: false,
        approvalDecision: params.approvalDecision,
        approvedByAsk,
      };
    }
    const requiresAsk =
      params.ask === "always" ||
      (params.ask === "on-miss" &&
        params.security === "allowlist" &&
        (!analysisOk || !allowlistSatisfied));
    if (requiresAsk && !approvedByAsk) {
      return {
        allowed: false,
        eventReason: "approval-required" as const,
        analysisOk,
        allowlistSatisfied,
        shellWrapperBlocked,
        windowsShellWrapperBlocked,
        requiresAsk,
        approvalDecision: params.approvalDecision,
        approvedByAsk,
      };
    }
    if (params.security === "allowlist" && (!analysisOk || !allowlistSatisfied) && !approvedByAsk) {
      return {
        allowed: false,
        eventReason: "allowlist-miss" as const,
        analysisOk,
        allowlistSatisfied,
        shellWrapperBlocked,
        windowsShellWrapperBlocked,
        requiresAsk,
        approvalDecision: params.approvalDecision,
        approvedByAsk,
      };
    }
    return {
      allowed: true,
      analysisOk,
      allowlistSatisfied,
      shellWrapperBlocked,
      windowsShellWrapperBlocked,
      requiresAsk,
      approvalDecision: params.approvalDecision,
      approvedByAsk,
    };
  }),
}));

type EvaluatePolicyParams = Parameters<typeof evaluateSystemRunPolicy>[0];
type EvaluatePolicyDecision = ReturnType<typeof evaluateSystemRunPolicy>;

const buildPolicyParams = (overrides: Partial<EvaluatePolicyParams>): EvaluatePolicyParams => {
  return {
    security: "allowlist",
    ask: "off",
    analysisOk: true,
    allowlistSatisfied: true,
    approvalDecision: null,
    approved: false,
    isWindows: false,
    cmdInvocation: false,
    shellWrapperInvocation: false,
    ...overrides,
  };
};

const expectDeniedDecision = (decision: EvaluatePolicyDecision) => {
  expect(decision.allowed).toBe(false);
  if (decision.allowed) {
    throw new Error("expected denied decision");
  }
  return decision;
};

const expectAllowedDecision = (decision: EvaluatePolicyDecision) => {
  expect(decision.allowed).toBe(true);
  if (!decision.allowed) {
    throw new Error("expected allowed decision");
  }
  return decision;
};

describe("resolveExecApprovalDecision", () => {
  it("accepts known approval decisions", () => {
    expect(resolveExecApprovalDecision("allow-once")).toBe("allow-once");
    expect(resolveExecApprovalDecision("allow-always")).toBe("allow-always");
  });

  it("normalizes unknown approval decisions to null", () => {
    expect(resolveExecApprovalDecision("deny")).toBeNull();
    expect(resolveExecApprovalDecision(undefined)).toBeNull();
  });
});

describe("formatSystemRunAllowlistMissMessage", () => {
  it("returns legacy allowlist miss message by default", () => {
    expect(formatSystemRunAllowlistMissMessage()).toBe("SYSTEM_RUN_DENIED: allowlist miss");
  });

  it("adds shell-wrapper guidance when wrappers are blocked", () => {
    expect(
      formatSystemRunAllowlistMissMessage({
        shellWrapperBlocked: true,
      }),
    ).toContain("shell wrappers like sh/bash/zsh -c require approval");
  });

  it("adds Windows shell-wrapper guidance when blocked by cmd.exe policy", () => {
    expect(
      formatSystemRunAllowlistMissMessage({
        shellWrapperBlocked: true,
        windowsShellWrapperBlocked: true,
      }),
    ).toContain("Windows shell wrappers like cmd.exe /c require approval");
  });
});

describe("evaluateSystemRunPolicy", () => {
  it("denies when security mode is deny", () => {
    const denied = expectDeniedDecision(
      evaluateSystemRunPolicy(buildPolicyParams({ security: "deny" })),
    );
    expect(denied.eventReason).toBe("security=deny");
    expect(denied.errorMessage).toBe("SYSTEM_RUN_DISABLED: security=deny");
  });

  it("requires approval when ask policy requires it", () => {
    const denied = expectDeniedDecision(
      evaluateSystemRunPolicy(buildPolicyParams({ ask: "always" })),
    );
    expect(denied.eventReason).toBe("approval-required");
    expect(denied.requiresAsk).toBe(true);
  });

  it("allows allowlist miss when explicit approval is provided", () => {
    const allowed = expectAllowedDecision(
      evaluateSystemRunPolicy(
        buildPolicyParams({
          ask: "on-miss",
          analysisOk: false,
          allowlistSatisfied: false,
          approvalDecision: "allow-once",
        }),
      ),
    );
    expect(allowed.approvedByAsk).toBe(true);
  });

  it("denies allowlist misses without approval", () => {
    const denied = expectDeniedDecision(
      evaluateSystemRunPolicy(buildPolicyParams({ analysisOk: false, allowlistSatisfied: false })),
    );
    expect(denied.eventReason).toBe("allowlist-miss");
    expect(denied.errorMessage).toBe("SYSTEM_RUN_DENIED: allowlist miss");
  });

  it("treats shell wrappers as allowlist misses", () => {
    const denied = expectDeniedDecision(
      evaluateSystemRunPolicy(buildPolicyParams({ shellWrapperInvocation: true })),
    );
    expect(denied.shellWrapperBlocked).toBe(true);
    expect(denied.errorMessage).toContain("shell wrappers like sh/bash/zsh -c");
  });

  it("keeps Windows-specific guidance for cmd.exe wrappers", () => {
    const denied = expectDeniedDecision(
      evaluateSystemRunPolicy(
        buildPolicyParams({ isWindows: true, cmdInvocation: true, shellWrapperInvocation: true }),
      ),
    );
    expect(denied.shellWrapperBlocked).toBe(true);
    expect(denied.windowsShellWrapperBlocked).toBe(true);
    expect(denied.errorMessage).toContain("Windows shell wrappers like cmd.exe /c");
  });

  it("allows execution when policy checks pass", () => {
    const allowed = expectAllowedDecision(
      evaluateSystemRunPolicy(buildPolicyParams({ ask: "on-miss" })),
    );
    expect(allowed.requiresAsk).toBe(false);
    expect(allowed.analysisOk).toBe(true);
    expect(allowed.allowlistSatisfied).toBe(true);
  });
});
