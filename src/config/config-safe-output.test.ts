import { describe, expect, it } from "vitest";
import type { ConfigFileSnapshot } from "./config.js";
import { buildSafeConfigObject, buildSafeConfigSnapshot } from "./config-safe-output.js";

describe("buildSafeConfigObject", () => {
  it("redacts secrets when includeSecrets is false", () => {
    const result = buildSafeConfigObject({
      includeSecrets: false,
      value: {
        gateway: {
          auth: {
            token: "super-secret-token",
          },
        },
      },
    });
    expect((result as { gateway: { auth: { token: string } } }).gateway.auth.token).toBe(
      "__OPENCLAW_REDACTED__",
    );
  });

  it("returns original object when includeSecrets is true", () => {
    const value = { gateway: { auth: { token: "super-secret-token" } } };
    expect(buildSafeConfigObject({ includeSecrets: true, value })).toBe(value);
  });
});

describe("buildSafeConfigSnapshot", () => {
  it("redacts snapshot config when includeSecrets is false", () => {
    const snapshot = {
      path: "/tmp/openclaw.json",
      exists: true,
      valid: true,
      config: { gateway: { auth: { token: "super-secret-token" } } },
      resolved: { gateway: { auth: { token: "super-secret-token" } } },
      parsed: { gateway: { auth: { token: "super-secret-token" } } },
      raw: "{ gateway: { auth: { token: 'super-secret-token' } } }",
      issues: [],
      warnings: [],
      legacyIssues: [],
    } as ConfigFileSnapshot;

    const result = buildSafeConfigSnapshot({ snapshot });
    expect((result.config as { gateway: { auth: { token: string } } }).gateway.auth.token).toBe(
      "__OPENCLAW_REDACTED__",
    );
  });
});
