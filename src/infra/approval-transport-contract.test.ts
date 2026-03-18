import { describe, expect, it } from "vitest";
import {
  EXEC_APPROVAL_ALLOWED_DECISIONS,
  isExecApprovalTransportDecision,
} from "./approval-transport-contract.js";

describe("approval transport contract", () => {
  it("exports the canonical allowed decisions", () => {
    expect(EXEC_APPROVAL_ALLOWED_DECISIONS).toEqual([
      "allow-once",
      "allow-always",
      "deny",
    ]);
  });

  it("recognizes canonical transport decisions", () => {
    expect(isExecApprovalTransportDecision("allow-once")).toBe(true);
    expect(isExecApprovalTransportDecision("allow-always")).toBe(true);
    expect(isExecApprovalTransportDecision("deny")).toBe(true);
    expect(isExecApprovalTransportDecision("bad")).toBe(false);
  });
});
