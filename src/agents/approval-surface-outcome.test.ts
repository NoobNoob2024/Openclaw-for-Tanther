import { describe, expect, it } from "vitest";
import {
  buildApprovalSurfaceError,
  isApprovalExpiredSurfaceError,
  isApprovalRequiredSurfaceError,
  resolveApprovalSurfaceStatus,
} from "./approval-surface-outcome.js";

describe("isApprovalExpiredSurfaceError", () => {
  it("matches legacy expired wording", () => {
    expect(isApprovalExpiredSurfaceError("approval expired or not found")).toBe(true);
  });

  it("matches direct expired wording", () => {
    expect(isApprovalExpiredSurfaceError("approval expired")).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isApprovalExpiredSurfaceError("approval required")).toBe(false);
  });

  it("matches approval-required system run denial text", () => {
    expect(isApprovalRequiredSurfaceError("SYSTEM_RUN_DENIED: approval required")).toBe(true);
    expect(isApprovalRequiredSurfaceError("SYSTEM_RUN_DENIED: allowlist miss")).toBe(false);
  });
});

describe("approval surface decision helpers", () => {
  it("normalizes approval decisions into a shared status family", () => {
    expect(resolveApprovalSurfaceStatus("allow-once")).toBe("approved");
    expect(resolveApprovalSurfaceStatus("deny")).toBe("user-denied");
    expect(resolveApprovalSurfaceStatus(undefined)).toBe("approval-expired");
    expect(resolveApprovalSurfaceStatus("allow-never")).toBe("invalid-decision");
  });

  it("builds user-facing approval errors from normalized statuses", () => {
    expect(buildApprovalSurfaceError("user-denied").message).toBe("exec denied: user denied");
    expect(buildApprovalSurfaceError("approval-expired").message).toBe(
      "exec denied: approval timed out",
    );
    expect(buildApprovalSurfaceError("invalid-decision").message).toBe(
      "exec denied: invalid approval decision",
    );
  });
});
