import { describe, expect, it } from "vitest";
import { buildExecDeniedError } from "./exec-denied-surface.js";

describe("exec denied surface", () => {
  it("builds canonical approval and policy deny messages", () => {
    expect(buildExecDeniedError({ status: "user-denied" }).message).toBe(
      "exec denied: user denied",
    );
    expect(buildExecDeniedError({ status: "approval-expired" }).message).toBe(
      "exec denied: approval timed out",
    );
    expect(buildExecDeniedError({ status: "allowlist-miss" }).message).toBe(
      "exec denied: allowlist miss",
    );
    expect(buildExecDeniedError({ status: "security-deny", host: "gateway" }).message).toBe(
      "exec denied: host=gateway security=deny",
    );
  });

  it("supports CLI-specific approval-required wording", () => {
    expect(
      buildExecDeniedError({
        status: "approval-required",
        approvalUiAvailable: false,
      }).message,
    ).toBe("exec denied: approval required (approval UI not available)");
  });
});
