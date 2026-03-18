import { describe, expect, test, vi } from "vitest";
import {
  buildSystemRunApprovalBinding,
  buildSystemRunApprovalEnvBinding,
} from "../infra/system-run-approval-binding.js";
import type { TantherExecApprovalAuthorityRecord } from "../infra/tanther-exec-authority.js";
import { ExecApprovalManager, type ExecApprovalRecord } from "./exec-approval-manager.js";
import { sanitizeSystemRunParamsForForwarding } from "./node-invoke-system-run-approval.js";

vi.mock("../infra/tanther-exec-authority.js", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../infra/tanther-exec-authority.js")>();
  return {
    ...mod,
    matchTantherExecApprovalAuthority: vi.fn((params: {
      request: ExecApprovalRecord["request"];
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
    }) => {
      if (params.request.host !== "node") {
        return {
          ok: false as const,
          code: "APPROVAL_REQUEST_MISMATCH",
          message: "approval id does not match request",
        };
      }
      const requestNodeId = typeof params.request.nodeId === "string" ? params.request.nodeId : null;
      const runtimeNodeId = params.runtime.nodeId?.trim() || null;
      if (!runtimeNodeId) {
        return {
          ok: false as const,
          code: "MISSING_NODE_ID",
          message: "node.invoke requires nodeId",
        };
      }
      if (!requestNodeId) {
        return {
          ok: false as const,
          code: "APPROVAL_NODE_BINDING_MISSING",
          message: "approval id missing node binding",
        };
      }
      if (requestNodeId !== runtimeNodeId) {
        return {
          ok: false as const,
          code: "APPROVAL_NODE_MISMATCH",
          message: "approval id not valid for this node",
        };
      }
      if (params.requestedByDeviceId) {
        if (params.requestedByDeviceId !== (params.runtime.deviceId ?? null)) {
          return {
            ok: false as const,
            code: "APPROVAL_DEVICE_MISMATCH",
            message: "approval id not valid for this device",
          };
        }
      } else if (
        params.requestedByConnId &&
        params.requestedByConnId !== (params.runtime.connId ?? null)
      ) {
        return {
          ok: false as const,
          code: "APPROVAL_CLIENT_MISMATCH",
          message: "approval id not valid for this client",
        };
      }

      const expectedBinding = params.request.systemRunBinding;
      const actualBinding = buildSystemRunApprovalBinding({
        argv: params.runtime.argv,
        cwd: params.runtime.cwd,
        agentId: params.runtime.agentId,
        sessionKey: params.runtime.sessionKey,
        env: params.runtime.env,
      });
      if (!expectedBinding) {
        return {
          ok: false as const,
          code: "APPROVAL_REQUEST_MISMATCH",
          message: "approval id does not match request",
          details: { envKeys: actualBinding.envKeys },
        };
      }
      if (JSON.stringify(expectedBinding.argv) !== JSON.stringify(actualBinding.binding.argv)) {
        return {
          ok: false as const,
          code: "APPROVAL_REQUEST_MISMATCH",
          message: "approval id does not match request",
        };
      }
      if (expectedBinding.cwd !== actualBinding.binding.cwd) {
        return {
          ok: false as const,
          code: "APPROVAL_REQUEST_MISMATCH",
          message: "approval id does not match request",
        };
      }
      if (expectedBinding.agentId !== actualBinding.binding.agentId) {
        return {
          ok: false as const,
          code: "APPROVAL_REQUEST_MISMATCH",
          message: "approval id does not match request",
        };
      }
      if (expectedBinding.sessionKey !== actualBinding.binding.sessionKey) {
        return {
          ok: false as const,
          code: "APPROVAL_REQUEST_MISMATCH",
          message: "approval id does not match request",
        };
      }
      if (!expectedBinding.envHash && !actualBinding.binding.envHash) {
        return { ok: true as const };
      }
      if (!expectedBinding.envHash && actualBinding.binding.envHash) {
        return {
          ok: false as const,
          code: "APPROVAL_ENV_BINDING_MISSING",
          message: "approval id missing env binding for requested env overrides",
          details: { envKeys: actualBinding.envKeys },
        };
      }
      if (expectedBinding.envHash !== actualBinding.binding.envHash) {
        return {
          ok: false as const,
          code: "APPROVAL_ENV_MISMATCH",
          message: "approval id env binding mismatch",
          details: {
            envKeys: actualBinding.envKeys,
            expectedEnvHash: expectedBinding.envHash,
            actualEnvHash: actualBinding.binding.envHash,
          },
        };
      }
      return { ok: true as const };
    }),
    consumeTantherExecApprovalAuthority: vi.fn((params: {
      authority: TantherExecApprovalAuthorityRecord;
      runId: string;
    }) => {
      const consumed = params.authority.resolution?.consumedRunIds ?? [];
      if (consumed.length > 0) {
        return {
          ok: false as const,
          code: "APPROVAL_ALREADY_CONSUMED",
          message: "approval already consumed",
          details: { consumedRunIds: consumed },
        };
      }
      return {
        ok: true as const,
        authority: {
          ...params.authority,
          resolution: params.authority.resolution
            ? {
                ...params.authority.resolution,
                consumedRunIds: [params.runId],
              }
            : undefined,
        },
      };
    }),
  };
});

