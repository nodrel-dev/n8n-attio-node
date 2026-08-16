# Implementation Plan: Attio Action Node (n8n-nodes-attio)

**Branch**: `001-attio-action-node` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-attio-action-node/spec.md`; authoritative requirements in `internal/attio-node-build-brief.md`.

## Summary

Build `n8n-nodes-attio`, a verification-track n8n community **action node** that talks directly to the Attio REST API v2 using a single workspace API token. v1 covers three resources — Record (9 ops), Note (4 ops), Task (5 ops) = 18 operations — plus a dynamic Object dropdown sourced from `GET /v2/objects`. The node is **declarative-style** (`requestDefaults` + per-operation `routing`), with **zero runtime dependencies**, a `GET /v2/self` credential test, faithful Attio error surfacing, and a small framework-free pure core that is unit-tested before any wiring.

**Central open mechanism (decision 8) — RESOLVED declaratively.** Verified against n8n-core `routing-node.js`: an `options`-type parameter's individual options may each carry their own `routing`, which n8n deep-merges (lodash) into the request when selected. The Record Update "Multiselect Mode" selector therefore switches the verb with **no programmatic `execute`** — `Append` option → `routing.request.method: 'PATCH'`, `Overwrite` option → `'PUT'`. The whole node stays declarative; the only programmatic surface is the `getObjects` `loadOptions` method (allowed, not a runtime dependency).

Release automation follows the locked section-18 design: `release-please` (action v4, `release-type: node`) owns versioning/changelog/tags/GitHub Release from Conventional Commits; a separate scaffold `publish.yml` (triggered on `release: published`) publishes to npm with `--provenance` via OIDC trusted publishing; `ci.yml` runs install/lint/community-scan/typecheck/build/test plus the zero-dependency gate and conventional PR-title lint.

## Technical Context

**Language/Version**: TypeScript (strict, `tsc --noEmit` gate, **incremental OFF**); compiled to `dist/`. Runtime target Node **>= 22.22**.

**Primary Dependencies**: **Zero runtime dependencies** (hard gate, NFR-1). devDependencies only: `@n8n/node-cli` **>= 0.23.0**, `n8n-workflow` (peer/types), TypeScript, ESLint + `eslint-plugin-n8n-nodes-base`, a test runner (Jest or Vitest — see research), commitlint, lefthook.

**Storage**: N/A — no env vars, no filesystem (NFR-2/FR-10). All data flows through node parameters and the `attioApi` credential.

**Testing**: Pure-core unit tests (table-driven) for every function in brief §9, written before the operation is wired. `npm test` is a CI gate. Live verification (brief §15) is a manual gate against a real Attio workspace through a running n8n instance.

**Target Platform**: n8n (Cloud + self-hosted) as a verified community action node; also usable as an AI-Agent tool (`action` metadata, `usableAsTool`).

**Project Type**: Single-package n8n community node (declarative-style). Scaffolded via `npm create @n8n/node`.

**Performance Goals**: Interactive node execution; "Return All" auto-paginates by `offset` until a short page returns. No fixed throughput target; resilience to 429 is delegated to n8n's built-in Retry-On-Fail (declarative nodes cannot easily implement custom backoff).

**Constraints**: Declarative-first (NFR-3); zero deps; English-only interface and docs (NFR-5); secret hygiene — token is a `password` field, never logged/echoed (NFR-9); provenance-only publishing (NFR-7); `values` and `filter` are raw JSON in v1 (locked).

**Scale/Scope**: 1 credential type, 1 node, 3 resources, 18 operations, 1 `loadOptions` method, ~10 pure-core functions, 3 GitHub Actions workflows.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` (v1.0.0). All 14 principles evaluated against this plan:

