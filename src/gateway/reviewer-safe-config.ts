import { buildSafeConfigObject, buildSafeConfigSnapshot } from "../config/config-safe-output.js";
import type { ConfigFileSnapshot } from "../config/config.js";

export function buildReviewerSafeConfigObject<T>(params: {
  includeSecrets: boolean;
  value: T;
  uiHints?: unknown;
}): T {
  return buildSafeConfigObject(params);
}

export function buildReviewerSafeConfigSnapshot(params: {
  snapshot: ConfigFileSnapshot;
  uiHints?: unknown;
}) {
  return buildSafeConfigSnapshot({ snapshot: params.snapshot, uiHints: params.uiHints });
}
