# Quickstart & Validation Guide: n8n-nodes-attio

This guide proves the node works end-to-end. Implementation detail lives in `tasks.md` and the code; here are the runnable checks and the verify-live gates. Contracts: `contracts/`. Data model: `data-model.md`. Decisions: `research.md`.

## Prerequisites
- **Decision Gate 0 cleared** (research.md R6): Creator Portal confirms fresh-package eligibility and the final package name (`n8n-nodes-attio` or `@nodrel/n8n-nodes-attio`). Blocks scaffolding.
- Node **>= 22.22**; npm.
- An Attio workspace + API token from **Workspace Settings → Developers**, with scopes per `research.md` R2. For the scope-footgun test, also create a token with only `record_permission:read` (missing `object_configuration:read`).

## Build & local checks (CI gates, brief §18.4)
```bash
npm ci
npm run lint                                   # eslint-plugin-n8n-nodes-base
npx @n8n/scan-community-package n8n-nodes-attio  # verification linter
tsc --noEmit                                   # strict, incremental OFF
npm run build                                  # → dist/
npm test                                       # pure-core unit tests (must precede wiring)
node -e "process.exit(Object.keys(require('./package.json').dependencies||{}).length?1:0)"  # zero-dep gate
```
All must pass. `npm pack` then inspect the tarball → `dependencies` empty (SC-008).

## Run in n8n
1. `npm run build && npm link`; in n8n custom-nodes dir `npm link n8n-nodes-attio`; start n8n.
2. Add the **Attio** node; create an **Attio API** credential, paste the token.

## Validation scenarios (map to user stories / SC)

### US1 — Connect & choose object (P1)
- Save valid token → credential test passes. Save invalid token → **rejected at the dialog** (SC-002).
- Open any Record op → Object dropdown lists People/Companies/Deals/custom by name (SC-001).

### US2 — Create record (P1)
- Companies + Values JSON + Create → item has `data.id.record_id` (AS-A1).
- Token missing write scope → 403 names the scope (AS-A2, SC-004).

### US3 — Upsert (P2)
- Upsert Person `matching_attribute=email_addresses` twice, same email → one record, second updates (SC-005, AS-B1).
- Omit matching attribute → validation error before request (AS-B2).

### US4 — Update append vs overwrite (P2)
- Append → PATCH; multiselect retains existing + new (AS-C1).
- Overwrite → PUT; set equals exactly sent (AS-C2, SC-006).

### US5 — Get Many + paging (P2)
- Filter JSON → only matching records (AS-D1).
- Return All → pages through `offset`; count matches workspace (AS-D2, SC-007).

### US6 — Note + Task on a record (P3)
- Note Create with parent object/record → linked note (AS-E1).
- Task Create linked to same record, assignee by email → task created, assignee resolves (AS-E2).
- Task Update surface has **no content field**; content unchanged after update (FR-14).

### US7 — AI-Agent tool (P3)
- From the agent tool path, run Create Record and Get Many → both execute (AS-F1, SC-009).

### Error edges
- Malformed Values → clear pre-request error.
- 429 → rate-limit message; `Retry-After` parsed as **date** (research.md R4).
- `continueOnFail` → one bad item does not abort the batch (FR-13).

## Verify-live checklist (brief §15 — every item a gate)
- [ ] Decision Gate 0 eligibility confirmed.
- [ ] Credential test: valid saves / invalid rejected at dialog.
- [ ] `getObjects` populates standard + custom objects.
- [ ] Record Create/Get/Update(both)/Upsert/Get Many/Search/Delete round-trip.
- [ ] Single-read-scope token 403s on record read with scope-naming message.
- [ ] Note Create/Get/Get Many/Delete round-trip.
- [ ] Task Create/Get/Get Many/Update/Delete round-trip; Update has no content field; content unchanged.
- [ ] 429 surfaces rate-limit message; `Retry-After` parsed as date.
- [ ] Search `request_as` default `workspace` works with a plain token.
- [ ] AI-Agent tool path runs Record Create and Get Many.
- [ ] `@n8n/scan-community-package` passes.
- [ ] Published tarball has zero runtime dependencies.

## Release pipeline acceptance (brief §18.7)
- [ ] `feat:` merge opens/updates a release-please PR with correct bump + changelog.
- [ ] Merging the release PR creates the tag + GitHub Release.
- [ ] Release event triggers `publish.yml` → npm publish with visible provenance badge.
- [ ] `ci.yml` fails on added runtime dep / scan fail / type fail / test fail.
- [ ] Non-conventional PR title fails PR-title lint and cannot merge.
- [X] No `NPM_TOKEN` needed when OIDC trusted publishing is configured. ✓ 2026-08-16 — 0.2.6 published token-free with provenance; `NPM_TOKEN` secret deleted. Register workflow **`release-please.yml`** (the entry point), not `publish.yml`.
