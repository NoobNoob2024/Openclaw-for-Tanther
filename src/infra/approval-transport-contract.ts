export type ExecApprovalTransportDecision = "allow-once" | "allow-always" | "deny";

export const EXEC_APPROVAL_ALLOWED_DECISIONS = [
  "allow-once",
  "allow-always",
  "deny",
] as const satisfies readonly ExecApprovalTransportDecision[];

export function isExecApprovalTransportDecision(
  value: unknown,
): value is ExecApprovalTransportDecision {
  return (
    value === "allow-once" ||
    value === "allow-always" ||
    value === "deny"
  );
}
