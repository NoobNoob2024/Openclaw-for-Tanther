import { describe, expect, it } from "vitest";
import {
  APPROVE_USAGE_TEXT,
  buildApproveForeignBotText,
  buildExecApprovalResolveFailureText,
  buildExecApprovalSubmittedText,
} from "./operator-approval-surface.js";

describe("operator approval surface", () => {
  it("returns canonical usage and success text", () => {
    expect(APPROVE_USAGE_TEXT).toBe("Usage: /approve <id> allow-once|allow-always|deny");
    expect(buildApproveForeignBotText()).toContain("different Telegram bot");
    expect(
      buildExecApprovalSubmittedText({
        decision: "allow-once",
        id: "abc12345",
      }),
    ).toContain("Exec approval allow-once submitted for abc12345");
  });

  it("normalizes expired and blocked resolve failures", () => {
    expect(buildExecApprovalResolveFailureText(new Error("approval expired or not found"))).toBe(
      "❌ Approval expired or was not found.",
    );
    expect(
      buildExecApprovalResolveFailureText(new Error("approval request mismatch for this command")),
    ).toContain("authoritative state");
  });
});
