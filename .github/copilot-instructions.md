## Quick context

This repository is a small pnpm-workspaces monorepo for a "mini-tradingview" market-data project. Top-level packages you should know:

- `apps/collector` — data ingestion process (uses `ioredis`, `ws`, TypeScript). Entry: `apps/collector/src/index.ts` (contains TODOs to implement Redis streams and Binance websocket consumption).
- `apps/api`, `apps/aggregator`, `apps/web` — other services/frontends (minimal at present).
- `packages/shared` — shared types and schemas (e.g. `Tick`) used across apps; imported as `@mini-tradingview/shared`.

Package manager: pnpm (root `package.json` has `packageManager: pnpm@9.0.0`). Each package has its own `package.json` and dev scripts.

## What an AI agent should do first

1. Read `apps/collector/src/index.ts` to understand the collector's TODOs: Redis streams per symbol, Binance websocket ingestion, parsing into `Tick` and writing into Redis.
2. Inspect `packages/shared` to find type definitions and validation (used across services).
3. Check each package's `package.json` for dev scripts. Example: `apps/collector` exposes a `dev` script that runs `ts-node-dev --respawn src/index.ts`.

## Commands / developer workflows (concrete examples)

- Run the collector in dev: `pnpm --filter @mini-tradingview/collector run dev`
- Run a package script by filter: `pnpm --filter <package-name> run <script>` (e.g. `pnpm --filter @mini-tradingview/web run dev`)
- Because this is a pnpm workspace, prefer `pnpm --filter` rather than running commands in a subfolder shell.

There is no centralized build/test script in the root; always check the package's `package.json` for available scripts.

## Project-specific conventions & patterns

- Package naming: scoped under `@mini-tradingview/*`.
- Shared code lives in `packages/shared` and is referenced by apps via the package name (collector imports `@mini-tradingview/shared`). Keep shared types minimal and backwards-compatible.
- Collector design (from `apps/collector/src/index.ts`): use `ioredis` for Redis access, `ws` for websockets, and write per-symbol Redis streams. Follow the TODO comments in that file for incremental implementation steps.
- Dev tooling: TypeScript + `ts-node-dev` for live reload in apps that have a `dev` script.

## Integration points and external dependencies to watch for

- Redis (used by the collector). The collector currently constructs `new Redis()` — expect default local Redis unless env-configured.
- Exchange websocket (Binance suggested by TODOs) — implement robust reconnect and message parsing. Map incoming messages to the `Tick` type in `packages/shared`.
- Inter-package linking: `apps/collector/package.json` references `shared` via a link to the workspace; prefer workspace-aware editing (pnpm will hoist/resolve local packages).

## Examples to reference while coding

- Implement parsing: look at `apps/collector/src/index.ts` TODOs and write small, well-typed helper functions that produce `Tick` objects from raw websocket payloads.
- Persisting: write to Redis streams with one stream per symbol (use `ioredis.xadd` semantics).

## Constraints & discovered gaps

- No central CI/test config was found — changes that add behavior should include small unit tests in the relevant package when possible.
- Environment configuration (Redis URL, exchange credentials) is not present in repo; assume local defaults and document needed env vars in a follow-up if required.

## When to ask the human maintainer

- If you need to add long-running infra (Dockerfiles, Redis config) or secrets (exchange API keys), ask before committing configuration or secrets.
- If you plan to change shared types in `packages/shared` in a breaking way, confirm with maintainers.

If any part of these instructions is unclear or you want the agent to expand examples (e.g., sample `xadd` calls or a small parse + test), tell me which area to expand. 
