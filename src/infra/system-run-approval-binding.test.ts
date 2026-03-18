import { describe, expect, it } from "vitest";
import {
  buildSystemRunApprovalBinding,
  buildSystemRunApprovalEnvBinding,
  normalizeSystemRunApprovalPlan,
} from "./system-run-approval-binding.js";

describe("normalizeSystemRunApprovalPlan", () => {
  it("accepts commandText and normalized mutable file operands", () => {
    expect(
      normalizeSystemRunApprovalPlan({
        argv: ["bash", "-lc", "echo hi"],
        commandText: 'bash -lc "echo hi"',
        commandPreview: "echo hi",
        cwd: " /tmp ",
        agentId: " main ",
        sessionKey: " agent:main:main ",
        mutableFileOperand: {
          argvIndex: 2,
          path: " /tmp/payload.txt ",
          sha256: " abc123 ",
        },
      }),
    ).toEqual({
      argv: ["bash", "-lc", "echo hi"],
      commandText: 'bash -lc "echo hi"',
      commandPreview: "echo hi",
      cwd: "/tmp",
      agentId: "main",
      sessionKey: "agent:main:main",
      mutableFileOperand: {
        argvIndex: 2,
        path: "/tmp/payload.txt",
        sha256: "abc123",
      },
    });
  });

  it("falls back to rawCommand and rejects invalid file operands", () => {
    expect(
      normalizeSystemRunApprovalPlan({
        argv: ["bash", "-lc", "echo hi"],
        rawCommand: 'bash -lc "echo hi"',
      }),
    ).toEqual({
      argv: ["bash", "-lc", "echo hi"],
      commandText: 'bash -lc "echo hi"',
      commandPreview: null,
      cwd: null,
      agentId: null,
      sessionKey: null,
      mutableFileOperand: undefined,
    });

    expect(
      normalizeSystemRunApprovalPlan({
        argv: ["bash", "-lc", "echo hi"],
        commandText: 'bash -lc "echo hi"',
        mutableFileOperand: {
          argvIndex: -1,
          path: "/tmp/payload.txt",
          sha256: "abc123",
        },
      }),
    ).toBeNull();
  });
});

describe("buildSystemRunApprovalEnvBinding", () => {
  it("normalizes, filters, and sorts env keys before hashing", () => {
    const normalized = buildSystemRunApprovalEnvBinding({
      z_key: "b",
      " bad key ": "ignored",
      alpha: "a",
      EMPTY: 1,
    });
    const reordered = buildSystemRunApprovalEnvBinding({
      alpha: "a",
      z_key: "b",
    });

    expect(normalized).toEqual({
      envHash: reordered.envHash,
      envKeys: ["alpha", "z_key"],
    });
    expect(normalized.envHash).toBeTypeOf("string");
    expect(normalized.envHash).toHaveLength(64);
  });

  it("returns a null hash when no usable env entries remain", () => {
    expect(buildSystemRunApprovalEnvBinding(null)).toEqual({
      envHash: null,
      envKeys: [],
    });
    expect(
      buildSystemRunApprovalEnvBinding({
        bad: 1,
      }),
    ).toEqual({
      envHash: null,
      envKeys: [],
    });
  });
});

describe("buildSystemRunApprovalBinding", () => {
  it("normalizes argv and metadata into a binding", () => {
    const envBinding = buildSystemRunApprovalEnvBinding({
      beta: "2",
      alpha: "1",
    });

    expect(
      buildSystemRunApprovalBinding({
        argv: ["bash", "-lc", 12],
        cwd: " /tmp ",
        agentId: " main ",
        sessionKey: " agent:main:main ",
        env: {
          beta: "2",
          alpha: "1",
        },
      }),
    ).toEqual({
      binding: {
        argv: ["bash", "-lc", "12"],
        cwd: "/tmp",
        agentId: "main",
        sessionKey: "agent:main:main",
        envHash: envBinding.envHash,
      },
      envKeys: ["alpha", "beta"],
    });
  });
});
