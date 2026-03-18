import type { OpenClawConfig } from "../config/config.js";
import type { SecretRef } from "../config/types.secrets.js";
import { secretRefKey } from "../secrets/ref-contract.js";
import { resolveSecretRefValues } from "../secrets/resolve.js";

export type GatewayInstallTokenSecretResolution = {
  available: boolean;
  unavailableReason?: string;
  warning?: string;
};

export async function resolveGatewayInstallTokenSecretBoundary(params: {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
  tokenRef: SecretRef;
}): Promise<GatewayInstallTokenSecretResolution> {
  try {
    const resolved = await resolveSecretRefValues([params.tokenRef], {
      config: params.config,
      env: params.env,
    });
    const value = resolved.get(secretRefKey(params.tokenRef));
    if (typeof value !== "string" || value.trim().length === 0) {
      return {
        available: false,
        unavailableReason:
          "gateway.auth.token SecretRef is configured but unresolved (gateway.auth.token resolved to an empty or non-string value.).",
      };
    }
    return {
      available: true,
      warning:
        "gateway.auth.token is SecretRef-managed; install will not persist a resolved token in service environment. Ensure the SecretRef is resolvable in the daemon runtime context.",
    };
  } catch (err) {
    return {
      available: false,
      unavailableReason: `gateway.auth.token SecretRef is configured but unresolved (${String(err)}).`,
    };
  }
}
