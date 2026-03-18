import { describe, expect, it } from "vitest";
import { buildReviewerSafeConfigObject } from "./reviewer-safe-config.js";

describe("buildReviewerSafeConfigObject", () => {
  it("returns original value when secrets are allowed", () => {
    const value = { gateway: { auth: { token: "plain" } } };
    expect(
      buildReviewerSafeConfigObject({
        includeSecrets: true,
        value,
      }),
    ).toBe(value);
  });

  it("returns a redacted clone when secrets are not allowed", () => {
    const value = { gateway: { auth: { token: "plain" } } };
    const result = buildReviewerSafeConfigObject({
      includeSecrets: false,
      value,
    });
    expect(result).not.toBe(value);
    expect(result).toEqual({ gateway: { auth: { token: "__OPENCLAW_REDACTED__" } } });
  });
});
