import { redactConfigObject, redactConfigSnapshot } from "./redact-snapshot.js";
import type { ConfigFileSnapshot } from "./config.js";

export function buildSafeConfigObject<T>(params: {
  includeSecrets: boolean;
  value: T;
  uiHints?: unknown;
}): T {
  return params.includeSecrets ? params.value : (redactConfigObject(params.value, params.uiHints) as T);
}

export function buildSafeConfigSnapshot(params: {
  includeSecrets?: boolean;
  snapshot: ConfigFileSnapshot;
  uiHints?: unknown;
}): ConfigFileSnapshot {
  if (params.includeSecrets) {
    return params.snapshot;
  }
  return redactConfigSnapshot(params.snapshot, params.uiHints);
}
