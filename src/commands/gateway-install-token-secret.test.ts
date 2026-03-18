import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveSecretRefValuesMock = vi.hoisted(() => vi.fn());
const secretRefKeyMock = vi.hoisted(() => vi.fn(() => "env:default:OPENCLAW_GATEWAY_TOKEN"));

vi.mock("../secrets/ref-contract.js", () => ({
  secretRefKey: secretRefKeyMock,
}));

vi.mock("../secrets/resolve.js", () => ({
  resolveSecretRefValues: resolveSecretRefValuesMock,
}));

const { resolveGatewayInstallTokenSecretBoundary } = await import(
  "./gateway-install-token-secret.js"
);

describe("resolveGatewayInstallTokenSecretBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns available=true with warning for resolvable refs", async () => {
    resolveSecretRefValuesMock.mockResolvedValue(
      new Map([["env:default:OPENCLAW_GATEWAY_TOKEN", "resolved-token"]]),
    );

    await expect(
      resolveGatewayInstallTokenSecretBoundary({
        config: {} as never,
        env: {} as never,
        tokenRef: { source: "env", provider: "default", id: "OPENCLAW_GATEWAY_TOKEN" },
      }),
    ).resolves.toEqual({
      available: true,
      warning: expect.stringContaining("SecretRef-managed"),
    });
  });

  it("fails closed for empty or non-string resolved values", async () => {
    resolveSecretRefValuesMock.mockResolvedValue(new Map());

    const result = await resolveGatewayInstallTokenSecretBoundary({
      config: {} as never,
      env: {} as never,
      tokenRef: { source: "env", provider: "default", id: "OPENCLAW_GATEWAY_TOKEN" },
    });

    expect(result.available).toBe(false);
    expect(result.unavailableReason).toContain("unresolved");
  });
});
