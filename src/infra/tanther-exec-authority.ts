import { execFileSync } from "node:child_process";
import type { ExecApprovalDecision, ExecApprovalRequestPayload } from "./exec-approvals.js";
import type {
  TantherApprovalResolution,
  TantherAuthorityFailure,
  TantherPostExecResult,
} from "./tanther-openclaw-contracts.js";

export type TantherExecApprovalStage = {
  stageName: string;
  outcome: string;
  blocking: boolean;
  rationale: string;
};

export type TantherExecApprovalAuthorityRecord = {
  authority: "tanther";
  commandId: string;
  fingerprintId: string;
  snapshotHash: string;
  snapshotVersion: string;
  approvalScope: string;
  requiredApproverClass: string;
  currentState: string;
  guardDecision: string;
  stages: TantherExecApprovalStage[];
  resolution?: (TantherApprovalResolution & { decision: ExecApprovalDecision }) | undefined;
};

export type TantherExecApprovalMatchResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };

export type TantherExecPostExecutionRecord = {
  currentState: string;
  receiptId?: string;
  evidenceIds: string[];
  rollbackStatus?: string;
};

export type TantherExecApprovalConsumeResult =
  | {
      ok: true;
      authority: TantherExecApprovalAuthorityRecord;
    }
  | TantherAuthorityFailure;

type TantherExecApprovalInitResponse = TantherExecApprovalAuthorityRecord;

type TantherExecApprovalResolveResponse = {
  currentState: string;
  approvalId?: string;
  approverId?: string | null;
};

type TantherExecApprovalScriptInput =
  | {
      action: "init";
      approvalId: string;
      request: ExecApprovalRequestPayload;
    }
  | {
      action: "resolve";
      approvalId: string;
      request: ExecApprovalRequestPayload;
      decision: ExecApprovalDecision;
      resolvedBy?: string | null;
    }
  | {
      action: "prepare_run";
      approvalId: string;
      request: ExecApprovalRequestPayload;
    }
  | {
      action: "match";
      approvalId: string;
      request: ExecApprovalRequestPayload;
      requestedByConnId?: string | null;
      requestedByDeviceId?: string | null;
      runtime: {
        nodeId?: string | null;
        connId?: string | null;
        deviceId?: string | null;
        argv: string[];
        cwd?: string | null;
        agentId?: string | null;
        sessionKey?: string | null;
        env?: Record<string, string> | null;
      };
    }
  | {
      action: "record";
      approvalId: string;
      authority: TantherExecApprovalAuthorityRecord;
      request: ExecApprovalRequestPayload;
      runId: string;
      result: TantherPostExecResult;
    }
  | {
      action: "consume";
      approvalId: string;
      authority: TantherExecApprovalAuthorityRecord;
      request: ExecApprovalRequestPayload;
      runId: string;
    };

function resolveTantherHome(): string {
  const configuredHome = process.env.OPENCLAW_TANTHER_HOME?.trim();
  if (configuredHome) {
    return configuredHome;
  }
  throw new Error("OPENCLAW_TANTHER_HOME is required");
}

function runTantherAuthorityScript<T>(input: TantherExecApprovalScriptInput): T {
  const tantherHome = resolveTantherHome();
  const stdout = execFileSync("python3", ["-m", "tanther.adapters.openclaw_exec_authority"], {
    input: JSON.stringify(input),
    encoding: "utf8",
    cwd: tantherHome,
    env: {
      ...process.env,
      OPENCLAW_TANTHER_HOME: tantherHome,
      PYTHONPATH: tantherHome,
    },
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

export function createTantherExecApprovalAuthority(params: {
  approvalId: string;
  request: ExecApprovalRequestPayload;
}): TantherExecApprovalAuthorityRecord {
  return runTantherAuthorityScript<TantherExecApprovalInitResponse>({
    action: "init",
    approvalId: params.approvalId,
    request: params.request,
  });
}

export function createTantherSystemRunAuthority(params: {
  runId: string;
  request: ExecApprovalRequestPayload;
}): TantherExecApprovalAuthorityRecord {
  return runTantherAuthorityScript<TantherExecApprovalInitResponse>({
    action: "prepare_run",
    approvalId: params.runId,
    request: params.request,
  });
}

export function resolveTantherExecApprovalAuthority(params: {
  authority: TantherExecApprovalAuthorityRecord;
  approvalId: string;
  request: ExecApprovalRequestPayload;
  decision: ExecApprovalDecision;
  resolvedBy?: string | null;
}): TantherExecApprovalAuthorityRecord {
  const resolution = runTantherAuthorityScript<TantherExecApprovalResolveResponse>({
    action: "resolve",
    approvalId: params.approvalId,
    request: params.request,
    decision: params.decision,
    resolvedBy: params.resolvedBy ?? null,
  });
  return {
    ...params.authority,
    currentState: resolution.currentState,
    resolution: {
      decision: params.decision,
      currentState: resolution.currentState,
      approvalId: resolution.approvalId,
      approverId: resolution.approverId ?? null,
    },
  };
}

export function matchTantherExecApprovalAuthority(params: {
  approvalId: string;
  request: ExecApprovalRequestPayload;
  requestedByConnId?: string | null;
  requestedByDeviceId?: string | null;
  runtime: {
    nodeId?: string | null;
    connId?: string | null;
    deviceId?: string | null;
    argv: string[];
    cwd?: string | null;
    agentId?: string | null;
    sessionKey?: string | null;
    env?: Record<string, string> | null;
  };
}): TantherExecApprovalMatchResult {
  return runTantherAuthorityScript<TantherExecApprovalMatchResult>({
    action: "match",
    approvalId: params.approvalId,
    request: params.request,
    requestedByConnId: params.requestedByConnId ?? null,
    requestedByDeviceId: params.requestedByDeviceId ?? null,
    runtime: {
      ...params.runtime,
      cwd: params.runtime.cwd ?? null,
      agentId: params.runtime.agentId ?? null,
      sessionKey: params.runtime.sessionKey ?? null,
      env: params.runtime.env ?? null,
      nodeId: params.runtime.nodeId ?? null,
      connId: params.runtime.connId ?? null,
      deviceId: params.runtime.deviceId ?? null,
    },
  });
}

export function recordTantherExecPostExecution(params: {
  approvalId: string;
  authority: TantherExecApprovalAuthorityRecord;
  request: ExecApprovalRequestPayload;
  runId: string;
  result: TantherPostExecResult;
}): TantherExecPostExecutionRecord {
  return runTantherAuthorityScript<TantherExecPostExecutionRecord>({
    action: "record",
    approvalId: params.approvalId,
    authority: params.authority,
    request: params.request,
    runId: params.runId,
    result: params.result,
  } as TantherExecApprovalScriptInput);
}

export function consumeTantherExecApprovalAuthority(params: {
  approvalId: string;
  authority: TantherExecApprovalAuthorityRecord;
  request: ExecApprovalRequestPayload;
  runId: string;
}): TantherExecApprovalConsumeResult {
  return runTantherAuthorityScript<TantherExecApprovalConsumeResult>({
    action: "consume",
    approvalId: params.approvalId,
    authority: params.authority,
    request: params.request,
    runId: params.runId,
  });
}