describe("sanitizeSystemRunParamsForForwarding", () => {
  const now = Date.now();
  const client = {
    connId: "conn-1",
    connect: {
      scopes: ["operator.write", "operator.approvals"],
      device: { id: "dev-1" },
      client: { id: "cli-1" },
    },
  };

  function buildAuthorityResolution(
    decision: "allow-once" | "allow-always",
  ): TantherExecApprovalAuthorityRecord {
    return {
      authority: "tanther",
      commandId: "cmd-approval-1",
      fingerprintId: "fp-approval-1",
      snapshotHash: "hash-approval-1",
      snapshotVersion: "openclaw-node",
      approvalScope: "system.run:node:node-1",
      requiredApproverClass: "operator",
      currentState: "approved",
      guardDecision: "proceed",
      stages: [],
      resolution: {
        decision,
        currentState: "approved",
      },
    };
  }

  function makeRecord(
    command: string,
    commandArgv?: string[],
    bindingArgv?: string[],
  ): ExecApprovalRecord {
    const effectiveBindingArgv = bindingArgv ?? commandArgv ?? [command];
    return {
      id: "approval-1",
      request: {
        host: "node",
        nodeId: "node-1",
        command,
        commandArgv,
        systemRunBinding: buildSystemRunApprovalBinding({
          argv: effectiveBindingArgv,
          cwd: null,
          agentId: null,
          sessionKey: null,
        }).binding,
        cwd: null,
        agentId: null,
        sessionKey: null,
      },
      createdAtMs: now - 1_000,
      expiresAtMs: now + 60_000,
      requestedByConnId: "conn-1",
      requestedByDeviceId: "dev-1",
      requestedByClientId: "cli-1",
      authority: buildAuthorityResolution("allow-once"),
      resolvedAtMs: now - 500,
      resolutionState: "resolved",
    };
  }

  function manager(record: ReturnType<typeof makeRecord>) {
    return {
      getSnapshot: () => record,
    };
  }

  function expectAllowOnceForwardingResult(
    result: ReturnType<typeof sanitizeSystemRunParamsForForwarding>,
  ) {
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("unreachable");
    }
    const params = result.params as Record<string, unknown>;
    expect(params.approved).toBe(true);
    expect(params.approvalDecision).toBe("allow-once");
  }

  function expectRejectedForwardingResult(
    result: ReturnType<typeof sanitizeSystemRunParamsForForwarding>,
    code: string,
    messageSubstring?: string,
  ) {
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("unreachable");
    }
    if (messageSubstring) {
      expect(result.message).toContain(messageSubstring);
    }
    expect(result.details?.code).toBe(code);
  }

  test("rejects cmd.exe /c trailing-arg mismatch against rawCommand", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["cmd.exe", "/d", "/s", "/c", "echo", "SAFE&&whoami"],
        rawCommand: "echo",
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(makeRecord("echo")),
      nowMs: now,
    });
    expectRejectedForwardingResult(
      result,
      "RAW_COMMAND_MISMATCH",
      "rawCommand does not match command",
    );
  });

  test("accepts matching cmd.exe /c command text for approval binding", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["cmd.exe", "/d", "/s", "/c", "echo", "SAFE&&whoami"],
        rawCommand: "echo SAFE&&whoami",
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(
        makeRecord("echo SAFE&&whoami", undefined, [
          "cmd.exe",
          "/d",
          "/s",
          "/c",
          "echo",
          "SAFE&&whoami",
        ]),
      ),
      nowMs: now,
    });
    expectAllowOnceForwardingResult(result);
  });

  test("rejects env-assignment shell wrapper when approval command omits env prelude", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["/usr/bin/env", "BASH_ENV=/tmp/payload.sh", "bash", "-lc", "echo SAFE"],
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(makeRecord("echo SAFE")),
      nowMs: now,
    });
    expectRejectedForwardingResult(
      result,
      "APPROVAL_REQUEST_MISMATCH",
      "approval id does not match request",
    );
  });

  test("accepts env-assignment shell wrapper only when approval command matches full argv text", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["/usr/bin/env", "BASH_ENV=/tmp/payload.sh", "bash", "-lc", "echo SAFE"],
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(
        makeRecord('/usr/bin/env BASH_ENV=/tmp/payload.sh bash -lc "echo SAFE"', undefined, [
          "/usr/bin/env",
          "BASH_ENV=/tmp/payload.sh",
          "bash",
          "-lc",
          "echo SAFE",
        ]),
      ),
      nowMs: now,
    });
    expectAllowOnceForwardingResult(result);
  });

  test("rejects trailing-space argv mismatch against legacy command-only approval", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["runner "],
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(makeRecord("runner")),
      nowMs: now,
    });
    expectRejectedForwardingResult(
      result,
      "APPROVAL_REQUEST_MISMATCH",
      "approval id does not match request",
    );
  });

  test("enforces commandArgv identity when approval includes argv binding", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["echo", "SAFE"],
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(makeRecord("echo SAFE", ["echo SAFE"])),
      nowMs: now,
    });
    expectRejectedForwardingResult(
      result,
      "APPROVAL_REQUEST_MISMATCH",
      "approval id does not match request",
    );
  });

  test("accepts matching commandArgv binding for trailing-space argv", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["runner "],
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(makeRecord('"runner "', ["runner "])),
      nowMs: now,
    });
    expectAllowOnceForwardingResult(result);
  });

  test("uses systemRunPlan for forwarded command context and ignores caller tampering", () => {
    const record = makeRecord("echo SAFE", ["echo", "SAFE"]);
    record.request.systemRunPlan = {
      argv: ["/usr/bin/echo", "SAFE"],
      cwd: "/real/cwd",
      commandText: "/usr/bin/echo SAFE",
      agentId: "main",
      sessionKey: "agent:main:main",
    };
    record.request.systemRunBinding = buildSystemRunApprovalBinding({
      argv: ["/usr/bin/echo", "SAFE"],
      cwd: "/real/cwd",
      agentId: "main",
      sessionKey: "agent:main:main",
    }).binding;
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["echo", "PWNED"],
        rawCommand: "echo PWNED",
        cwd: "/tmp/attacker-link/sub",
        agentId: "attacker",
        sessionKey: "agent:attacker:main",
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(record),
      nowMs: now,
    });
    expectAllowOnceForwardingResult(result);
    if (!result.ok) {
      throw new Error("unreachable");
    }
    const forwarded = result.params as Record<string, unknown>;
    expect(forwarded.command).toEqual(["/usr/bin/echo", "SAFE"]);
    expect(forwarded.rawCommand).toBe("/usr/bin/echo SAFE");
    expect(forwarded.systemRunPlan).toEqual(
      expect.objectContaining({
        argv: ["/usr/bin/echo", "SAFE"],
        cwd: "/real/cwd",
        commandText: "/usr/bin/echo SAFE",
        agentId: "main",
        sessionKey: "agent:main:main",
      }),
    );
    expect(forwarded.cwd).toBe("/real/cwd");
    expect(forwarded.agentId).toBe("main");
    expect(forwarded.sessionKey).toBe("agent:main:main");
  });

  test("rejects env overrides when approval record lacks env binding", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["git", "diff"],
        rawCommand: "git diff",
        env: { GIT_EXTERNAL_DIFF: "/tmp/pwn.sh" },
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(makeRecord("git diff", ["git", "diff"])),
      nowMs: now,
    });
    expectRejectedForwardingResult(result, "APPROVAL_ENV_BINDING_MISSING");
  });

  test("rejects env hash mismatch", () => {
    const record = makeRecord("git diff", ["git", "diff"]);
    record.request.systemRunBinding = {
      argv: ["git", "diff"],
      cwd: null,
      agentId: null,
      sessionKey: null,
      envHash: buildSystemRunApprovalEnvBinding({ SAFE: "1" }).envHash,
    };
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["git", "diff"],
        rawCommand: "git diff",
        env: { SAFE: "2" },
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(record),
      nowMs: now,
    });
    expectRejectedForwardingResult(result, "APPROVAL_ENV_MISMATCH");
  });

  test("accepts matching env hash with reordered keys", () => {
    const record = makeRecord("git diff", ["git", "diff"]);
    const binding = buildSystemRunApprovalEnvBinding({ SAFE_A: "1", SAFE_B: "2" });
    record.request.systemRunBinding = {
      argv: ["git", "diff"],
      cwd: null,
      agentId: null,
      sessionKey: null,
      envHash: binding.envHash,
    };
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["git", "diff"],
        rawCommand: "git diff",
        env: { SAFE_B: "2", SAFE_A: "1" },
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(record),
      nowMs: now,
    });
    expectAllowOnceForwardingResult(result);
  });

  test("consumes allow-once approvals and blocks same runId replay", async () => {
    const approvalManager = new ExecApprovalManager();
    const runId = "approval-replay-1";
    const record = approvalManager.create(
      {
        host: "node",
        nodeId: "node-1",
        command: "echo SAFE",
        commandArgv: ["echo", "SAFE"],
        systemRunBinding: buildSystemRunApprovalBinding({
          argv: ["echo", "SAFE"],
          cwd: null,
          agentId: null,
          sessionKey: null,
        }).binding,
        cwd: null,
        agentId: null,
        sessionKey: null,
      },
      60_000,
      runId,
    );
    record.requestedByConnId = "conn-1";
    record.requestedByDeviceId = "dev-1";
    record.requestedByClientId = "cli-1";
    record.authority = buildAuthorityResolution("allow-once");

    const decisionPromise = approvalManager.register(record, 60_000);
    approvalManager.resolve(runId);
    await expect(decisionPromise).resolves.toBe("allow-once");

    const params = {
      command: ["echo", "SAFE"],
      rawCommand: "echo SAFE",
      runId,
      approved: true,
      approvalDecision: "allow-once",
    };

    const first = sanitizeSystemRunParamsForForwarding({
      nodeId: "node-1",
      rawParams: params,
      client,
      execApprovalManager: approvalManager,
      nowMs: now,
    });
    expectAllowOnceForwardingResult(first);
    if (first.ok) {
      const forwarded = first.params as Record<string, unknown>;
      expect(forwarded.approvalAuthority).toEqual(record.authority);
      expect(forwarded.approvalRequest).toEqual(record.request);
      expect(record.authority?.resolution?.consumedRunIds).toEqual([runId]);
    }

    const second = sanitizeSystemRunParamsForForwarding({
      nodeId: "node-1",
      rawParams: params,
      client,
      execApprovalManager: approvalManager,
      nowMs: now,
    });
    expectRejectedForwardingResult(second, "APPROVAL_ALREADY_CONSUMED", "approval already consumed");
  });

  test("rejects expired approvals even when caller injects allow-once override", () => {
    const expiredRecord: ExecApprovalRecord = {
      ...makeRecord("echo SAFE"),
      authority: null,
      resolvedAtMs: now - 100,
      resolutionState: "expired",
      expiresAtMs: now - 1,
    };
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["echo", "SAFE"],
        rawCommand: "echo SAFE",
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(expiredRecord as ReturnType<typeof makeRecord>),
      nowMs: now,
    });
    expectRejectedForwardingResult(result, "APPROVAL_EXPIRED", "approval expired");
  });

  test("rejects approval ids that do not bind a nodeId", () => {
    const record = makeRecord("echo SAFE");
    record.request.nodeId = null;
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["echo", "SAFE"],
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-1",
      client,
      execApprovalManager: manager(record),
      nowMs: now,
    });
    expectRejectedForwardingResult(result, "APPROVAL_NODE_BINDING_MISSING", "missing node binding");
  });

  test("rejects approval ids replayed against a different nodeId", () => {
    const result = sanitizeSystemRunParamsForForwarding({
      rawParams: {
        command: ["echo", "SAFE"],
        runId: "approval-1",
        approved: true,
        approvalDecision: "allow-once",
      },
      nodeId: "node-2",
      client,
      execApprovalManager: manager(makeRecord("echo SAFE")),
      nowMs: now,
    });
    expectRejectedForwardingResult(result, "APPROVAL_NODE_MISMATCH", "not valid for this node");
  });
});
