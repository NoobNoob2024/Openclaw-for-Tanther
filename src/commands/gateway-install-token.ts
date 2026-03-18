import { formatCliCommand } from "../cli/command-format.js";
import { readConfigFileSnapshot, writeConfigFile, type OpenClawConfig } from "../config/config.js";
import { resolveSecretInputRef } from "../config/types.secrets.js";
import { shouldRequireGatewayTokenForInstall } from "../gateway/auth-install-policy.js";
import { hasAmbiguousGatewayAuthModeConfig } from "../gateway/auth-mode-policy.js";
import { resolveGatewayAuth } from "../gateway/auth.js";
import { readGatewayTokenEnv } from "../gateway/credentials.js";
import { resolveGatewayInstallTokenSecretBoundary } from "./gateway-install-token-secret.js";
import { randomToken } from "./onboard-helpers.js";

type GatewayInstallTokenOptions = {
  config: OpenClawConfig;
  env: NodeJS.ProcessEnv;
  explicitToken?: string;
  autoGenerateWhenMissing?: boolean;
  persistGeneratedToken?: boolean;
};

export type GatewayInstallTokenResolution = {
  token?: string;
  tokenRefConfigured: boolean;
  unavailableReason?: string;
  warnings: string[];
};

function formatAmbiguousGatewayAuthModeReason(): string {
  return [
    "gateway.auth.token and gateway.auth.password are both configured while gateway.auth.mode is unset.",
    `Set ${formatCliCommand("openclaw config set gateway.auth.mode token")} or ${formatCliCommand("openclaw config set gateway.auth.mode password")}.`,
  ].join(" ");
}

export async function resolveGatewayInstallToken(
  options: GatewayInstallTokenOptions,
): Promise<GatewayInstallTokenResolution> {
  const cfg = options.config;
  const warnings: string[] = [];
  const tokenRef = resolveSecretInputRef({
    value: cfg.gateway?.auth?.token,
    defaults: cfg.secrets?.defaults,
  }).ref;
  const tokenRefConfigured = Boolean(tokenRef);
  const configToken =
    tokenRef || typeof cfg.gateway?.auth?.token !== "string"
      ? undefined
      : cfg.gateway.auth.token.trim() || undefined;
  const explicitToken = options.explicitToken?.trim() || undefined;
  const envToken = readGatewayTokenEnv(options.env);

  if (hasAmbiguousGatewayAuthModeConfig(cfg)) {
    return {
      token: undefined,
      tokenRefConfigured,
      unavailableReason: formatAmbiguousGatewayAuthModeReason(),
      warnings,
    };
  }

  const resolvedAuth = resolveGatewayAuth({
    authConfig: cfg.gateway?.auth,
    tailscaleMode: cfg.gateway?.tailscale?.mode ?? "off",
  });
  const needsToken =
    shouldRequireGatewayTokenForInstall(cfg, options.env) && !resolvedAuth.allowTailscale;

  let token: string | undefined = explicitToken || configToken || (tokenRef ? undefined : envToken);
  let unavailableReason: string | undefined;

  if (tokenRef && !token && needsToken) {
    const secretBoundary = await resolveGatewayInstallTokenSecretBoundary({
      config: cfg,
      env: options.env,
      tokenRef,
    });
    if (secretBoundary.warning) {
      warnings.push(secretBoundary.warning);
    }
    if (!secretBoundary.available) {
      unavailableReason = secretBoundary.unavailableReason;
    }
  }

  const allowAutoGenerate = options.autoGenerateWhenMissing ?? false;
  const persistGeneratedToken = options.persistGeneratedToken ?? false;
  if (!token && needsToken && !tokenRef && allowAutoGenerate) {
    token = randomToken();
    warnings.push(
      persistGeneratedToken
        ? "No gateway token found. Auto-generated one and saving to config."
        : "No gateway token found. Auto-generated one for this run without saving to config.",
    );

    if (persistGeneratedToken) {
      // Persist token in config so daemon and CLI share a stable credential source.
      try {
        const snapshot = await readConfigFileSnapshot();
        if (snapshot.exists && !snapshot.valid) {
          warnings.push("Warning: config file exists but is invalid; skipping token persistence.");
        } else {
          const baseConfig = snapshot.exists ? snapshot.config : {};
          const existingTokenRef = resolveSecretInputRef({
            value: baseConfig.gateway?.auth?.token,
            defaults: baseConfig.secrets?.defaults,
          }).ref;
          const baseConfigToken =
            existingTokenRef || typeof baseConfig.gateway?.auth?.token !== "string"
              ? undefined
              : baseConfig.gateway.auth.token.trim() || undefined;
          if (!existingTokenRef && !baseConfigToken) {
            await writeConfigFile({
              ...baseConfig,
              gateway: {
                ...baseConfig.gateway,
                auth: {
                  ...baseConfig.gateway?.auth,
                  mode: baseConfig.gateway?.auth?.mode ?? "token",
                  token,
                },
              },
            });
          } else if (baseConfigToken) {
            token = baseConfigToken;
          } else {
            token = undefined;
            warnings.push(
              "Warning: gateway.auth.token is SecretRef-managed; skipping plaintext token persistence.",
            );
          }
        }
      } catch (err) {
        warnings.push(`Warning: could not persist token to config: ${String(err)}`);
      }
    }
  }

  return {
    token,
    tokenRefConfigured,
    unavailableReason,
    warnings,
  };
}
