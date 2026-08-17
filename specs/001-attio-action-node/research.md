# Phase 0 Research: Attio Action Node

All NEEDS CLARIFICATION items for the plan are resolved below. Locked decisions (brief §12) are not reopened. Items marked **[VERIFY-LIVE]** remain gates to confirm against a real workspace during implementation (brief §15) but their *plan-time* design question is resolved here.

---

## R1. Decision 8 — Can declarative routing switch PATCH vs PUT for Record Update from a parameter? (the one OPEN mechanism)

- **Decision**: **Yes — purely declarative.** No programmatic `execute` is required for Record Update (or anywhere else). Implement the verb switch with **per-option `routing`** on the "Multiselect Mode" `options` parameter.
- **Rationale**: Verified against the installed n8n-core `routing-node.js`. For `type: 'options'` parameters, n8n finds the selected option and calls `getRequestOptionsFromParameters` on that individual option object, then `mergeOptions` (lodash `merge`) deep-merges its `routing.request` into the accumulated request. `INodePropertyOptions` carries an optional `routing?: INodePropertyRouting`. Therefore an option-level `routing.request.method` is applied when that option is selected. (A secondary mechanism — an `=`-prefixed expression in `routing.request.method`, e.g. `={{ $parameter.multiselectMode === 'overwrite' ? 'PUT' : 'PATCH' }}` — also works, because every key under `routing.request` is run through the expression resolver; but per-option routing is structurally cleaner and is the chosen approach.)
- **Chosen pattern**:
  ```ts
  {
    displayName: 'Multiselect Mode',
    name: 'multiselectMode',
    type: 'options',
    default: 'append',
    description: 'How to apply multi-value attributes',
    displayOptions: { show: { resource: ['record'], operation: ['update'] } },
    options: [
      { name: 'Append', value: 'append',
        description: 'Add to existing multiselect values (PATCH)',
        routing: { request: { method: 'PATCH' } } },
      { name: 'Overwrite', value: 'overwrite',
        description: 'Replace the entire multiselect set (PUT)',
        routing: { request: { method: 'PUT' } } },
    ],
  }
  ```
  The Update operation's own routing sets the URL (`=/v2/objects/{{$parameter.object}}/records/{{$parameter.recordId}}`) and the body; the method is delegated to the selected option.
- **Pure-core note**: `updateVerb(mode)` (brief §9) is still implemented and unit-tested as the single source of truth for the mapping and to document intent, even though routing applies the verb declaratively.
- **Alternatives considered**: (a) Thin programmatic `execute` for Update only — rejected; unnecessary given declarative support, and it would erode the declarative posture (Principle II). (b) Two separate user-facing operations (Append / Overwrite) — rejected; brief §5.2 locks the UI shape as one Update op with a Multiselect Mode selector.
- **Status**: Resolved. (UI shape was already [LOCKED]; mechanism is now closed.)

---

## R2. Per-operation scope blocks — verified against the canonical spec, refining brief §4.3

Extracted the `security` block for all 21 endpoints from `attio-api-spec/openapi.json` (plan-time read only; never bundled). Findings confirm brief §4.3 for Records and **refine it** for List Entries, Notes, and Tasks — these need more scopes than the brief's table listed.

| Operation | Required scopes (from spec) |
|-----------|------------------------------|
| Record Create / Upsert / Update (PATCH+PUT) / Delete | `record_permission:read-write` + `object_configuration:read` |
| Record Get / Get Many / Search / List Attribute Values | `record_permission:read` + `object_configuration:read` |
| Record List Entries | `record_permission:read` + `object_configuration:read` + **`list_entry:read`** |
| Object dropdown (`GET /v2/objects`) | `object_configuration:read` |
| Note Create | `note:read-write` + **`object_configuration:read`** + **`record_permission:read`** |
| Note Get / Get Many | `note:read` + **`object_configuration:read`** + **`record_permission:read`** |
| Note Delete | `note:read-write` (only) |
| Task Create / Update | `task:read-write` + **`object_configuration:read`** + **`record_permission:read`** + **`user_management:read`** |
| Task Get / Get Many | `task:read` + **`object_configuration:read`** + **`record_permission:read`** + **`user_management:read`** |
| Task Delete | `task:read-write` (only) |
| Credential test (`GET /v2/self`) | none (any valid token passes) |

