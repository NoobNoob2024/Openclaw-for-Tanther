# 🦞 OpenClaw (Suit for Tanther)

OpenClaw adapted to Tanther, currently as a proof of concept.

> [!WARNING]
> This repository is currently a **PoC**.
> It has not reached real-world production use.
> It should not be presented as a finished distribution.
> The package name and CLI are still `openclaw` for compatibility.

## What This Is

OpenClaw (Suit for Tanther) is an OpenClaw fork adapted to Tanther.
It keeps the upper-layer product surface while moving more kernel authority onto Tanther.

The intended split is:

- `Tanther`: execution kernel, state authority, guard authority, receipt/evidence/rollback authority
- `OpenClaw (Suit for Tanther)`: GNU-like upper layer, channels, UI, workflows, operator-facing behavior

## Upstream Base

- Upstream project: `openclaw/openclaw`
- Upstream base commit: `afc0172cb1d8837755d4d642752775ac83668263`
- Public name: `OpenClaw (Suit for Tanther)`
- Current package/binary name: still `openclaw`

## Main Changes From Upstream

- execution authority is being moved onto Tanther-backed contracts
- approval resolution is being pushed toward Tanther authority instead of local OpenClaw truth
- post-exec recording is being tightened to avoid local success without authoritative recording
- reviewer-safe and secret-boundary shaping are being normalized
- OpenClaw is being forced into an upper-layer role instead of acting like a hidden kernel

## Install

Runtime: **Node >=22**.

This fork currently expects a Tanther checkout from the same personal homepage repository.

```bash
git clone <personal-homepage-repository-url> tantherclaw
cd tantherclaw

pnpm install
pnpm ui:build
pnpm build

OPENCLAW_TANTHER_HOME=/path/to/Tanther pnpm gateway:watch
```

The CLI and runtime entrypoints are still `openclaw`.

## Current Status

The integration is real enough to matter, but still migration-stage.

This tree still contains:

- upstream OpenClaw platform scope
- migration-era duplication and naming residue
- wide product/runtime surface area that should not be pushed into Tanther

See [docs/openclaw-suit-for-tanther-poc.md](docs/openclaw-suit-for-tanther-poc.md) for the longer PoC note.

## Release Position

Do not collapse Tanther and OpenClaw (Suit for Tanther) into one release artifact yet.

Recommended position:

- Tanther should be versioned and described as a separate kernel project
- OpenClaw (Suit for Tanther) should consume a pinned Tanther contract/version during migration
- OpenClaw (Suit for Tanther) should not be marketed as production-ready

## Attribution

由GPT 5.4氛圍編碼。
