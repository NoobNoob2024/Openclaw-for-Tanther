export type SecretBoundaryOutcome =
  | {
      ok: true;
      status: "config" | "secret-ref" | "fallback";
      secretRefConfigured: boolean;
    }
  | {
      ok: false;
      status: "unresolved" | "non-string" | "empty";
      code: "SECRET_BOUNDARY_UNRESOLVED" | "SECRET_BOUNDARY_NON_STRING" | "SECRET_BOUNDARY_EMPTY";
      secretRefConfigured: boolean;
      reason: string;
    };

export function buildSecretBoundarySuccess(params: {
  status: "config" | "secret-ref" | "fallback";
  secretRefConfigured: boolean;
}): SecretBoundaryOutcome {
  return {
    ok: true,
    status: params.status,
    secretRefConfigured: params.secretRefConfigured,
  };
}

export function buildSecretBoundaryFailure(params: {
  status: "unresolved" | "non-string" | "empty";
  reason: string;
  secretRefConfigured: boolean;
}): SecretBoundaryOutcome {
  return {
    ok: false,
    status: params.status,
    code:
      params.status === "non-string"
        ? "SECRET_BOUNDARY_NON_STRING"
        : params.status === "empty"
          ? "SECRET_BOUNDARY_EMPTY"
          : "SECRET_BOUNDARY_UNRESOLVED",
    reason: params.reason,
    secretRefConfigured: params.secretRefConfigured,
  };
}
