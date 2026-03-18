import type { OpenClawConfig } from "../config/config.js";
export { shouldRequireGatewayTokenForInstall } from "../gateway/auth-install-policy.js";
import { readGatewayTokenEnv } from "../gateway/credentials.js";
import {
  formatGatewayAuthSecretUnavailableReason,
  resolveGatewayAuthSecretStatus,
} from "../gateway/gateway-auth-secret-status.js";

export async function resolveGatewayAuthTokenForService(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv,
): Promise<{ token?: string; unavailableReason?: string }> {
  const resolved = await resolveGatewayAuthSecretStatus({
    config: cfg,
    env,
    value: cfg.gateway?.auth?.token,
    path: "gateway.auth.token",
    unresolvedReasonStyle: "detailed",
    readFallback: () => readGatewayTokenEnv(env),
  });
  if (resolved.value) {
    return { token: resolved.value };
  }
  if (!resolved.secretRefConfigured) {
    return {};
  }
  return {
    unavailableReason: formatGatewayAuthSecretUnavailableReason({
      path: "gateway.auth.token",
      unresolvedRefReason: resolved.unresolvedRefReason,
      fallbackMessage: "Missing gateway auth token.",
    }),
  };
}
