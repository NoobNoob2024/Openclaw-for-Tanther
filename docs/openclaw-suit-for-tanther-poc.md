# OpenClaw (Suit for Tanther) PoC

> [!WARNING]
> This tree is only a proof of concept.
> It has not been validated by sustained real-world use.
> Do not present it as a finished distribution.

OpenClaw (Suit for Tanther) is the public name of this OpenClaw fork while it is being adapted to Tanther authority.

## Upstream Base

- Upstream project: `openclaw/openclaw`
- Upstream base commit: `afc0172cb1d8837755d4d642752775ac83668263`
- Upstream package name: `openclaw`
- Public name: `OpenClaw (Suit for Tanther)`
- Binary name right now: still `openclaw`

## What This Fork Is Trying To Do

OpenClaw (Suit for Tanther) keeps the OpenClaw product surface and tries to strip kernel truth out of it.

The intended split is:

- `Tanther`: execution kernel, state authority, guard authority, receipt/evidence/rollback authority
- `OpenClaw (Suit for Tanther)`: GNU-like upper layer, channels, UI, workflows, operator-facing behavior

## Current Status

The integration is real enough to matter, but still migration-stage.

The current local changes already move important authority out of OpenClaw-local logic and toward Tanther-backed paths, especially around:

- execution authority
- approval transport and resolution
- post-exec recording
- reviewer-safe and secret-boundary shaping

The migration is still incomplete.

This tree still contains:

- upstream OpenClaw platform scope
- migration-era duplication and naming residue
- wide product/runtime surface area that should not be pushed into Tanther

## Install

Runtime: `Node >=22`.

Current source install flow:

```bash
git clone https://github.com/NoobNoob2024/Openclaw-for-Tanther.git tantherclaw
cd tantherclaw

pnpm install
pnpm ui:build
pnpm build

OPENCLAW_TANTHER_HOME=/path/to/Tanther pnpm gateway:watch
```

For now, the CLI and runtime entrypoints still use the `openclaw` name.

## Major Delta From Upstream

- Tanther-backed execution authority path
- Tanther-backed approval transport and resolution work
- fail-closed tightening around post-exec recording
- reviewer-safe and secret-boundary normalization
- explicit positioning of OpenClaw as upper layer rather than hidden kernel

## What Tanther Owns

- command and state truth
- guard and approval authority
- receipt/evidence/rollback contracts
- boundary contracts consumed by GNU/OpenClaw

## What OpenClaw (Suit for Tanther) Still Owns

- GNU/product surface
- channels and operator-facing UX
- gateway/UI/CLI presentation
- workflow and orchestration behavior that is not kernel truth

## Release Recommendation

Do not collapse Tanther and OpenClaw (Suit for Tanther) into one release artifact yet.

Recommended position:

- Tanther should be versioned and described as a separate kernel project.
- OpenClaw (Suit for Tanther) should consume a pinned Tanther contract/version during migration.
- OpenClaw (Suit for Tanther) releases may mention the OpenClaw upstream base, but they should not pretend the fork is production-ready.

This keeps ownership clear:

- Tanther breakage means kernel/contract breakage.
- OpenClaw (Suit for Tanther) breakage means GNU/product-layer breakage.

That separation is healthier for stabilization, review, and future packaging.

## Attribution

由GPT 5.4氛圍編碼。
