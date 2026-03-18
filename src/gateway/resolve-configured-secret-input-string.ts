import type { OpenClawConfig } from "../config/types.js";
import { resolveSecretInputRef } from "../config/types.secrets.js";
import { secretRefKey } from "../secrets/ref-contract.js";
import {
  buildSecretBoundaryFailure,
  buildSecretBoundarySuccess,
  type SecretBoundaryOutcome,
} from "../secrets/secret-boundary-outcome.js";
import { resolveSecretRefValues } from "../secrets/resolve.js";

export type SecretInputUnresolvedReasonStyle = "generic" | "detailed"; // pragma: allowlist secret
export type ConfiguredSecretInputSource =
  | "config"
  | "secretRef" // pragma: allowlist secret
  | "fallback";

function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildUnresolvedReason(params: {
  path: string;
  style: SecretInputUnresolvedReasonStyle;
  kind: "unresolved" | "non-string" | "empty";
  refLabel: string;
}): string {
  if (params.style === "generic") {
    return `${params.path} SecretRef is unresolved (${params.refLabel}).`;
  }
  if (params.kind === "non-string") {
    return `${params.path} SecretRef resolved to a non-string value.`;
  }
  if (params.kind === "empty") {
    return `${params.path} SecretRef resolved to an empty value.`;
  }
  return `${params.path} SecretRef is unresolved (${params.refLabel}).`;
}

export async function resolveConfiguredSecretInputString(params: {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
  value: unknown;
  path: string;
  unresolvedReasonStyle?: SecretInputUnresolvedReasonStyle;
}): Promise<{ value?: string; unresolvedRefReason?: string; outcome?: SecretBoundaryOutcome }> {
  const style = params.unresolvedReasonStyle ?? "generic";
  const { ref } = resolveSecretInputRef({
    value: params.value,
    defaults: params.config.secrets?.defaults,
  });
  if (!ref) {
    const value = trimToUndefined(params.value);
    return value
      ? {
          value,
          outcome: buildSecretBoundarySuccess({
            status: "config",
            secretRefConfigured: false,
          }),
        }
      : {};
  }

  const refLabel = `${ref.source}:${ref.provider}:${ref.id}`;
  try {
    const resolved = await resolveSecretRefValues([ref], {
      config: params.config,
      env: params.env,
    });
    const resolvedValue = resolved.get(secretRefKey(ref));
    if (typeof resolvedValue !== "string") {
      const unresolvedRefReason = buildUnresolvedReason({
        path: params.path,
        style,
        kind: "non-string",
        refLabel,
      });
      return {
        unresolvedRefReason,
        outcome: buildSecretBoundaryFailure({
          status: "non-string",
          reason: unresolvedRefReason,
          secretRefConfigured: true,
        }),
      };
    }
    const trimmed = resolvedValue.trim();
    if (trimmed.length === 0) {
      const unresolvedRefReason = buildUnresolvedReason({
        path: params.path,
        style,
        kind: "empty",
        refLabel,
      });
      return {
        unresolvedRefReason,
        outcome: buildSecretBoundaryFailure({
          status: "empty",
          reason: unresolvedRefReason,
          secretRefConfigured: true,
        }),
      };
    }
    return {
      value: trimmed,
      outcome: buildSecretBoundarySuccess({
        status: "secret-ref",
        secretRefConfigured: true,
      }),
    };
  } catch {
    const unresolvedRefReason = buildUnresolvedReason({
      path: params.path,
      style,
      kind: "unresolved",
      refLabel,
    });
    return {
      unresolvedRefReason,
      outcome: buildSecretBoundaryFailure({
        status: "unresolved",
        reason: unresolvedRefReason,
        secretRefConfigured: true,
      }),
    };
  }
}

export async function resolveConfiguredSecretInputWithFallback(params: {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
  value: unknown;
  path: string;
  unresolvedReasonStyle?: SecretInputUnresolvedReasonStyle;
  readFallback?: () => string | undefined;
}): Promise<{
  value?: string;
  source?: ConfiguredSecretInputSource;
  unresolvedRefReason?: string;
  secretRefConfigured: boolean;
}> {
  const { ref } = resolveSecretInputRef({
    value: params.value,
    defaults: params.config.secrets?.defaults,
  });
  const configValue = !ref ? trimToUndefined(params.value) : undefined;
  if (configValue) {
      return {
        value: configValue,
        source: "config",
        secretRefConfigured: false,
        outcome: buildSecretBoundarySuccess({
          status: "config",
          secretRefConfigured: false,
        }),
      };
  }
  if (!ref) {
    const fallback = params.readFallback?.();
    if (fallback) {
      return {
        value: fallback,
        source: "fallback",
        secretRefConfigured: false,
        outcome: buildSecretBoundarySuccess({
          status: "fallback",
          secretRefConfigured: false,
        }),
      };
    }
    return { secretRefConfigured: false };
  }

  const resolved = await resolveConfiguredSecretInputString({
    config: params.config,
    env: params.env,
    value: params.value,
    path: params.path,
    unresolvedReasonStyle: params.unresolvedReasonStyle,
  });
  if (resolved.value) {
    return {
      value: resolved.value,
      source: "secretRef",
      secretRefConfigured: true,
      outcome: resolved.outcome,
    };
  }

  const fallback = params.readFallback?.();
  if (fallback) {
      return {
        value: fallback,
        source: "fallback",
        secretRefConfigured: true,
        outcome: buildSecretBoundarySuccess({
          status: "fallback",
          secretRefConfigured: true,
        }),
      };
  }

  return {
    unresolvedRefReason: resolved.unresolvedRefReason,
    secretRefConfigured: true,
    outcome: resolved.outcome,
  };
}

export async function resolveRequiredConfiguredSecretRefInputString(params: {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
  value: unknown;
  path: string;
  unresolvedReasonStyle?: SecretInputUnresolvedReasonStyle;
}): Promise<string | undefined> {
  const { ref } = resolveSecretInputRef({
    value: params.value,
    defaults: params.config.secrets?.defaults,
  });
  if (!ref) {
    return undefined;
  }

  const resolved = await resolveConfiguredSecretInputString({
    config: params.config,
    env: params.env,
    value: params.value,
    path: params.path,
    unresolvedReasonStyle: params.unresolvedReasonStyle,
  });
  if (resolved.value) {
    return resolved.value;
  }
  throw new Error(resolved.unresolvedRefReason ?? `${params.path} resolved to an empty value.`);
}
