import { DEFAULT_AGENT_ID } from "../routing/session-key.js";
import { expandHomePrefix } from "./home-dir.js";
import {
  ensureExecApprovals,
  normalizeExecApprovals,
  resolveExecApprovalsPath,
  resolveExecApprovalsSocketPath,
  type ExecApprovalsDefaults,
  type ExecApprovalsFile,
  type ExecApprovalsResolved,
  type ExecAsk,
  type ExecSecurity,
} from "./exec-approvals.js";

const DEFAULT_SECURITY: ExecSecurity = "deny";
const DEFAULT_ASK: ExecAsk = "on-miss";
const DEFAULT_ASK_FALLBACK: ExecSecurity = "deny";
const DEFAULT_AUTO_ALLOW_SKILLS = false;

function normalizeSecurity(value: ExecSecurity | undefined, fallback: ExecSecurity): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") {
    return value;
  }
  return fallback;
}

function normalizeAsk(value: ExecAsk | undefined, fallback: ExecAsk): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") {
    return value;
  }
  return fallback;
}

export type ExecApprovalsDefaultOverrides = {
  security?: ExecSecurity;
  ask?: ExecAsk;
  askFallback?: ExecSecurity;
  autoAllowSkills?: boolean;
};

export function resolveExecApprovals(
  agentId?: string,
  overrides?: ExecApprovalsDefaultOverrides,
): ExecApprovalsResolved {
  const file = ensureExecApprovals();
  return resolveExecApprovalsFromFile({
    file,
    agentId,
    overrides,
    path: resolveExecApprovalsPath(),
    socketPath: expandHomePrefix(file.socket?.path ?? resolveExecApprovalsSocketPath()),
    token: file.socket?.token ?? "",
  });
}

export function resolveExecApprovalsFromFile(params: {
  file: ExecApprovalsFile;
  agentId?: string;
  overrides?: ExecApprovalsDefaultOverrides;
  path?: string;
  socketPath?: string;
  token?: string;
}): ExecApprovalsResolved {
  const file = normalizeExecApprovals(params.file);
  const defaults = file.defaults ?? {};
  const agentKey = params.agentId ?? DEFAULT_AGENT_ID;
  const agent = file.agents?.[agentKey] ?? {};
  const wildcard = file.agents?.["*"] ?? {};
  const fallbackSecurity = params.overrides?.security ?? DEFAULT_SECURITY;
  const fallbackAsk = params.overrides?.ask ?? DEFAULT_ASK;
  const fallbackAskFallback = params.overrides?.askFallback ?? DEFAULT_ASK_FALLBACK;
  const fallbackAutoAllowSkills = params.overrides?.autoAllowSkills ?? DEFAULT_AUTO_ALLOW_SKILLS;
  const resolvedDefaults: Required<ExecApprovalsDefaults> = {
    security: normalizeSecurity(defaults.security, fallbackSecurity),
    ask: normalizeAsk(defaults.ask, fallbackAsk),
    askFallback: normalizeSecurity(
      defaults.askFallback ?? fallbackAskFallback,
      fallbackAskFallback,
    ),
    autoAllowSkills: Boolean(defaults.autoAllowSkills ?? fallbackAutoAllowSkills),
  };
  const resolvedAgent: Required<ExecApprovalsDefaults> = {
    security: normalizeSecurity(
      agent.security ?? wildcard.security ?? resolvedDefaults.security,
      resolvedDefaults.security,
    ),
    ask: normalizeAsk(agent.ask ?? wildcard.ask ?? resolvedDefaults.ask, resolvedDefaults.ask),
    askFallback: normalizeSecurity(
      agent.askFallback ?? wildcard.askFallback ?? resolvedDefaults.askFallback,
      resolvedDefaults.askFallback,
    ),
    autoAllowSkills: Boolean(
      agent.autoAllowSkills ?? wildcard.autoAllowSkills ?? resolvedDefaults.autoAllowSkills,
    ),
  };
  const allowlist = [
    ...(Array.isArray(wildcard.allowlist) ? wildcard.allowlist : []),
    ...(Array.isArray(agent.allowlist) ? agent.allowlist : []),
  ];
  return {
    path: params.path ?? resolveExecApprovalsPath(),
    socketPath: expandHomePrefix(
      params.socketPath ?? file.socket?.path ?? resolveExecApprovalsSocketPath(),
    ),
    token: params.token ?? file.socket?.token ?? "",
    defaults: resolvedDefaults,
    agent: resolvedAgent,
    allowlist,
    file,
  };
}

export function requiresExecApproval(params: {
  ask: ExecAsk;
  security: ExecSecurity;
  analysisOk: boolean;
  allowlistSatisfied: boolean;
}): boolean {
  return (
    params.ask === "always" ||
    (params.ask === "on-miss" &&
      params.security === "allowlist" &&
      (!params.analysisOk || !params.allowlistSatisfied))
  );
}
