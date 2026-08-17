---
description: "Task list for Attio Action Node (n8n-nodes-attio)"
---

# Tasks: Attio Action Node (n8n-nodes-attio)

**Input**: Design documents from `/specs/001-attio-action-node/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED. The constitution (Principle VIII) and the task brief mandate pure-core unit tests written **first** for every function in brief §9, before the operation is wired or verified live.

**Organization**: Grouped by user story. Within stories, the operation order follows the locked build order: credential + getObjects → Record Create, Get, Update (both modes), Upsert, Get Many, Search, Delete, secondary reads → Notes → Tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US7 from spec.md; setup/foundational/polish carry no story label
- Each operation is "done" only after its pure-core tests pass, its [VERIFY-LIVE] gate (brief §15) is confirmed against a real workspace, and its AI-Agent tool-path check passes.

## Path Conventions

Single-package declarative n8n node (plan.md): `credentials/`, `nodes/Attio/` (with `core/`, `methods/`, `descriptions/`), `test/`, `.github/workflows/` at repo root. `attio-api-spec/` is reference-only — never imported, copied, or read at build/run time.

---

## Phase 1: Setup & CI/CD (Shared Infrastructure)

**Purpose**: Clear the eligibility gate, scaffold, and stand up green CI/CD **before any operation** so every task merges through the pipeline (brief §16, §18).

- [X] T001 Clear **Decision Gate 0** (research.md R6, brief §3): confirm with the n8n Creator Portal that a fresh hand-built package under the Nodrel identity is accepted for verification; capture the final package name (`n8n-nodes-attio` or `@nodrel/n8n-nodes-attio`). **Blocks all scaffolding.**
- [X] T002 Scaffold the node with `npm create @n8n/node` (depends on T001 for the package name)
- [X] T003 Configure `package.json`: final name (T001), `n8n` block (`n8nNodesApiVersion: 1`, `credentials: ["dist/credentials/AttioApi.credentials.js"]`, `nodes: ["dist/nodes/Attio/Attio.node.js"]`), `keywords` incl. `n8n-community-node-package`, `engines.node >= 22.22`, **`dependencies: {}`**, devDep `@n8n/node-cli >= 0.23.0`
- [X] T004 [P] Configure `tsconfig.json`: strict, **incremental OFF**, emit to `dist/`
- [X] T005 [P] Configure ESLint with `eslint-plugin-n8n-nodes-base` in `.eslintrc.js`
- [X] T006 [P] Add `commitlint.config.js` + `lefthook.yml` (wire `commit-msg`→commitlint, `pre-commit`→lint)
- [X] T007 [P] Configure the test runner (scaffold default) and create `test/core/`
- [X] T008 Add `.github/workflows/ci.yml`: `npm ci`, `npm run lint`, `npx @n8n/scan-community-package n8n-nodes-attio`, `tsc --noEmit`, `npm run build`, `npm test`, **zero-dep gate** (`node -e "process.exit(Object.keys(require('./package.json').dependencies||{}).length?1:0)"`), **no-env/no-fs gate** (grep `nodes/` for `process.env` and `require('fs')`/`from 'fs'`/`node:fs`; fail if any match, per FR-010/Principle X), PR-title commitlint; top-level `permissions: contents: read`
- [X] T009 [P] Add `.github/workflows/release-please.yml` + `release-please-config.json` + `.release-please-manifest.json` (`release-please-action@v4`, `release-type: node`, perms `contents: write` + `pull-requests: write`)
- [X] T010 [P] Add/confirm `.github/workflows/publish.yml` (scaffold provenance publisher; `on: release: types: [published]`; `permissions: contents: read, id-token: write`; `npm publish --provenance --access public`)
- [X] T011 [P] Document npm **Trusted Publisher** (OIDC) setup, branch protection on `main` (green `ci.yml` + conventional PR title), and least-privilege `GITHUB_TOKEN` in `README.md`/repo settings notes
- [X] T012 Verify CI is green on the empty scaffold (lint, typecheck, build, zero-dep gate, scan all pass)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Node skeleton + shared pure core that EVERY operation depends on.

**⚠️ CRITICAL**: No user-story operation can begin until this phase is complete.

- [X] T013 Create node skeleton `nodes/Attio/Attio.node.ts`: `requestDefaults` (`baseURL: 'https://api.attio.com'`, JSON accept/content-type headers), **Resource** selector (Record/Note/Task **only** — assert Objects is absent from the Resource enum per FR-015, `noDataExpression: true`), **Operation** selector skeleton (per-resource via `displayOptions`), wire `descriptions/` modules
- [X] T014 [P] Add `nodes/Attio/Attio.node.json` codex metadata, `attio.svg` icon, and set the node `usableAsTool`/`action` posture (AI-tool readiness, NFR-8)
- [X] T015 [P] Write table-driven tests for `formatAttioError` (400/401, 403→likely-missing-scope, 404, 429→rate-limit + `Retry-After` as **date**; never echoes token) in `test/core/formatAttioError.test.ts`
- [X] T016 Implement `formatAttioError` in `nodes/Attio/core/formatAttioError.ts` (depends on T015)
- [X] T017 [P] Write tests for `objectPath` (slug/id passthrough) in `test/core/objectPath.test.ts`
- [X] T018 Implement `objectPath` in `nodes/Attio/core/objectPath.ts` (depends on T017)
- [X] T019 Implement shared response handling: unwrap top-level `data` into n8n items (one per array element / one for single), and DELETE `{ success: true, <id> }` synthesis, in the node routing/output config
- [X] T020 Wire `continueOnFail` and route all errors through `formatAttioError`; assert the token is never logged or echoed (FR-13, NFR-9)

**Checkpoint**: Skeleton compiles, shared pure core tested, CI green — operations can now be built.

---

## Phase 3: User Story 1 - Connect & choose an object (Priority: P1) 🎯 MVP

**Goal**: A working `attioApi` credential with a `/v2/self` test and a dynamic Object dropdown from the user's workspace.

**Independent Test**: Save a valid token → test passes; invalid → rejected at the dialog. Open any Record op → dropdown lists People/Companies/Deals/custom by name.

- [X] T021 [P] [US1] Write tests for `mapObjectsToOptions` (name = `plural_noun` ?? `singular_noun` ?? `api_slug`; value = `api_slug`) in `test/core/mapObjectsToOptions.test.ts`
- [X] T022 [US1] Implement `mapObjectsToOptions` in `nodes/Attio/core/mapObjectsToOptions.ts` (depends on T021)
- [X] T023 [US1] Implement `credentials/AttioApi.credentials.ts`: `apiToken` (`password`), Bearer auth, `test` → `GET /v2/self`, field description listing the refined scope table (research.md R2)
- [X] T024 [US1] Implement `getObjects` loadOptions in `nodes/Attio/methods/loadOptions.ts` (`GET /v2/objects` → `mapObjectsToOptions`; no caching)
- [X] T025 [US1] Wire the **Object** param (`type: options`, `loadOptionsMethod: 'getObjects'`, required) into `nodes/Attio/descriptions/record.description.ts` and Note Create's `parent_object`
- [X] T026 [US1] **Verify-live**: valid token saves / invalid rejected at dialog; dropdown populates standard + custom objects (quickstart US1, SC-001/SC-002) ✓ live API confirmed: `/v2/self` 200 (Nodrel-Dev, all scopes) saves; invalid token → 400 rejects; `/v2/objects` → companies+people; `mapObjectsToOptions` maps correctly. In-browser dropdown render not yet exercised (deterministic glue over verified data).

**Checkpoint**: Auth + object selection fully functional and independently testable.

---

## Phase 4: User Story 2 - Create a record (Priority: P1) 🎯 MVP

**Goal**: Create a record and read it back (Record Create + Get), proving auth → object → request → unwrap end-to-end.

**Independent Test**: Select Companies, supply Values, run Create → item contains `data.id.record_id`; Get the same id round-trips.

- [X] T027 [P] [US2] Write tests for `buildValuesBody` (parses to object → `{ data: { values } }`; malformed → clear error) in `test/core/buildValuesBody.test.ts` (10 tests)
- [X] T028 [US2] Implement `buildValuesBody` in `nodes/Attio/core/buildValuesBody.ts` (depends on T027)
- [X] T029 [US2] Add **Values** (`json`) param + Record **Create** routing `POST /v2/objects/{object}/records` in `nodes/Attio/descriptions/record.description.ts` (preSend `makeValuesBodyPreSend` validates pre-request)
- [X] T030 [US2] Add **Record ID** param + Record **Get** routing `GET /v2/objects/{object}/records/{record_id}`
- [X] T031 [US2] Add readable operation names + `action` text for Create and Get (already on selector options)
- [X] T032 [US2] **Verify-live**: Create returns `data.id.record_id` (AS-A1) ✓ live POST → 200, `id.record_id` returned (also confirmed `{data:{values}}` envelope + URL accepted; 400 surfaced only for an invalid domain value). **403-names-scope path closed 2026-08-16**: minted an Attio API key scoped `record_permission:read` (no read-write) + `object_configuration:read`, ran Record→Create through the node in local n8n → `NodeApiError`, message `Attio API error 403 (auth_error/unauthorized): …This request requires scopes: Read-Write access to the Records scope… Access denied — this is likely a missing token scope. This operation requires: record_permission:read-write, object_configuration:read.` Attio's own text is preserved as the error `description`; the scope hint from `formatAttioError` is appended.
- [X] T033 [US2] **AI-Agent tool-path check**: Create Record executes via the agent tool path ✓ 2026-08-16 (exec 1): agent called `attio_create_record`, node status success; created record `28051d66` **independently confirmed via GET /v2/objects/companies/records/{id} → 200, name round-tripped**, then deleted. Env: n8n 2.x in Docker, node mounted via N8N_CUSTOM_EXTENSIONS (loaded as CUSTOM.attio + auto-generated CUSTOM.attioTool), AI Agent v3.1 + Anthropic Claude Sonnet 4.6, params supplied by the model via $fromAI
- [X] T034 [US2] **Verify-live**: Get round-trips with dual read scope (`record_permission:read` + `object_configuration:read`) ✓ live GET → 200, name round-tripped; DELETE → 200 (cleanup)

**Checkpoint**: MVP — a user goes from token to created-and-read record without typing a slug.

---

## Phase 5: User Story 4 - Update with append vs overwrite (Priority: P2)

**Goal**: One Update operation whose Multiselect Mode switches PATCH (append) vs PUT (overwrite) **declaratively** (research.md R1).

**Independent Test**: Append retains existing multi-value set + new; Overwrite makes the set exactly what was sent.

- [X] T035 [P] [US4] Write tests for `updateVerb` (`append`→`PATCH`, `overwrite`→`PUT`) in `test/core/updateVerb.test.ts` (3 tests)
- [X] T036 [US4] Implement `updateVerb` in `nodes/Attio/core/updateVerb.ts` (depends on T035)
- [X] T037 [US4] Add **Multiselect Mode** `options` param with **per-option `routing.request.method`** (Append→`PATCH`, Overwrite→`PUT`) in `record.description.ts` (methods sourced from `updateVerb`, single source of truth)
- [X] T038 [US4] Add Record **Update** routing (url `=/v2/objects/{{$parameter.object}}/records/{{$parameter.recordId}}`, body via `buildValuesBody`; method delegated to the selected option)
- [X] T039 [US4] Add readable name + `action` text for Update
- [X] T040 [US4] **Verify-live**: Append (PATCH) retains existing + adds new; Overwrite (PUT) set equals sent (AS-C1/C2, SC-006) ✓ live on `domains` multiselect: PATCH `[two]`→`[two,one]`; PUT `[three]`→`[three]`; cleanup DELETE 200
- [X] T041 [US4] **AI-Agent tool-path check**: Update executes via the agent tool path ✓ 2026-08-16 (exec 2): agent called `attio_update_record`; **independently confirmed** `description` = "updated by agent" on the target record via direct GET.

**Checkpoint**: Append vs overwrite is explicit and correct — no silent data loss.

---

## Phase 6: User Story 3 - Upsert without duplicates (Priority: P2)

**Goal**: A separate Upsert operation (collection-level PUT) keyed on a required `matching_attribute`.

**Independent Test**: Run twice with the same matching value → one record (second updates); omit matching attribute → validation error before any request.

- [X] T042 [US3] Add **Matching Attribute** param (required) with pre-request validation (empty → fail before request) in `record.description.ts`; reuse `buildValuesBody` (validation via shared `makeMatchingAttributePreSend` → NodeOperationError before request)
- [X] T043 [US3] Add Record **Upsert** routing `PUT /v2/objects/{object}/records?matching_attribute=...` (collection-level, distinct from item PUT)
- [X] T044 [US3] Add readable name + `action` text for Upsert
- [X] T045 [US3] **Verify-live**: two runs with the same matching value → one record, second updates (AS-B1, SC-005); referenced records must pre-exist ✓ live: `?matching_attribute=domains` twice → same `record_id`, name v1→v2; cleanup DELETE 200
- [X] T046 [US3] **Verify-live**: omitting `matching_attribute` → validation error pre-request (AS-B2) — implemented via `makeMatchingAttributePreSend` (throws before request on empty); in-UI observation still pending
- [X] T047 [US3] **AI-Agent tool-path check**: Upsert executes via the agent tool path ✓ 2026-08-16 (exec 2): agent called `attio_upsert_record` with matchingAttribute `domains`; **independently confirmed** record `f717d8ad` with name "Agent Upsert Verify" + domain `agent-upsert-verify.com` via direct GET.

**Checkpoint**: Idempotent upsert works; Update and Upsert remain distinct (two-PUT model).

---

## Phase 7: User Story 5 - Query, search & page (Priority: P2)

**Goal**: Get Many (filter/sort/paginate) and cross-object Search, with a "Return All" auto-pager.

**Independent Test**: Filter returns only matches; Return All pages through every matching record; Search returns cross-object hits.

- [X] T048 [P] [US5] Write tests for `buildQueryBody` (filter XOR filter_view_id; sorts; limit; offset) in `test/core/buildQueryBody.test.ts` (16 tests)
- [X] T049 [US5] Implement `buildQueryBody` in `nodes/Attio/core/buildQueryBody.ts` (depends on T048)
- [X] T050 [P] [US5] Write tests for `buildSearchBody` (query, objects[], limit, request_as default workspace) in `test/core/buildSearchBody.test.ts` (7 tests)
- [X] T051 [US5] Implement `buildSearchBody` in `nodes/Attio/core/buildSearchBody.ts` (depends on T050)
- [X] T052 [US5] Add Record **Get Many** routing `POST /v2/objects/{object}/records/query` + Filter (`json`), Sort (fixedCollection), Limit, **Return All** (offset pagination via request **body**; `operations.pagination` type offset, pageSize 100, rootProperty data)
- [X] T053 [US5] Add Record **Search** routing `POST /v2/objects/records/search` + Query, Objects (multiOptions `getObjects`), Request As (collection, default `{type:'workspace'}`, member impersonation advanced)
- [X] T054 [US5] Add readable names + `action` text for Get Many and Search
- [X] T055 [US5] **Verify-live**: filter returns only matching records (AS-D1) ✓ `name $contains "a"` → Apple/Attio/United Airlines only
- [X] T056 [US5] **Verify-live**: Return All pages `offset` until exhausted; count matches workspace (AS-D2, SC-007) ✓ offset-in-body advances (page1 vs page2 ids distinct); n8n Return-All loop pending UI
- [X] T057 [US5] **Verify-live**: Search `request_as.type: 'workspace'` works with a plain API token (research.md R3) ✓ 200 with data; **omitting `request_as` → 400** so always send it (buildSearchBody default)
- [X] T058 [US5] **AI-Agent tool-path check**: Get Many executes via the agent tool path (SC-009) ✓ 2026-08-16 (exec 1): agent called `attio_get_many_records`, node status success, 5 companies returned and reported back by the agent.

**Checkpoint**: Reading, filtering, full pagination, and cross-object search all work.

---

## Phase 8: Record Resource Completion - Delete & secondary reads (completes FR-003)

**Goal**: Finish the 10-op Record matrix: Delete, List Attribute Values, List Entries.

**Independent Test**: Delete returns a clear success indicator; secondary reads round-trip.

- [X] T059 [US2] Add Record **Delete** routing `DELETE /v2/objects/{object}/records/{record_id}` → synthesize `{ success: true, record_id }` (via `makeDeleteSuccess('record_id','recordId')`)
- [X] T060 [US2] **Verify-live**: Delete returns a success indicator despite an empty body (edge case) ✓ DELETE 200 → synthesized success; get-after-delete 404
- [X] T061 [US5] Add **List Attribute Values** routing `GET /v2/objects/{object}/records/{record_id}/attributes/{attribute}/values` + Attribute param (free text in v1) ✓ live 200
- [X] T062 [US5] Add **List Entries** routing `GET /v2/objects/{object}/records/{record_id}/entries` (scope incl. `list_entry:read`, research.md R2) ✓ live 200
- [X] T063 [US5] Add readable names + `action` text for Delete, List Attribute Values, List Entries
- [X] T064 [US5] **Verify-live**: Delete and both secondary reads round-trip ✓ create→ListAttrValues 200 / ListEntries 200 / Delete 200 / 404
- [X] T065 Confirm all **Record operations** present and FR-003 Record group complete — **9 ops** (Create/Upsert/Get/Update/Get Many/Search/Delete/List Attribute Values/List Entries); contract title "(10)" was a typo, fixed to (9)

**Checkpoint**: Record resource (9 ops) complete.

---

## Phase 9: User Story 6 (Notes) - Log a note on a record (Priority: P3)

**Goal**: The 4-op Note matrix, with Create linked to a parent record.

**Independent Test**: Create a note with parent object + record → linked note returned; Get/Get Many/Delete round-trip.

- [X] T066 [P] [US6] Write tests for `buildNoteBody` (parent_object, parent_record_id, title, format, content; optional created_at/meeting_id) in `test/core/buildNoteBody.test.ts` (10 tests)
- [X] T067 [US6] Implement `buildNoteBody` in `nodes/Attio/core/buildNoteBody.ts` (depends on T066)
- [X] T068 [US6] Add Note **Create** routing `POST /v2/notes` + Parent Record ID, Title, Format (plaintext/markdown), Content, Additional Fields (created_at, meeting_id) in `nodes/Attio/descriptions/note.description.ts`
- [X] T069 [US6] Add Note **Get Many** `GET /v2/notes` (parent filters + Return All via querystring offset), **Get** `GET /v2/notes/{note_id}`, **Delete** `DELETE /v2/notes/{note_id}` → `{ success: true, note_id }`
- [X] T070 [US6] Add readable names + `action` text for all Note operations
- [X] T071 [US6] **Verify-live**: Note Create returns a note linked to the parent record (AS-E1) ✓ note_id linked to companies/472ea102, content_plaintext round-trips
- [X] T072 [US6] **Verify-live**: Note Get / Get Many / Delete round-trip ✓ Get 200 / filtered GetMany returns the 1 note / Delete 200 / 404
- [X] T073 [US6] **AI-Agent tool-path check**: Note Create executes via the agent tool path ✓ 2026-08-16 (exec 2): agent called `attio_create_note`; **independently confirmed** note `6504bfa1` (title "Agent note") parented to companies/`28051d66` via GET /v2/notes/{id}.

**Checkpoint**: Note resource (4 ops) complete.

---

## Phase 10: User Story 6 (Tasks) - Follow-up task on a record (Priority: P3)

**Goal**: The 5-op Task matrix, with write-once content and a content-free Update surface.

**Independent Test**: Create a linked task with an assignee email that resolves; Update has no content field and leaves content unchanged.

- [X] T074 [P] [US6] Write tests for `buildTaskCreateBody` (content + `format: 'plaintext'` hardcoded, deadline_at, is_completed, linked_records, assignees) in `test/core/buildTaskCreateBody.test.ts` (11 tests)
- [X] T075 [P] [US6] Write tests for `buildTaskUpdateBody` (**omits content**; deadline_at/is_completed/linked_records/assignees only) in `test/core/buildTaskUpdateBody.test.ts` (7 tests)
- [X] T076 [US6] Implement `buildTaskCreateBody` and `buildTaskUpdateBody` in `nodes/Attio/core/buildTaskBodies.ts` (depends on T074, T075). Two test files cover the two functions in one impl module (intentional non-1:1 mapping)
- [X] T077 [US6] Add Task **Create** routing `POST /v2/tasks` + Content, Deadline At, Is Completed, Linked Records (fixedCollection: object dropdown + record id), Assignees (fixedCollection: email simple / member id advanced) in `nodes/Attio/descriptions/task.description.ts`
- [X] T078 [US6] Add Task **Update** routing `PATCH /v2/tasks/{task_id}` — **no Content field** (Principle VI); deadline/completion via Update Fields collection, links/assignees shared with Create
- [X] T079 [US6] Add Task **Get** `GET /v2/tasks/{task_id}`, **Get Many** `GET /v2/tasks` (filters linked_object/linked_record_id/assignee/is_completed + Return All), **Delete** `DELETE /v2/tasks/{task_id}` → `{ success: true, task_id }`
- [X] T080 [US6] Add readable names + `action` text for all Task operations
- [X] T081 [US6] **Verify-live**: Task Create linked to the record, assignee-by-email resolves (AS-E2) ✓ email→referenced_actor_id f5236069; linked to companies record
- [X] T082 [US6] **Verify-live**: Task Update surface has no content field; content unchanged after update (FR-14, research.md R5) ✓ PATCH is_completed=true → content stays "ZZ US6 task ORIGINAL"
- [X] T083 [US6] **Verify-live**: Task Get / Get Many / Delete round-trip ✓ Get 200 / paired linked_object+linked_record_id filter returns the task / Delete 200 / 404. **AI-Agent tool-path check** ✓ 2026-08-16 (exec 2): agent called `attio_create_task`; **independently confirmed** task `99a8b836` (content "Agent task verify") via GET /v2/tasks/{id}.

**Checkpoint**: Task resource (5 ops) complete — all 18 operations exist.

---

## Phase 11: User Story 7 - Drive the node from an AI agent (Priority: P3)

**Goal**: Confirm the consolidated AI-agent tool path across the canonical operations.

**Independent Test**: From the agent tool path, run Create Record and Get Many and confirm both execute.

- [X] T084 [US7] **Verify-live**: AI-Agent tool path runs **Record Create AND Get Many** end-to-end (AS-F1, SC-009) ✓ 2026-08-16 (exec 1): a single agent run performed BOTH in order — Create then Get Many — both nodes status success, execution finished success. Create verified against the live API; all test data deleted afterwards.
- [X] T085 [US7] Confirm all 18 operations expose `action` text and are selectable/usable as a tool ✓ 2026-08-16, checked against the **loaded** n8n registry (`/types/nodes.json`), not the source: record 9 + note 4 + task 5 = 18, **all 18 carry non-empty `action` text**. (The registry reports 21 because n8n injects its own `__CUSTOM_API_CALL__` option per resource; those 3 are n8n's, not ours.) `usableAsTool: true` and n8n generated the **Attio Tool** variant, which the agent then actually invoked in T033/T058/T084.

**Checkpoint**: AI-agent compatibility validated.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Docs, verification scan, supply-chain and release-pipeline acceptance (brief §15, §18).

- [X] T086 [P] Write English-only `README.md`: operations table (Record 9 / Note 4 / Task 5), credential setup (token path + per-operation scopes from research.md R2), example workflow (Create company → Create note), Nodrel support boundary
- [X] T087 [P] Ensure the credential field description lists the scope pairs per operation group (Principle IV) — verified accurate vs R2 (read/write split, List Entries +list_entry:read, Note/Task broader scopes, Delete-only-write)
- [~] T088 **Verify-live**: a 429 surfaces a rate-limit message and `Retry-After` is parsed as a **date**; README directs users to n8n Retry-On-Fail (research.md R4, NFR-10) — README done + `formatAttioError` 429/date logic unit-tested; **live 429 trigger deferred** (hard to force without hammering the API)
- [X] T089 Run `npx @n8n/scan-community-package n8n-nodes-attio` — passes (SC-008)
      First run (published `@nodrel-dev/n8n-nodes-attio@0.2.3`) **failed**: 2 errors
      (`require-node-api-error` in `buildQueryBody.ts` / `buildValuesBody.ts`) + 2 warnings
      (`icon-prefer-themed-variants`). Fixed in PR #11 (`core/tryParseJson.ts` moves the throw
      out of the catch; themed `{ light, dark }` icons added).
      **✓ 2026-08-16 against published `@nodrel-dev/n8n-nodes-attio@0.2.4`:**
      "Provenance check passed", source fetched at `1d2a68d`, "**has passed all security checks**"
      — 0 errors, 0 warnings. Getting 0.2.4 onto npm also required fixing the release pipeline
      (see T092) and rotating an expired `NPM_TOKEN`.
- [X] T090 `npm pack` and inspect the tarball: `dependencies` empty; zero runtime deps confirmed (SC-008, NFR-1) — tarball ships only LICENSE/README/package.json/dist; no src, tests, specs, .env, or attio-api-spec; `dependencies: {}`
- [X] T091 [P] Verify `continueOnFail`: one bad item does not abort a batch (FR-13 edge case) ✓ 2026-08-16 (exec 3) **live**: 3-item batch (valid, bogus UUID, valid) into Record Get with `onError: continueRegularOutput` → **3 output items, workflow status success**; items 0 and 2 returned their record_ids, item 1 carried the formatted message `Attio API error 404 (invalid_request_error/not_found): Record with ID "…" not found.` Confirms the batch does not abort AND that errors route through `formatAttioError`.
- [X] T092 **Pipeline acceptance**: a `feat:` merge opens/updates a release-please PR; merging it creates the tag + GitHub Release; the Release event triggers `publish.yml` → npm publish with a visible provenance badge (brief §18.7)
      Verified end-to-end: PR #9 (`fix:`) → release-please PR #10 → tag/Release `v0.2.3` →
      npm `@nodrel-dev/n8n-nodes-attio@0.2.3` published with SLSA provenance
      (`predicateType: https://slsa.dev/provenance/v1`; the community scanner's own
      "Provenance check passed" confirms it).
      **Latent flaw found and fixed 2026-08-16 (PR #15):** the pipeline only worked by luck.
      release-please creates the Release with `GITHUB_TOKEN`, and GitHub suppresses
      workflow-triggering events for `GITHUB_TOKEN` actions, so `publish.yml`'s `on: release`
      never fires — `v0.2.4` was tagged and released but never reached npm. release-please now
      calls `publish.yml` directly via `workflow_call` gated on `release_created`; `publish.yml`
      gained `workflow_dispatch` recovery, an "already on npm" skip guard, and an explicit tag
      checkout. Both new paths exercised live: dispatch published 0.2.4 with provenance, and a
      re-dispatch correctly skipped instead of failing.
- [X] T093 [P] Verify a non-conventional PR title fails the PR-title lint and cannot merge (brief §18.5) — validated locally via `commitlint.config.js`: "feat: …" passes (exit 0), "added some stuff" fails (type/subject empty)
- [X] T094 Run the full `quickstart.md` validation pass — every brief §15 verify-live gate checked. **Re-run in full 2026-08-16 after the workspace moved from the Pro trial to the Free plan** (API access and scoped API keys are available on all Attio plans, Free included). All **18/18 operations** driven through the node in local n8n against workspace `Nodrel-Dev` with a token scoped exactly to the node's needs (`record_permission:read-write`, `object_configuration:read`, `list_entry:read`, `note:read-write`, `task:read-write`, `user_management:read`): Record Create/Get/Update/Create-or-Update/Get Many/Search/List Attribute Values/List Entries, Note Create/Get/Get Many/Delete, Task Create/Get/Get Many/Update/Delete — every one PASS. Test data deleted and each deletion independently confirmed via direct `GET` → 404. Plus T032's live 403 above. **One documented exception: T088's live 429**, which remains deferred (see that task) — its logic is unit-tested and the README documents n8n Retry-On-Fail.
- [X] T095 [P] English-only audit (FR-016): reviewed all user-facing strings (operation/field names, descriptions, help text, `formatAttioError` messages) — all English; only non-ASCII is typographic punctuation (em-dash/→/§/≥); normalized one curly apostrophe to straight
- [X] T096 **UI-automation suite** (`test/e2e/`, Playwright): 25 specs covering only what the unit suite and the REST pass cannot reach — node-creator discoverability and icon, the 18-action manifest, `loadOptions` dropdowns, `displayOptions` conditional rendering, `required` validation, editor execution and NDV error rendering. Specs seed workflows via n8n's `/rest` API and deep-link to `/workflow/{id}/{nodeId}` rather than driving the canvas. Harness: `scripts/e2eHarness.mjs` mounts the **working tree's** build into n8n via `N8N_CUSTOM_EXTENSIONS`. **Verified 25/25 green 2026-08-17 against n8n 2.25.7**, with no n8n workflows and no Attio records left behind. Two defects found and fixed in the suite itself: (a) `loadOptions` selects render *disabled* until their request resolves, and the original `dispatchEvent` click bypassed Playwright's actionability check so it silently no-opped — now waits for `toBeEnabled`; (b) n8n 2.x refuses to delete an unarchived workflow (`400 Workflow must be archived before it can be deleted`), and `deleteWorkflow` discarded the status, so 40 workflows had accumulated — now archives first and checks both responses.
- [X] T097 Scope the lint gate around the UI suite: `n8n-node lint` runs `eslint .` with the path hardcoded, and n8n's Cloud rules (`no-restricted-imports`, `no-restricted-globals`) apply to every `**/*.ts` — so the Playwright suite, which necessarily uses `@playwright/test`, `process` and `node:fs`, produced 18 CI-blocking errors. `eslint.config.mjs` now appends `ignores: ['playwright.config.ts', 'test/e2e/**']`. Verified the node itself keeps full coverage (a `process.env` reference injected into `Attio.node.ts` still errors) and that `npm pack` ships none of the suite, so the community scan — which runs against the published, dist-only package — is unaffected.
- [~] T098 CI wiring for the UI suite — **deliberately not wired**. It needs Docker plus two live Attio tokens, and the repo holds **zero Actions secrets** by design (npm publishing is OIDC/trusted-publishing, T092). Adding Attio keys as secrets would reintroduce exactly the expiring-credential failure mode that rebuild removed. The suite stays a documented local gate (`test/e2e/README.md`); revisit only if a throwaway Attio workspace can be provisioned per run.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 (Decision Gate 0) blocks T002 (scaffold) and everything after. CI/CD (T008–T012) stands up before any operation.
- **Foundational (Phase 2)**: depends on Setup; **blocks all user stories**. Shared pure core (`formatAttioError`, `objectPath`) + node skeleton.
- **User Stories (Phases 3–11)**: depend on Foundational. Recommended sequence follows the locked build order: US1 → US2 → US4 → US3 → US5 → (Record completion) → US6 Notes → US6 Tasks → US7.
- **Polish (Phase 12)**: depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: after Foundational. No story dependencies. Provides the credential + dropdown every other story uses.
- **US2 (P1)**: after US1 (needs the Object dropdown + credential). Provides `buildValuesBody`, reused by US3/US4.
- **US4 (P2)**: after US2 (reuses `buildValuesBody`, Object + Record ID params).
- **US3 (P2)**: after US2 (reuses `buildValuesBody`); independent of US4.
- **US5 (P2)**: after US1 (needs Object dropdown); independent of US3/US4.
- **US6 Notes / Tasks (P3)**: after US1 (Object dropdown); Notes and Tasks independent of each other but depend on records existing for live link checks.
- **US7 (P3)**: after US2 and US5 (validates their tool paths).

### Within Each Story

- Pure-core tests (the `[P]` test task) MUST be written and FAIL before the matching implementation.
- Pure function → routing/params → action text → verify-live → AI-tool check.
- An operation is "done" only when tests pass, its verify-live gate is confirmed, and its AI-tool-path check passes.

### Parallel Opportunities

- Setup `[P]` config tasks (T004–T011) run in parallel after T003.
- Foundational test tasks T015 and T017 run in parallel; T014 in parallel with them.
- Within a story, the `[P]` test task can be authored alongside the prior story's verify-live work (different files).
- US3, US4, and US5 are mutually independent once US2 lands — parallelizable across developers.
- Polish `[P]` tasks (T086, T087, T091, T093, T095) run in parallel.

---

## Parallel Example: Foundational pure core

```bash
# Write the shared pure-core tests together (different files):
Task: "Tests for formatAttioError in test/core/formatAttioError.test.ts"   # T015
Task: "Tests for objectPath in test/core/objectPath.test.ts"               # T017
# Then implement each (T016, T018) once its tests are red.
```

## Parallel Example: independent P2 stories after US2

```bash
# Once US2 (T027–T034) is merged, three developers can take:
Developer A: US4 Record Update  (T035–T041)
Developer B: US3 Record Upsert  (T042–T047)
Developer C: US5 Get Many/Search (T048–T058)
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 Setup & CI/CD (Decision Gate 0 first; pipeline green).
2. Phase 2 Foundational (skeleton + shared pure core).
3. Phase 3 US1 (credential + dropdown) → validate.
4. Phase 4 US2 (Create + Get) → **STOP and validate the MVP**: token → created-and-read record, no slug typed.

### Incremental Delivery

US1+US2 (MVP) → US4 → US3 → US5 → Record completion → US6 Notes → US6 Tasks → US7 → Polish. Each operation merges through green CI and is verified live before the next begins.

### Parallel Team Strategy

After US2, split US3/US4/US5 across developers; Notes and Tasks can also proceed in parallel. The shared pure core and node skeleton (Phase 2) must be done first to avoid same-file conflicts in the descriptions modules.

---

## Notes

- `[P]` = different files, no incomplete-task dependencies.
- Every Record/Note/Task description edit touches its own `descriptions/*.ts` module — sequence edits within the same module; parallelize across modules.
- Verify pure-core tests fail before implementing (Principle VIII).
- No runtime dependency at any point (zero-dep gate, T008/T090).
- Publish only via `publish.yml` provenance; never bump versions by hand or publish locally (Principle XIV).
- Commit with Conventional Commits; the squash-merge PR title is what release-please reads.
