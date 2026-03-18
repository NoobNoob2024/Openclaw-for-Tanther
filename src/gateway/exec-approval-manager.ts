import { randomUUID } from "node:crypto";
import type {
  ExecApprovalDecision,
  ExecApprovalRequestPayload as InfraExecApprovalRequestPayload,
} from "../infra/exec-approvals.js";
import type { TantherExecApprovalAuthorityRecord } from "../infra/tanther-exec-authority.js";

// Grace period to keep resolved entries for late awaitDecision calls
const RESOLVED_ENTRY_GRACE_MS = 15_000;

export type ExecApprovalRequestPayload = InfraExecApprovalRequestPayload;

export type ExecApprovalRecord = {
  id: string;
  request: ExecApprovalRequestPayload;
  authority?: TantherExecApprovalAuthorityRecord | null;
  createdAtMs: number;
  expiresAtMs: number;
  // Caller metadata (best-effort). Used to prevent other clients from replaying an approval id.
  requestedByConnId?: string | null;
  requestedByDeviceId?: string | null;
  requestedByClientId?: string | null;
  resolvedAtMs?: number;
  resolutionState?: "resolved" | "expired";
};

type PendingEntry = {
  record: ExecApprovalRecord;
  resolve: (decision: ExecApprovalDecision | null) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  promise: Promise<ExecApprovalDecision | null>;
};

export type ExecApprovalIdLookupResult =
  | { kind: "exact" | "prefix"; id: string }
  | { kind: "ambiguous"; ids: string[] }
  | { kind: "none" };

export class ExecApprovalManager {
  private pending = new Map<string, PendingEntry>();

  create(
    request: ExecApprovalRequestPayload,
    timeoutMs: number,
    id?: string | null,
  ): ExecApprovalRecord {
    const now = Date.now();
    const resolvedId = id && id.trim().length > 0 ? id.trim() : randomUUID();
    const record: ExecApprovalRecord = {
      id: resolvedId,
      request,
      createdAtMs: now,
      expiresAtMs: now + timeoutMs,
    };
    return record;
  }

  /**
   * Register an approval record and return a promise that resolves when the decision is made.
   * This separates registration (synchronous) from waiting (async), allowing callers to
   * confirm registration before the decision is made.
   */
  register(record: ExecApprovalRecord, timeoutMs: number): Promise<ExecApprovalDecision | null> {
    const existing = this.pending.get(record.id);
    if (existing) {
      // Idempotent: return existing promise if still pending
      if (existing.record.resolvedAtMs === undefined) {
        return existing.promise;
      }
      // Already resolved - don't allow re-registration
      throw new Error(`approval id '${record.id}' already resolved`);
    }
    let resolvePromise: (decision: ExecApprovalDecision | null) => void;
    let rejectPromise: (err: Error) => void;
    const promise = new Promise<ExecApprovalDecision | null>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    // Create entry first so we can capture it in the closure (not re-fetch from map)
    const entry: PendingEntry = {
      record,
      resolve: resolvePromise!,
      reject: rejectPromise!,
      timer: null as unknown as ReturnType<typeof setTimeout>,
      promise,
    };
    entry.timer = setTimeout(() => {
      this.expire(record.id);
    }, timeoutMs);
    this.pending.set(record.id, entry);
    return promise;
  }

  /**
   * @deprecated Use register() instead for explicit separation of registration and waiting.
   */
  async waitForDecision(
    record: ExecApprovalRecord,
    timeoutMs: number,
  ): Promise<ExecApprovalDecision | null> {
    return this.register(record, timeoutMs);
  }

  resolve(recordId: string): boolean {
    const pending = this.pending.get(recordId);
    if (!pending) {
      return false;
    }
    // Prevent double-resolve (e.g., if called after timeout already resolved)
    if (pending.record.resolvedAtMs !== undefined) {
      return false;
    }
    clearTimeout(pending.timer);
    pending.record.resolvedAtMs = Date.now();
    pending.record.resolutionState = "resolved";
    // Resolve the promise first, then delete after a grace period.
    // This allows in-flight awaitDecision calls to find the resolved entry.
    pending.resolve(pending.record.authority?.resolution?.decision ?? null);
    setTimeout(() => {
      // Only delete if the entry hasn't been replaced
      if (this.pending.get(recordId) === pending) {
        this.pending.delete(recordId);
      }
    }, RESOLVED_ENTRY_GRACE_MS);
    return true;
  }

  expire(recordId: string): boolean {
    const pending = this.pending.get(recordId);
    if (!pending) {
      return false;
    }
    if (pending.record.resolvedAtMs !== undefined) {
      return false;
    }
    clearTimeout(pending.timer);
    pending.record.resolvedAtMs = Date.now();
    pending.record.resolutionState = "expired";
    pending.resolve(null);
    setTimeout(() => {
      if (this.pending.get(recordId) === pending) {
        this.pending.delete(recordId);
      }
    }, RESOLVED_ENTRY_GRACE_MS);
    return true;
  }

  getSnapshot(recordId: string): ExecApprovalRecord | null {
    const entry = this.pending.get(recordId);
    return entry?.record ?? null;
  }

  /**
   * Wait for decision on an already-registered approval.
   * Returns the decision promise if the ID is pending, null otherwise.
   */
  awaitDecision(recordId: string): Promise<ExecApprovalDecision | null> | null {
    const entry = this.pending.get(recordId);
    return entry?.promise ?? null;
  }

  lookupPendingId(input: string): ExecApprovalIdLookupResult {
    const normalized = input.trim();
    if (!normalized) {
      return { kind: "none" };
    }

    const exact = this.pending.get(normalized);
    if (exact) {
      return exact.record.resolvedAtMs === undefined
        ? { kind: "exact", id: normalized }
        : { kind: "none" };
    }

    const lowerPrefix = normalized.toLowerCase();
    const matches: string[] = [];
    for (const [id, entry] of this.pending.entries()) {
      if (entry.record.resolvedAtMs !== undefined) {
        continue;
      }
      if (id.toLowerCase().startsWith(lowerPrefix)) {
        matches.push(id);
      }
    }

    if (matches.length === 1) {
      return { kind: "prefix", id: matches[0] };
    }
    if (matches.length > 1) {
      return { kind: "ambiguous", ids: matches };
    }
    return { kind: "none" };
  }
}
