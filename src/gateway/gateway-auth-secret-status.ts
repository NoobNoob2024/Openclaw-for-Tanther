import type { OpenClawConfig } from "../config/config.js";
import {
  resolveConfiguredSecretInputString,
  resolveConfiguredSecretInputWithFallback,
} from "./resolve-configured-secret-input-string.js";

export type GatewayAuthSecretSource = "config" | "env" | "secretRef";

export type GatewayAuthSecretStatus = {
  value?: string;
  source?: GatewayAuthSecretSource;
  secretRefConfigured: boolean;
  unresolvedRefReason?: string;
};

function normalizeGatewayAuthSecretSource(
  source: "config" | "secretRef" | "fallback" | undefined,
): GatewayAuthSecretSource | undefined {
  if (!source) {
    return undefined;
  }
  return source === "fallback" ? "env" : source;
}

export async function resolveGatewayAuthSecretStatus(params: {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
  value: unknown;
  path: string;
  unresolvedReasonStyle?: "generic" | "detailed";
  readFallback?: () => string | undefined;
}): Promise<GatewayAuthSecretStatus> {
  if (params.readFallback) {
    const resolved = await resolveConfiguredSecretInputWithFallback({
      config: params.config,
      env: params.env,
      value: params.value,
      path: params.path,
      unresolvedReasonStyle: params.unresolvedReasonStyle,
      readFallback: params.readFallback,
    });
    return {
      value: resolved.value,
      source: normalizeGatewayAuthSecretSource(resolved.source),
      secretRefConfigured: resolved.secretRefConfigured,
      unresolvedRefReason: resolved.unresolvedRefReason,
    };
  }

  const resolved = await resolveConfiguredSecretInputString({
    config: params.config,
    env: params.env,
    value: params.value,
    path: params.path,
    unresolvedReasonStyle: params.unresolvedReasonStyle,
  });
  return {
    value: resolved.value,
    source: normalizeGatewayAuthSecretSource(resolved.source),
    secretRefConfigured: resolved.secretRefConfigured,
    unresolvedRefReason: resolved.unresolvedRefReason,
  };
}

export function formatGatewayAuthSecretUnavailableReason(params: {
  path: string;
  unresolvedRefReason?: string;
  fallbackMessage: string;
}): string {
  if (!params.unresolvedRefReason) {
    return params.fallbackMessage;
  }
  if (params.unresolvedRefReason.includes("resolved to an empty value")) {
    return params.unresolvedRefReason;
  }
  return `${params.path} SecretRef is configured but unresolved (${params.unresolvedRefReason}).`;
}
