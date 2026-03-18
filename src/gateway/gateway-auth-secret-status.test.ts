import { describe, expect, it } from "vitest";
import {
  formatGatewayAuthSecretUnavailableReason,
  resolveGatewayAuthSecretStatus,
} from "./gateway-auth-secret-status.js";

describe("gateway auth secret status", () => {
  it("normalizes fallback source to env", async () => {
    const result = await resolveGatewayAuthSecretStatus({
      config: {} as never,
      env: { OPENCLAW_GATEWAY_TOKEN: "token" } as never,
      value: undefined,
      path: "gateway.auth.token",
      readFallback: () => "token",
    });
    expect(result.source).toBe("env");
    expect(result.value).toBe("token");
  });

  it("formats unresolved reasons through a shared helper", () => {
    expect(
      formatGatewayAuthSecretUnavailableReason({
        path: "gateway.auth.token",
        unresolvedRefReason: "gateway.auth.token SecretRef is unresolved (env:default:MISSING_TOKEN).",
        fallbackMessage: "Missing gateway auth token.",
      }),
    ).toContain("gateway.auth.token SecretRef is configured but unresolved");
  });
});
