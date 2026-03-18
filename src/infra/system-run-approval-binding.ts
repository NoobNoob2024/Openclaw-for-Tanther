import crypto from "node:crypto";
import type {
  SystemRunApprovalBinding,
  SystemRunApprovalFileOperand,
  SystemRunApprovalPlan,
} from "./exec-approvals.js";
import { normalizeEnvVarKey } from "./host-env-security.js";
import { normalizeNonEmptyString, normalizeStringArray } from "./system-run-normalize.js";

type NormalizedSystemRunEnvEntry = [key: string, value: string];

function normalizeSystemRunApprovalFileOperand(
  value: unknown,
): SystemRunApprovalFileOperand | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const argvIndex =
    typeof candidate.argvIndex === "number" &&
    Number.isInteger(candidate.argvIndex) &&
    candidate.argvIndex >= 0
      ? candidate.argvIndex
      : null;
  const filePath = normalizeNonEmptyString(candidate.path);
  const sha256 = normalizeNonEmptyString(candidate.sha256);
  if (argvIndex === null || !filePath || !sha256) {
    return null;
  }
  return {
    argvIndex,
    path: filePath,
    sha256,
  };
}

export function normalizeSystemRunApprovalPlan(value: unknown): SystemRunApprovalPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const argv = normalizeStringArray(candidate.argv);
  if (argv.length === 0) {
    return null;
  }
  const mutableFileOperand = normalizeSystemRunApprovalFileOperand(candidate.mutableFileOperand);
  if (candidate.mutableFileOperand !== undefined && mutableFileOperand === null) {
    return null;
  }
  const commandText =
    normalizeNonEmptyString(candidate.commandText) ?? normalizeNonEmptyString(candidate.rawCommand);
  if (!commandText) {
    return null;
  }
  return {
    argv,
    cwd: normalizeNonEmptyString(candidate.cwd),
    commandText,
    commandPreview: normalizeNonEmptyString(candidate.commandPreview),
    agentId: normalizeNonEmptyString(candidate.agentId),
    sessionKey: normalizeNonEmptyString(candidate.sessionKey),
    mutableFileOperand: mutableFileOperand ?? undefined,
  };
}

function normalizeSystemRunEnvEntries(env: unknown): NormalizedSystemRunEnvEntry[] {
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    return [];
  }
  const entries: NormalizedSystemRunEnvEntry[] = [];
  for (const [rawKey, rawValue] of Object.entries(env as Record<string, unknown>)) {
    if (typeof rawValue !== "string") {
      continue;
    }
    const key = normalizeEnvVarKey(rawKey, { portable: true });
    if (!key) {
      continue;
    }
    entries.push([key, rawValue]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries;
}

function hashSystemRunEnvEntries(entries: NormalizedSystemRunEnvEntry[]): string | null {
  if (entries.length === 0) {
    return null;
  }
  return crypto.createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

export function buildSystemRunApprovalEnvBinding(env: unknown): {
  envHash: string | null;
  envKeys: string[];
} {
  const entries = normalizeSystemRunEnvEntries(env);
  return {
    envHash: hashSystemRunEnvEntries(entries),
    envKeys: entries.map(([key]) => key),
  };
}

export function buildSystemRunApprovalBinding(params: {
  argv: unknown;
  cwd?: unknown;
  agentId?: unknown;
  sessionKey?: unknown;
  env?: unknown;
}): { binding: SystemRunApprovalBinding; envKeys: string[] } {
  const envBinding = buildSystemRunApprovalEnvBinding(params.env);
  return {
    binding: {
      argv: normalizeStringArray(params.argv),
      cwd: normalizeNonEmptyString(params.cwd),
      agentId: normalizeNonEmptyString(params.agentId),
      sessionKey: normalizeNonEmptyString(params.sessionKey),
      envHash: envBinding.envHash,
    },
    envKeys: envBinding.envKeys,
  };
}
