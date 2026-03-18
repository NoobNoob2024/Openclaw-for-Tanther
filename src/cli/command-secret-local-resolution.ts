import type { OpenClawConfig } from "../config/config.js";
import { resolveSecretInputRef } from "../config/types.secrets.js";
import type { DiscoveredConfigSecretTarget } from "../secrets/target-registry.js";
import { setPathExistingStrict } from "../secrets/path-utils.js";
import { resolveSecretRefValue } from "../secrets/resolve.js";
import { assertExpectedResolvedSecretValue } from "../secrets/secret-value.js";
import { describeUnknownError } from "../secrets/shared.js";

export async function resolveCommandTargetSecretLocally(params: {
  target: DiscoveredConfigSecretTarget;
  sourceConfig: OpenClawConfig;
  resolvedConfig: OpenClawConfig;
  env: NodeJS.ProcessEnv;
  cache: Map<string, unknown>;
  activePaths: ReadonlySet<string>;
  inactiveRefPaths: ReadonlySet<string>;
  strict: boolean;
  commandName: string;
  localResolutionDiagnostics: string[];
}): Promise<void> {
  const defaults = params.sourceConfig.secrets?.defaults;
  const { ref } = resolveSecretInputRef({
    value: params.target.value,
    refValue: params.target.refValue,
    defaults,
  });
  if (
    !ref ||
    params.inactiveRefPaths.has(params.target.path) ||
    !params.activePaths.has(params.target.path)
  ) {
    return;
  }

  try {
    const resolved = await resolveSecretRefValue(ref, {
      config: params.sourceConfig,
      env: params.env,
      cache: params.cache,
    });
    assertExpectedResolvedSecretValue({
      value: resolved,
      expected: params.target.entry.expectedResolvedValue,
      errorMessage:
        params.target.entry.expectedResolvedValue === "string"
          ? `${params.target.path} resolved to a non-string or empty value.`
          : `${params.target.path} resolved to an unsupported value type.`,
    });
    setPathExistingStrict(params.resolvedConfig, params.target.pathSegments, resolved);
  } catch (error) {
    if (params.strict) {
      throw new Error(`${params.target.path} is unresolved in the active runtime snapshot.`, {
        cause: error,
      });
    }
    params.localResolutionDiagnostics.push(
      `${params.commandName}: failed to resolve ${params.target.path} locally (${describeUnknownError(error)}).`,
    );
  }
}
