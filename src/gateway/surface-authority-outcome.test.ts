import { describe, expect, it } from "vitest";
import {
  normalizeSurfaceAuthorityStatus,
  resolveSurfaceAuthorityStatusFromError,
} from "./surface-authority-outcome.js";

describe("normalizeSurfaceAuthorityStatus", () => {
  it("maps approval expiry to expired", () => {
    expect(
      normalizeSurfaceAuthorityStatus({
        code: "APPROVAL_EXPIRED",
        message: "approval expired",
      }),
    ).toBe("expired");
  });

  it("maps legacy expiry wording to expired", () => {
    expect(
      normalizeSurfaceAuthorityStatus({
        message: "approval expired or not found",
      }),
    ).toBe("expired");
  });

  it("maps approval-timeout wording to expired", () => {
    expect(
      normalizeSurfaceAuthorityStatus({
        message: "approval-timeout",
      }),
    ).toBe("expired");
  });

  it("maps approval required wording to approval-required", () => {
    expect(
      normalizeSurfaceAuthorityStatus({
        message: "SYSTEM_RUN_DENIED: approval required",
      }),
    ).toBe("approval-required");
  });

  it("maps consumed approvals to blocked", () => {
    expect(
      normalizeSurfaceAuthorityStatus({
        code: "APPROVAL_ALREADY_CONSUMED",
        message: "approval already consumed",
      }),
    ).toBe("blocked");
  });

  it("maps post-exec record failures to recording-failed", () => {
    expect(
      normalizeSurfaceAuthorityStatus({
        code: "UNAVAILABLE",
        message: "tanther post-exec record failed (runId=abc)",
      }),
    ).toBe("recording-failed");
  });

  it("prefers status details from structured errors", () => {
    expect(
      resolveSurfaceAuthorityStatusFromError({
        message: "legacy text should not win",
        details: { status: "expired" },
      }),
    ).toBe("expired");
  });
});
