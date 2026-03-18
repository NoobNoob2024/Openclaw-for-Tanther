import type { OpenClawConfig } from "../config/config.js";
import { resolveSecretRefValues } from "./resolve.js";

export async function resolveRuntimeSecretBoundaryRefs(params: {
  refs: Parameters<typeof resolveSecretRefValues>[0];
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
  cache?: Parameters<typeof resolveSecretRefValues>[1]["cache"];
}) {
  return await resolveSecretRefValues(params.refs, {
    config: params.config,
    env: params.env,
    cache: params.cache,
  });
}
