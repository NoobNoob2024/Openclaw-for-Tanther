import { normalizeSurfaceAuthorityStatus } from "../gateway/surface-authority-outcome.js";

export type SystemRunAuthorityInvokeResult =
  | {
      ok: true;
      payloadJSON: string;
    }
  | {
    ok: false;
    error: {
      code: string;
      message: string;
      status?: string;
    };
  };

export function buildSystemRunAuthoritySuccess(payloadJSON: string): SystemRunAuthorityInvokeResult {
  return {
    ok: true,
    payloadJSON,
  };
}

export function buildSystemRunAuthorityFailure(
  code: string,
  message: string,
): SystemRunAuthorityInvokeResult {
  return {
    ok: false,
    error: {
      code,
      message,
      status: normalizeSurfaceAuthorityStatus({ code, message }),
    },
  };
}
