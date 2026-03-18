export type ReviewerSafeOutcome<T> = {
  reviewerSafe: true;
  includesSecrets: boolean;
  payload: T;
};

export function buildReviewerSafeOutcome<T>(params: {
  includesSecrets: boolean;
  payload: T;
}): ReviewerSafeOutcome<T> {
  return {
    reviewerSafe: true,
    includesSecrets: params.includesSecrets,
    payload: params.payload,
  };
}