| # | Principle | Plan compliance |
|---|-----------|-----------------|
| I | Zero Runtime Dependencies | `dependencies: {}`; CI zero-dep gate script; verified at `npm pack`. **PASS** |
| II | Declarative-First, Narrow Programmatic Fallback | Fully declarative routing. Update verb switch via per-option routing (no `execute`). Only programmatic surface: `getObjects` loadOptions (sanctioned). **PASS** |
| III | API-Token-Only Auth + `/v2/self` Test | `attioApi` credential, `apiToken` password field, Bearer auth, `test` request to `/v2/self`. **PASS** |
| IV | Dual-Scope Read Requirement | Scope pairs documented per op group (refined in research.md); 403 surfaced as likely missing scope. **PASS** |
| V | Two-PUT / PATCH-vs-PUT Write Model | Update = one op + Multiselect Mode (PATCH/PUT); Upsert = separate collection-PUT op with required `matching_attribute` validated pre-request. **PASS** |
| VI | Task Content Write-Once | Task Update surface omits `content`; `format` hardcoded `plaintext`. **PASS** |
| VII | English-Only + Provenance Publishing | All text English; publish only via `publish.yml` provenance workflow. **PASS** |
| VIII | Testable Pure Core | All §9 functions implemented framework-free with tests-first. **PASS** |
| IX | Faithful Error Surfacing | `formatAttioError` surfaces `status_code/type/code/message`; 403→scope hint; 429→rate-limit + `Retry-After` parsed as date; respects `continueOnFail`. **PASS** |
| X | No Env/Filesystem Access | No `process.env`, no `fs`; all I/O via params/credential. **PASS** |
| XI | Readable, AI-Tool-Ready Ops + Dynamic Dropdown | Resource→Operation, readable names + `action`; `getObjects` loadOptions on `GET /v2/objects`. **PASS** |
| XII | Spec Fidelity + Locked-Decision Discipline | 19-op matrix honored; `data` unwrap; locked decisions untouched; every [VERIFY-LIVE] is a gate. **PASS** |
| XIII | Eligibility Gated on Creator Portal | Decision Gate 0 captured as a blocking pre-scaffold task (see Phase 2 / tasks). **PASS (gate, not yet cleared)** |
| XIV | Automated, Provenance-Only Releases | release-please + two-workflow split + OIDC provenance + commitlint/PR-title lint. **PASS** |

**Result**: No violations. Complexity Tracking table left empty. The one *open* item is Decision Gate 0 (external Creator Portal confirmation) — a governance gate that blocks scaffolding, not a design conflict.

## Project Structure

### Documentation (this feature)

```text
specs/001-attio-action-node/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output — decision 8 + scope refinements + VERIFY-LIVE resolutions
├── data-model.md        # Phase 1 output — entities, parameters, pure-core types
├── quickstart.md        # Phase 1 output — build/run/verify-live validation guide
├── contracts/           # Phase 1 output — per-operation request/response contracts
│   ├── README.md
│   ├── credential.md
│   ├── record-operations.md
│   ├── note-operations.md
│   ├── task-operations.md
│   └── load-options.md
├── checklists/
│   └── requirements.md  # (existing)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

Layout produced by `npm create @n8n/node`, then extended. Hand-written node/credential — `attio-api-spec/` is never imported, copied, or read at build/run time.

```text
n8n-nodes-attio/
├── credentials/
│   └── AttioApi.credentials.ts        # attioApi: apiToken password, Bearer, /v2/self test
├── nodes/
│   └── Attio/
│       ├── Attio.node.ts              # declarative node: requestDefaults + routing
│       ├── Attio.node.json            # codex metadata
│       ├── attio.svg                  # node icon
│       ├── descriptions/              # property groups split by resource (cohesion <800 LOC/file)
│       │   ├── record.description.ts
│       │   ├── note.description.ts
│       │   └── task.description.ts
│       ├── methods/
│       │   └── loadOptions.ts         # getObjects -> GET /v2/objects -> mapObjectsToOptions
│       └── core/                      # framework-free pure functions (brief §9)
│           ├── objectPath.ts
│           ├── buildValuesBody.ts
│           ├── updateVerb.ts
│           ├── buildQueryBody.ts
│           ├── buildSearchBody.ts
│           ├── buildNoteBody.ts
│           ├── buildTaskBodies.ts
│           ├── mapObjectsToOptions.ts
│           └── formatAttioError.ts
├── test/                              # pure-core unit tests (tests-first, table-driven)
│   └── core/*.test.ts
├── .github/workflows/
│   ├── ci.yml                         # install, lint, scan, typecheck, build, test, zero-dep, PR-title lint
│   ├── release-please.yml             # contents:write + pull-requests:write
│   └── publish.yml                    # scaffold provenance publisher; release:published; id-token:write
├── release-please-config.json
├── .release-please-manifest.json
├── commitlint.config.js
├── lefthook.yml
├── .eslintrc.js                       # eslint-plugin-n8n-nodes-base
├── tsconfig.json                      # strict, incremental OFF
├── package.json                       # name, n8n block, dependencies:{} , keywords incl. n8n-community-node-package
├── README.md                          # English-only: ops table, scopes, example, support boundary
└── LICENSE
```

**Structure Decision**: Single-package declarative n8n node, scaffolded with the official n8n-node CLI so the scaffold conventions and provenance `publish.yml` are inherited. Property descriptions are split per resource to keep files cohesive (<800 LOC). The pure core lives under `nodes/Attio/core/` so it is co-located but importable by tests with no n8n runtime. The `getObjects` method is the lone programmatic surface, isolated in `methods/loadOptions.ts`.

## Complexity Tracking

> No constitution violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
