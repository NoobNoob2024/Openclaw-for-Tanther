import { describe, expect, it } from "vitest";
import { resolveBaseExecApprovalDecision } from "./bash-tools.exec-host-shared.js";

describe("resolveBaseExecApprovalDecision", () => {
  it("fails closed on timeout even when askFallback=full", () => {
    expect(
      resolveBaseExecApprovalDecision({
        decision: null,
        askFallback: "full",
        obfuscationDetected: false,
      }),
    ).toEqual({
      approvedByAsk: false,
      deniedReason: "approval-timeout",
      timedOut: true,
    });
  });

  it("fails closed on timeout when askFallback=allowlist", () => {
    expect(
      resolveBaseExecApprovalDecision({
        decision: null,
        askFallback: "allowlist",
        obfuscationDetected: false,
      }),
    ).toEqual({
      approvedByAsk: false,
      deniedReason: "approval-timeout",
      timedOut: true,
    });
  });
});
