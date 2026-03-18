import { describe, expect, it } from "vitest";
import { buildReviewerSafeOutcome } from "./reviewer-safe-outcome.js";

describe("buildReviewerSafeOutcome", () => {
  it("marks payload as reviewer-safe metadata without changing payload", () => {
    const result = buildReviewerSafeOutcome({
      includesSecrets: false,
      payload: { talk: { enabled: true } },
    });

    expect(result).toEqual({
      reviewerSafe: true,
      includesSecrets: false,
      payload: { talk: { enabled: true } },
    });
  });
});
