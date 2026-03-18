import type { ExecApprovalTransportDecision } from "./approval-transport-contract.js";
import { resolveSurfaceAuthorityStatusFromError } from "../gateway/surface-authority-outcome.js";

export const APPROVE_USAGE_TEXT = "Usage: /approve <id> allow-once|allow-always|deny";

export function buildApproveForeignBotText(): string {
  return "❌ This /approve command targets a different Telegram bot.";
}

export function buildExecApprovalSubmittedText(params: {
  decision: ExecApprovalTransportDecision;
  id: string;
}): string {
  return `✅ Exec approval ${params.decision} submitted for ${params.id}.`;
}

export function buildExecApprovalResolveFailureText(err: unknown): string {
  const message = String(err);
  const status = resolveSurfaceAuthorityStatusFromError(err);
  if (status === "expired") {
    return "❌ Approval expired or was not found.";
  }
  if (status === "blocked") {
    return "❌ Approval could not be applied because the request no longer matches the authoritative state.";
  }
  return `❌ Failed to submit approval: ${message}`;
}