- **Decision**: Document the **refined** scope table (above) in the credential field description and README, not the narrower brief §4.3 table. The dual-scope read footgun generalizes: Notes and Tasks also fail without `object_configuration:read` + `record_permission:read`, and Tasks additionally need `user_management:read` (assignee resolution). Note/Task **Delete** uniquely need only the resource write scope.
- **Rationale**: `/v2/self` passes for any valid token, so every missing-scope case 403s at runtime; the README must list the true scope set so users provision tokens correctly the first time (Principle IV).
- **[VERIFY-LIVE]**: Confirm each pairing live, especially the broader Note/Task requirements and the Delete-only-write asymmetry, before marking those operations done (brief §4.3, §15).

---

## R3. `request_as` on Search with a plain API token — [VERIFY-LIVE]

- **Decision**: Default `request_as` to `{ type: 'workspace' }` and send it explicitly; expose `workspace-member` impersonation (by `workspace_member_id` or `email_address`) only as an advanced field.
- **Rationale**: `workspace` is the natural permission context for a workspace-scoped token (brief §5.5). Member impersonation may require elevated permission the plain token lacks.
- **[VERIFY-LIVE]**: Confirm a plain API token can run Search with `request_as.type: 'workspace'`; record whether omitting `request_as` is equivalent (brief §15).

---

## R4. 429 rate limiting and `Retry-After` parsing — [VERIFY-LIVE]

- **Decision**: `formatAttioError` detects 429, surfaces the envelope's `message`/`code` (`rate_limit_error` / `rate_limit_exceeded`), states it is rate limiting, and reads `Retry-After` in **either** RFC 9110 §10.2.3 form — **delta-seconds or an HTTP date** — testing for a bare integer first. README directs users to n8n's built-in Retry-On-Fail for resilience (declarative nodes cannot implement custom backoff).
- **Rationale**: Brief §7.1 + §13 asserted `Retry-After` is *always* a date; heavy `/records/query` calls can 429 on score-based complexity, not just request rate. Misreading the header yields nonsense waits in **both** directions.
- **[VERIFY-LIVE]**: ✅ **Closed 2026-08-17 (T088) — the brief's premise was wrong.** Live 429s show Attio sends **both** forms: `GET /v2/self` → `Mon, 17 Aug 2026 14:30:00 GMT`; the `POST /v2/objects/{object}/records/query` concurrency limiter → **`9`**. Date-parsing first was an active bug, because `new Date('9')` is a valid Date — the seconds form rendered as `2001-09-01T00:00:00.000Z` (and `0` → `2000-01-01`). Rate limits are **per endpoint**: `/v2/self` exhausts cheaply and holds for minutes, while the records-query limiter needs ~100+ concurrent requests and decays in 1–2s.

---

## R5. Task content immutability — [VERIFY-LIVE]

- **Decision**: Task Create accepts `content` (required) with `format` hardcoded to `plaintext` (no selector). Task Update (`PATCH /v2/tasks/{task_id}`) exposes only `deadline_at`, `is_completed`, `linked_records`, `assignees` — **no content field**.
- **Rationale**: The PATCH body has no `content`; offering the field would mislead users (Principle VI, brief §5.4/§5.10, locked).
- **[VERIFY-LIVE]**: Confirm content is unchanged after an Update and that no content field is present (brief §15).

---

## R6. Decision Gate 0 — fresh-package eligibility — [VERIFY-LIVE]

- **Decision**: Confirm with the n8n Creator Portal, **before scaffolding**, that a fresh hand-built package under the Nodrel identity is accepted for verification given the existing thin auto-generated `n8n-nodes-attio`, rather than a PR being required. If the Portal mandates a scoped name, capture `@nodrel/n8n-nodes-attio` before scaffolding (it is baked into `package.json`, the npm Trusted Publisher config, and credential/node type IDs).
- **Rationale**: The package name is foundational and expensive to change post-scaffold (Principle XIII, brief §3).
- **[VERIFY-LIVE]**: Blocking gate; the scaffolding task depends on it.

---

## R7. `getObjects` loadOptions implementation

