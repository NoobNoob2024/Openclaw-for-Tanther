import type { OpenClawConfig } from "../config/types.js";
import { resolveRequiredConfiguredSecretRefInputString } from "./resolve-configured-secret-input-string.js";

export async function resolveGatewayAuthTokenSecretRefValue(params: {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
}): Promise<string | undefined> {
  return await resolveRequiredConfiguredSecretRefInputString({
    config: params.config,
    env: params.env,
    value: params.config.gateway?.auth?.token,
    path: "gateway.auth.token",
  });
}

export async function resolveGatewayAuthPasswordSecretRefValue(params: {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
}): Promise<string | undefined> {
  return await resolveRequiredConfiguredSecretRefInputString({
    config: params.config,
    env: params.env,
    value: params.config.gateway?.auth?.password,
    path: "gateway.auth.password",
  });
}
