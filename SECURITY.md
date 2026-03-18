# Security Policy

This repository is a proof-of-concept fork of OpenClaw adapted toward Tanther.

It should be treated as early software.
Do not assume the same security posture, review process, or reporting path as upstream OpenClaw.

## Reporting

If you find a security issue in this fork, report it privately to the maintainer of this repository.

Use the repository security reporting features when available, or contact the repository owner directly through GitHub.

## Scope

This repository is concerned with issues in:

- the OpenClaw-to-Tanther adaptation path
- authority transport and approval transport
- fail-closed behavior
- secret-boundary and reviewer-safe handling
- packaging or deployment choices specific to this fork

## Out of Scope

The following should be reported to the appropriate upstream project instead:

- issues that exist in upstream `openclaw/openclaw` without fork-specific changes
- issues that belong to Tanther itself rather than this upper-layer fork
- generic third-party dependency issues with no demonstrated impact on this fork

## Required in Reports

Please include:

1. affected file or subsystem
2. affected commit or branch
3. reproduction steps
4. demonstrated impact
5. any mitigation or fix suggestion

Reports without a working reproduction and concrete impact may be deprioritized.

## Operational Warning

This fork is still a PoC.

- treat it as non-production software
- prefer private or isolated testing environments
- do not expose it as if it were a hardened public service

## Attribution

Built with GPT-5.4.