- **Decision**: A small programmatic `loadOptions` method `getObjects` calls `GET /v2/objects` (via `this.helpers.httpRequestWithAuthentication` against the `attioApi` credential) and maps each element with `mapObjectsToOptions`: option **name** = `plural_noun` ?? `singular_noun` ?? `api_slug`; option **value** = `api_slug`. No caching across executions (runs at design time).
- **Rationale**: Brief §6/§9/§10.1. Programmatic loadOptions is explicitly sanctioned and does not count as a runtime dependency (Principle II/XI).
- **Alternatives considered**: Routing `postReceive` mapping — rejected for clarity; the programmatic function is simpler to test (`mapObjectsToOptions` is pure and unit-tested separately).

---

## R8. Response unwrapping and "Return All" pagination

- **Decision**: All success responses unwrap the top-level `data` key — one n8n item per array element for list ops, one item for single-object ops — via routing `output.postReceive` (`rootProperty: 'data'` / item-splitting). DELETE returns no meaningful body; synthesize `{ success: true, <id> }`. "Return All" loops on `offset` (request **body** for `/records/query`; query **string** for `/notes` and `/tasks`) until a short page returns; when off, honor the explicit `limit`.
- **Rationale**: Brief §5/§10.3, FR-11. Declarative pagination uses n8n's routing pagination for offset-based paging where expressible; the offset-loop semantics differ between body-paged records and querystring-paged notes/tasks, so each list op configures its own pagination.
- **[VERIFY-LIVE]**: "Return All" count matches workspace matching records with no manual paging (brief §15, SC-007).

---

## R9. Toolchain, test runner, and CI specifics

- **Decision**: Scaffold via `npm create @n8n/node`; `@n8n/node-cli` **>= 0.23.0** devDependency (required for the provenance publish flow); Node **>= 22.22**; TypeScript strict with **incremental OFF**. Test runner: use whatever the n8n-node CLI scaffold ships (Jest in current scaffolds); pure-core tests are plain TS with no n8n imports, so the runner choice is non-binding. `release-please-action@v4` with `release-type: node`; two-workflow split (`release-please.yml` + scaffold `publish.yml`); `ci.yml` gates per brief §18.4 incl. the zero-dep script (`node -e "process.exit(Object.keys(require('./package.json').dependencies||{}).length?1:0)"`) and PR-title commitlint. lefthook wires `commit-msg`→commitlint and `pre-commit`→lint locally.
- **Rationale**: Matches the locked Nodrel toolchain (brief §16/§18). **Correction 2026-08-16 (as-built):** the original rationale — inheriting `publish.yml` as the Trusted-Publisher workflow name — is invalid. npm authorises the *entry-point* workflow of a run, not the reusable workflow that contains `npm publish`, so the registered workflow is **`release-please.yml`**; `publish.yml` is `workflow_call`-only.
- **Open (non-blocking)**: Initial version / 1.0.0 cut — verification submission is the natural 1.0.0 trigger; start pre-1.0 via `.release-please-manifest.json`. Decided at release time, not a code gate.
- **[VERIFY-LIVE]** ✓ **2026-08-16**: OIDC trusted publishing works with no stored `NPM_TOKEN` (brief §18.7). 0.2.6 published token-free, provenance signed to the Sigstore transparency log; the `NPM_TOKEN` secret has been deleted and the repo now has zero Actions secrets. Requires npm >= 11.5.1 and `id-token: write` on both parent and child workflow.

---

## Summary of resolutions

| Item | Status |
|------|--------|
| R1 Update verb switch (decision 8) | **Resolved — declarative per-option routing; no `execute`** |
| R2 Scope blocks | Resolved (refined beyond brief §4.3); live-confirm pairings |
| R3 `request_as` with plain token | Design resolved; [VERIFY-LIVE] |
| R4 429 / `Retry-After` seconds-or-date | Resolved + verified live 2026-08-17 (T088); the date-only premise was wrong |
| R5 Task content write-once | Resolved (locked); [VERIFY-LIVE] |
| R6 Decision Gate 0 eligibility | Process resolved; [VERIFY-LIVE], blocks scaffolding |
| R7 `getObjects` loadOptions | Resolved |
| R8 Unwrap + Return All pagination | Resolved; [VERIFY-LIVE] count |
| R9 Toolchain / CI / release | Resolved (locked); initial version open at release time |
