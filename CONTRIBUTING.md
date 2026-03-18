# Contributing to OpenClaw (Suit for Tanther)

This repository is a proof-of-concept fork.

It is not the upstream OpenClaw repository, and it is not a finished production distribution.
Contributions should respect that scope.

## Before You Contribute

- Read [`README.md`](/home/noob/dev/OpenClaw-Suit-for-Tanther-publish/README.md)
- Read [`docs/openclaw-suit-for-tanther-poc.md`](/home/noob/dev/OpenClaw-Suit-for-Tanther-publish/docs/openclaw-suit-for-tanther-poc.md)
- Understand the intended split:
  - `Tanther` owns kernel authority
  - `OpenClaw (Suit for Tanther)` owns upper-layer product and operator surface

## What Contributions Are Wanted

- fixes to the Tanther adaptation path
- fail-closed improvements
- authority-boundary cleanup
- documentation fixes for this fork
- packaging and installation fixes that help this fork run cleanly

## What Contributions Are Not Wanted

- changes that push product-layer semantics into Tanther
- new hidden local authority paths inside OpenClaw
- large unrelated feature drops from upstream without clear adaptation value
- cosmetic churn that makes the migration harder to review

## Development Expectations

- keep changes focused
- explain what changed and why
- prefer readable, direct code over clever abstraction
- do not add new fallback paths that weaken fail-closed behavior
- do not reintroduce duplicated approval, state, or execution authority

## Basic Local Check

Use the normal workspace install flow:

```bash
pnpm install
pnpm ui:build
pnpm build
pnpm exec vitest run
```

If the fork depends on a local Tanther checkout, set:

```bash
OPENCLAW_TANTHER_HOME=/path/to/Tanther
```

before running the relevant gateway or integration paths.

## Pull Requests

PRs should include:

- the problem being solved
- the intended layer ownership
- any effect on Tanther authority contracts
- test coverage or an explicit note when tests were not run

## Attribution

Built with GPT-5.4.
