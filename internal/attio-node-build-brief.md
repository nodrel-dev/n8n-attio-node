# n8n-nodes-attio: Verified Community Node Build Brief

**Package:** `n8n-nodes-attio` (Nodrel)

**Type:** Action node (no trigger in v1)

**Status:** v1 scope locked. Ready for Spec Kit.

**API:** Attio REST API v2.0.0, OpenAPI 3.1.0, base `https://api.attio.com`

**Source of truth:** `attio-api-spec/openapi.json` (canonical, pulled from `https://api.attio.com/openapi/api` on 2026-06-21). 45 paths.

---

## 0. How to read this brief

This is the single source of requirements. Commit it in the repo (for example `internal/attio-node-build-brief.md`), then drive Spec Kit from Appendix A. Every Spec Kit argument points back here rather than restating it, so requirements never live in two places.

Two markers are used throughout:

- **[LOCKED]** is a decision that is closed. Do not reopen it in `/speckit.clarify`.
- **[VERIFY-LIVE]** is a claim taken from the spec or docs that must be confirmed against the running API before the related operation is marked done.

Reference docs are linked inline. The two that matter most:

- Attio REST API reference: https://docs.attio.com/rest-api/endpoint-reference
- n8n community node verification guidelines: https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/

---

## 1. Context and problem statement

Attio is an AI-native CRM with a flexible, Notion-like data model. Its REST API is well documented and permissive for third-party integration, but the n8n community has no verified node.

An unverified node already exists: `n8n-nodes-attio` v0.6.0 by `itsjustanks`. It has one runtime dependency, `@devlikeapro/n8n-openapi-node`, which auto-generates the entire UI from a bundled `openapi.json` at build time. That single dependency is what blocks verification, because verified community nodes are not allowed any run-time dependencies (https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/).

Consequences of the auto-generated approach in the existing node:

- Operation names are raw and technical, for example `POST -v2-objects--object--records-query`, not human-readable actions.

- No credential test, so a bad token fails silently at runtime instead of at credential save.

- No field validation and no `loadOptions`, so the dynamic object selector (People, Companies, Deals, custom) is a free-text string the user must know by slug.

- No trigger node.

- Cannot be installed on n8n Cloud, because Cloud only surfaces verified nodes (https://docs.n8n.io/integrations/community-nodes/installation/verified-install/).

The path to a verified node is to remove the runtime dependency entirely and hand-build a declarative-style node with a credential test, readable operations, and a dynamic object dropdown. That is what this brief specifies.

**Demand signal:** three Attio threads on the n8n community forum spanning 2021 to 2025, roughly 3,036 combined views, with no verified node filling the gap.

**Terms:** Attio's Developer Terms (February 2026) restrict only the "App Marketplace" (defined as a repository owned or controlled by Attio, that is `build.attio.com`). npm and the n8n registry are not covered. "API Apps" using the REST API need no marketplace approval. There is no carrier-style distribution gate. [LOCKED]

---

## 2. Scope and operations (v1)

**v1 is an action node covering three resources: Records, Notes, Tasks.** [LOCKED]

No trigger node in v1. Webhooks (`by-resource/webhooks.json`) drive the v2 trigger node. Lists and Entries are v2. [LOCKED]

The Objects resource is **not** a user-facing resource. `GET /v2/objects` exists solely to back the dynamic object dropdown via a `loadOptionsMethod`. [LOCKED]

### 2.1 Operation matrix

| Resource | Operation | Method + Path | Notes |
|----------|-----------|---------------|-------|
| Record | Create | `POST /v2/objects/{object}/records` | Body `data.values` |
| Record | Upsert | `PUT /v2/objects/{object}/records?matching_attribute=...` | Collection-level PUT, requires `matching_attribute` |
| Record | Get | `GET /v2/objects/{object}/records/{record_id}` | Needs dual read scope (see 4) |
| Record | Update | `PATCH` or `PUT /v2/objects/{object}/records/{record_id}` | One UI op; multiselect mode switches verb (see 5.2) |
| Record | Get Many | `POST /v2/objects/{object}/records/query` | Filter, sort, paginate |
| Record | Search | `POST /v2/objects/records/search` | Cross-object free-text search |
| Record | Delete | `DELETE /v2/objects/{object}/records/{record_id}` | |
| Record | List Attribute Values | `GET /v2/objects/{object}/records/{record_id}/attributes/{attribute}/values` | Secondary read |
| Record | List Entries | `GET /v2/objects/{object}/records/{record_id}/entries` | Secondary read (entries on parent record) |
| Note | Create | `POST /v2/notes` | |
| Note | Get | `GET /v2/notes/{note_id}` | |
| Note | Get Many | `GET /v2/notes` | Filter by parent |
| Note | Delete | `DELETE /v2/notes/{note_id}` | |
| Task | Create | `POST /v2/tasks` | |
| Task | Get | `GET /v2/tasks/{task_id}` | |
| Task | Get Many | `GET /v2/tasks` | Filter by linked record, assignee, completion |
| Task | Update | `PATCH /v2/tasks/{task_id}` | Content is **not** updatable (see 5.4) |
| Task | Delete | `DELETE /v2/tasks/{task_id}` | |

That is **9** Record operations, 4 Note operations, 5 Task operations — **18 total**. The matrix is the authoritative operation list. [LOCKED]

> **Corrected 2026-08-16.** This line previously read "10 Record operations" (and 19 total). The table above has always listed 9 Record ops; the count was a typo that propagated into spec.md, plan.md, tasks.md and the contracts README. Verified against the built node loaded in n8n: Record 9 + Note 4 + Task 5 = 18, all carrying `action` text.

---

## 3. Verification eligibility (must resolve before build)

n8n's verification guidelines state: a node "MUST not be an existing node. If your node is an iteration on an existing node, create a pull request instead." (https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/)

This is the one open tension. The existing `n8n-nodes-attio` already occupies the obvious package name and integrates the same service.

**The case that a fresh hand-built package is the correct path, not a PR:**

- The existing package is published by a different author under a different identity. A pull request to verification is not a mechanism that exists for taking over another author's npm package under Nodrel's name.

- The existing package cannot be made verifiable in place. Its core design (auto-generation from a bundled spec via `@devlikeapro/n8n-openapi-node`) is the disqualifying runtime dependency. Removing it is not an iteration, it is a full rebuild with a different architecture, different operations, a credential test, and a dynamic dropdown.

- "Each package should integrate exactly one third-party service" is satisfied, and the guideline's PR path is aimed at improving an existing maintained node, not at superseding an abandoned unverifiable one.

**Action (gating):** Before any build work, confirm with the n8n Creator Portal that a fresh, hand-built package under the Nodrel identity is accepted for verification given the thin auto-generated node already exists, rather than a PR being required. Treat this as Decision Gate 0. If the Portal requires a different package name or scope (for example `@nodrel/n8n-nodes-attio`), capture that before scaffolding, because the package name is baked into `package.json`, the npm Trusted Publisher config, and the credential and node type IDs. [VERIFY-LIVE]

The Creator Portal and verification questions route through the n8n community forum and the verification guidelines page above. The forum has live threads where n8n staff (for example the `krisn0x` handle) respond to verification eligibility questions.

---

## 4. Auth contract

**v1 auth is API token only (Bearer).** OAuth2 is deferred to v1.1. [LOCKED]

The user generates a token in Attio at **Workspace Settings > Developers**, sets scopes per resource, and pastes it into the n8n credential. Tokens are workspace-scoped.

### 4.1 Credential definition

A single credential type, `attioApi`, with one secret field:

```ts
import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class AttioApi implements ICredentialType {
  name = 'attioApi';
  displayName = 'Attio API';
  documentationUrl = 'https://docs.attio.com/rest-api/how-to/get-started';
  properties: INodeProperties[] = [
    {
      displayName: 'API Token',
      name: 'apiToken',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
  ];
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiToken}}',
      },
    },
  };
  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://api.attio.com',
      url: '/v2/self',
    },
  };
}
```

Pattern source: n8n credentials reference (https://docs.n8n.io/integrations/creating-nodes/build/reference/credentials-files/) and the declarative-style tutorial credential (https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/).

### 4.2 Credential test endpoint

`GET /v2/self` ("Identify") returns a token-introspection object. A valid token returns `{ active: true, scope, sub (workspace_id), ... }`. An invalid token returns `{ active: false }` or a 401.

The credential test confirms the token is valid. It does **not** confirm the token carries the scopes a given operation needs, because `/v2/self` works for any valid token regardless of scope. [VERIFY-LIVE]

### 4.3 Scope footgun (document prominently)

Reading a record requires **both** the `object_configuration:read` and `record_permission:read` scopes. This is confirmed in the spec: `GET /v2/objects/{object}/records/{record_id}` declares `security: oauth2: [record_permission:read, object_configuration:read]`.

A token with only `record_permission:read` will return 403 on record reads. The credential test passes (token is valid) but the operation fails at runtime. The node must surface Attio's scope error message verbatim so the user knows which scope is missing (see 7). The credential field description and README must list the scope pairs per operation.

Minimum scopes per v1 operation group:

| Operation group | Required scopes |
|-----------------|-----------------|
| Record reads (Get, Get Many, Search, List Attribute Values, List Entries) | `record_permission:read` + `object_configuration:read` |
| Record writes (Create, Upsert, Update, Delete) | `record_permission:read-write` + `object_configuration:read` |
| Object dropdown (`GET /v2/objects`) | `object_configuration:read` |
| Note reads / writes | `note:read` / `note:read-write` |
| Task reads / writes | `task:read` / `task:read-write` |

Confirm each pairing against the per-operation `security` blocks in the canonical spec during the plan phase. [VERIFY-LIVE]

---

## 5. Per-operation contracts and JSON paths

All request bodies are `application/json`. All successful responses wrap payload in a top-level `data` key (single object for item operations, array for list operations). The node should return `data` unwrapped into n8n items: one item per array element for list operations, one item for single-object operations.

### 5.1 Record: Create

`POST /v2/objects/{object}/records`

Path param: `object` (slug or object_id), from the dynamic dropdown.

Body:

```json
{ "data": { "values": { /* attribute slug -> value(s) */ } } }
```

`values` is a freeform map keyed by attribute slug. Values are arrays of typed value objects (Attio attributes are multi-value by design). See the attribute-types guide: https://docs.attio.com/docs/attribute-types.

**v1 models `values` as a raw JSON field.** A typed per-attribute form requires a second `loadOptions` against `/v2/objects/{object}/attributes` and is deferred to v1.1. This is a deliberate v1 simplification, flagged so the spec does not treat it as a gap. [LOCKED]

### 5.2 Record: Update (PATCH append vs PUT overwrite)

This is the single most important modeling decision in the node.

Attio splits record update into two HTTP verbs against the same item path:

- `PATCH /v2/objects/{object}/records/{record_id}` appends to multiselect attributes (additive).

- `PUT /v2/objects/{object}/records/{record_id}` overwrites multiselect attributes (replaces the set).

Both take the same body shape: `{ "data": { "values": { ... } } }`.

**Model as one user-facing Update operation with a "Multiselect Mode" selector:**

- `Append` (default) routes to `PATCH`.

- `Overwrite` routes to `PUT`.

In declarative routing this is expressed by switching `routing.request.method` on the parameter value. If declarative routing cannot cleanly switch the verb from a parameter, fall back to a thin programmatic `execute` for the Update operation only. Decide this at plan time; do not over-engineer. [LOCKED on UI shape, OPEN on routing mechanism]

### 5.3 Record: Upsert

`PUT /v2/objects/{object}/records?matching_attribute=...`

This is a **collection-level** PUT (no `record_id`), distinct from the item-level PUT in 5.2.

Query param `matching_attribute` is **required**: the attribute slug used to find an existing record to update, or create if none matches.

Body: `{ "data": { "values": { ... } } }` (same shape as Create).

Model Upsert as its own operation, not a flavor of Update, because the path, the required `matching_attribute`, and the create-or-update semantics differ. [LOCKED]

Caution to document: Attio does not auto-create referenced records. If `values` references another record that does not yet exist, the upsert fails. Order writes so referenced records exist first.

### 5.4 Record: Get Many (query)

`POST /v2/objects/{object}/records/query`

Body (all optional):

```json
{
  "filter": { },
  "filter_view_id": "string",
  "sorts": [ { "direction": "asc|desc", "attribute": "string", "field": "string" } ],
  "limit": 0,
  "offset": 0
}
```

`filter` is a freeform object; `filter` and `filter_view_id` are mutually exclusive. Full filtering and sorting grammar: https://docs.attio.com/rest-api/guides/filtering-and-sorting.

v1 exposes `filter` as a raw JSON field, plus discrete `limit` / `offset` fields and a simple sort builder (attribute + direction). Add a "Return All" toggle that auto-paginates via `offset` until the page is short, following the standard n8n pagination pattern. [LOCKED]

### 5.5 Record: Search

`POST /v2/objects/records/search`

Body:

```json
{
  "query": "string (required)",
  "objects": ["string (required, one or more object slugs)"],
  "limit": 0,
  "request_as": { "type": "workspace" }
}
```

`request_as` selects the permission context. Options (anyOf): `{ type: "workspace" }`, `{ type: "workspace-member", workspace_member_id }`, or `{ type: "workspace-member", email_address }`. Default to `{ type: "workspace" }`; expose member impersonation as an advanced field. [VERIFY-LIVE on which `request_as` variant a plain API token may use.]

`objects` is a multi-select backed by the same object `loadOptions`.

### 5.6 Record: Get, Delete, List Attribute Values, List Entries

- `GET /v2/objects/{object}/records/{record_id}` returns `{ data: { ... } }`.

- `DELETE /v2/objects/{object}/records/{record_id}` returns success with no meaningful body. Return `{ success: true, record_id }`.

- `GET /v2/objects/{object}/records/{record_id}/attributes/{attribute}/values` returns historical values for one attribute. `attribute` is a string param (free text in v1, dropdown in v1.1).

- `GET /v2/objects/{object}/records/{record_id}/entries` returns list entries that reference this record.

### 5.7 Note: Create

`POST /v2/notes`

Body:

```json
{
  "data": {
    "parent_object": "string (required, object slug)",
    "parent_record_id": "string (required, uuid)",
    "title": "string (required)",
    "format": "plaintext | markdown (required)",
    "content": "string (required)",
    "created_at": "string (optional, ISO 8601)",
    "meeting_id": "string | null (optional)"
  }
}
```

`parent_object` reuses the object dropdown. Response includes `content_plaintext` and `content_markdown`, the note `id.note_id`, and `created_by_actor`.

### 5.8 Note: Get Many, Get, Delete

- `GET /v2/notes` query params: `limit`, `offset`, `parent_object`, `parent_record_id`. All optional. Expose parent filters plus a "Return All" toggle.

- `GET /v2/notes/{note_id}` returns one note.

- `DELETE /v2/notes/{note_id}` returns success. Return `{ success: true, note_id }`.

### 5.9 Task: Create

`POST /v2/tasks`

Body:

```json
{
  "data": {
    "content": "string (required)",
    "format": "plaintext (required, only value)",
    "deadline_at": "string | null (required)",
    "is_completed": "boolean (required)",
    "linked_records": [ /* see below */ ],
    "assignees": [ /* see below */ ]
  }
}
```

`format` only accepts `plaintext`. Hardcode it; do not expose a selector. [LOCKED]

`linked_records` (anyOf): an array of record id strings, or an array of `{ target_object, target_record_id }` or `{ target_object, [matching_attribute_slug]: value }`. v1 exposes the `{ target_object, target_record_id }` shape as a fixedCollection (object dropdown + record id).

`assignees` (anyOf): `{ referenced_actor_type: "workspace-member", referenced_actor_id }` or `{ workspace_member_email_address }`. v1 exposes assignee by email as the simple path, member id as advanced.

### 5.10 Task: Update

`PATCH /v2/tasks/{task_id}`

Body (all optional): `deadline_at`, `is_completed`, `linked_records`, `assignees`.

**`content` is not present in the PATCH body and cannot be updated via the API.** The UI must not offer a content field on Task Update. Document this as a known Attio limitation. [LOCKED] [VERIFY-LIVE]

### 5.11 Task: Get Many, Get, Delete

- `GET /v2/tasks` query params: `limit`, `offset`, `sort`, `linked_object`, `linked_record_id`, `assignee`, `is_completed`. Expose linked-record and assignee filters, an `is_completed` boolean, and a "Return All" toggle.

- `GET /v2/tasks/{task_id}` returns one task.

- `DELETE /v2/tasks/{task_id}` returns success. Return `{ success: true, task_id }`.

---

## 6. Enum and dynamic-value reference

| Field | Values | Source |
|-------|--------|--------|
| Object selector | Dynamic, from `GET /v2/objects` | `loadOptions` (see 10) |
| Note `format` | `plaintext`, `markdown` | static options |
| Task `format` | `plaintext` only | hardcoded, no UI |
| Sort `direction` | `asc`, `desc` | static options |
| `request_as.type` (Search) | `workspace`, `workspace-member` | static, default `workspace` |
| Assignee `referenced_actor_type` | `workspace-member` | static |
| `created_by_actor.type` (response) | `api-token`, `workspace-member`, `system`, `app` | response only |

Object dropdown mapping: from each `GET /v2/objects` array element, map `plural_noun` (fallback `singular_noun`, fallback `api_slug`) to the option **name**, and `api_slug` to the option **value**. The API accepts either the slug or the `object_id` in the `{object}` path param; the slug is more readable.

---

## 7. Error model

Attio returns a consistent error envelope on failure:

```json
{
  "status_code": 0,
  "type": "string",
  "code": "string",
  "message": "string"
}
```

Confirmed shape on `POST /v2/objects/{object}/records`: 400 (Bad Request) and 404 (Not Found) both use this envelope. 401 (invalid token) and 429 (rate limit) follow the same shape.

### 7.1 Rate limiting

Source: https://docs.attio.com/rest-api/guides/rate-limiting

- Rate-limited responses always return HTTP 429 with a `Retry-After` header. The `Retry-After` value is a **date** (when the limit resets, usually the next clock second), not a number of seconds.

- The 429 body is `{ "status_code": 429, "type": "rate_limit_error", "code": "rate_limit_exceeded", "message": "..." }`.

- Complex query endpoints (`/records/query` with heavy filters and sorts) are also subject to **score-based** limiting using a sliding 10-second window. A 429 on a list query can look identical to a request-rate 429 but has a different cause.

- Third-party reporting (Stacksync, 2026) cites roughly 100 read requests/second and 25 write requests/second, but treat exact numbers as unverified; the authoritative behavior is "429 + Retry-After, retry after the reset." [VERIFY-LIVE]

### 7.2 Node error handling

- Surface Attio's `message` and `code` verbatim in the n8n error so scope failures (403) and validation failures (400) are actionable.

- Declarative nodes cannot easily implement custom retry/backoff. Document that users should enable n8n's built-in "Retry On Fail" for rate-limit resilience, and respect `continueOnFail` so a single bad item does not abort a batch.

- Do not swallow 403s. A 403 almost always means a missing scope (see 4.3); the message should make that obvious.

---

## 8. n8n field inventory

Declarative-style node. `requestDefaults.baseURL = 'https://api.attio.com'`, JSON accept/content-type headers. Pattern: https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/declarative-style-parameters/

Top-level properties, in order:

1. **Resource** (`options`): Record, Note, Task. `noDataExpression: true`.

2. **Operation** (`options`, shown per resource via `displayOptions`): the operations from the 2.1 matrix.

3. **Object** (`options` with `typeOptions.loadOptionsMethod: 'getObjects'`): shown for all Record operations and for Note Create (`parent_object`). Required.

4. **Record ID** (`string`): shown for item operations (Get, Update, Delete, List Attribute Values, List Entries).

5. **Multiselect Mode** (`options`: Append / Overwrite): shown only for Record Update.

6. **Matching Attribute** (`string`): shown only for Record Upsert. Required.

7. **Values** (`json`): shown for Record Create, Upsert, Update.

8. **Filter** (`json`) + **Sort** (fixedCollection) + **Limit** / **Return All**: shown for Record Get Many.

9. **Query** (`string`) + **Objects** (multiOptions, `loadOptionsMethod: 'getObjects'`) + **Request As** (collection): shown for Record Search.

10. Note fields: **Parent Record ID**, **Title**, **Format**, **Content** for Create; parent filters for Get Many; **Note ID** for Get/Delete.

11. Task fields: **Content**, **Deadline At**, **Is Completed**, **Linked Records** (fixedCollection), **Assignees** (fixedCollection) for Create; same minus Content for Update; filters for Get Many; **Task ID** for item ops.

12. **Additional Fields** / **Options** (collection): per-operation optional params (offset, created_at, meeting_id, etc.).

UX rules: follow n8n's UX guidelines (https://docs.n8n.io/integrations/creating-nodes/build/reference/ux-guidelines/). Use Resource then Operation. Required fields outside collections, optional fields inside an "Additional Fields" collection. Human-readable operation names with `action` text so the node works as an AI-Agent tool.

---

## 9. Pure-core signatures (testable, framework-free)

Keep all transform logic in small pure functions, unit-tested without n8n. The node body wires parameters to these and to `httpRequest`.

```ts
// Build the object path segment from the dropdown value (slug or id passthrough).
objectPath(object: string): string;

// Build the records body from a raw JSON values field; validates it parses to an object.
buildValuesBody(valuesJson: string): { data: { values: Record<string, unknown> } };

// Pick the HTTP verb for Record Update from the multiselect mode.
updateVerb(mode: 'append' | 'overwrite'): 'PATCH' | 'PUT';

// Build the query body for Get Many (filter XOR filter_view_id, sorts, limit, offset).
buildQueryBody(opts: QueryOptions): RecordsQueryBody;

// Build the search body (query, objects[], limit, request_as).
buildSearchBody(opts: SearchOptions): RecordsSearchBody;

// Build the note create body.
buildNoteBody(opts: NoteCreateOptions): NoteCreateBody;

// Build the task create/update bodies (update omits content).
buildTaskCreateBody(opts: TaskCreateOptions): TaskCreateBody;
buildTaskUpdateBody(opts: TaskUpdateOptions): TaskUpdateBody;

// Map GET /v2/objects response to INodePropertyOptions[].
mapObjectsToOptions(objects: AttioObject[]): { name: string; value: string }[];

// Normalize an Attio error envelope into a readable n8n error message.
formatAttioError(status: number, body: AttioErrorEnvelope): string;
```

Each pure function gets unit tests first (table-driven where the input space is enumerable), before the operation is wired or verified live.

---

## 10. Dynamic options and data-shape handling

### 10.1 Object dropdown (`getObjects`)

A `loadOptionsMethod` named `getObjects` calls `GET /v2/objects`, then maps via `mapObjectsToOptions` (see 6 and 9). This is the one piece that justifies hand-building over the auto-generated node.

n8n loads options through `methods.loadOptions` (https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/declarative-style-parameters/). In a declarative node the method can be expressed via routing with `postReceive` mapping, or as a small programmatic `loadOptions` function returning `INodePropertyOptions[]`. Prefer the programmatic `loadOptions` function for clarity; it does not count as a runtime dependency and does not violate the zero-dependency rule.

Cache nothing across executions; `loadOptions` runs at design time when the user opens the dropdown.

### 10.2 The `values` payload

Attribute values are dynamic per object and per workspace, and each attribute is multi-value with a type-specific value object. v1 takes `values` as raw JSON and passes it through unmodified inside `data.values`. The node validates that the JSON parses to an object and surfaces a clear error if not. A typed attribute builder is v1.1.

### 10.3 List unwrapping and pagination

For Get Many operations, unwrap `data[]` into one n8n item per element. Implement "Return All" by looping on `offset` (query body for records, query string for notes/tasks) until a short page returns. Respect a sane page size and the `limit` field when "Return All" is off.

---

## 11. Functional requirements

- FR-1: A user authenticates with a single Attio API token; the credential test validates it against `GET /v2/self`. [LOCKED]

- FR-2: The object selector is populated dynamically from the user's workspace; no hand-typing slugs for the common path. [LOCKED]

- FR-3: All 18 operations in the 2.1 matrix are available, grouped by Resource then Operation, with readable names. [LOCKED] (was written as 19 — see the correction under 2.1)

- FR-4: Record Update exposes Append vs Overwrite and routes to PATCH vs PUT accordingly. [LOCKED]

- FR-5: Record Upsert requires `matching_attribute` and uses the collection PUT. [LOCKED]

- FR-6: Get Many operations support filtering and "Return All" pagination. [LOCKED]

- FR-7: API errors surface Attio's message and code; 403 communicates a likely scope gap; 429 communicates rate limiting. [LOCKED]

- FR-8: The node works as an AI-Agent tool (operations carry `action` text). [LOCKED]

- FR-9: Zero runtime dependencies. [LOCKED]

- FR-10: No environment-variable or filesystem access; all data flows through node parameters. [LOCKED]

---

## 12. Resolved decisions (locked)

1. v1 = action node, Records + Notes + Tasks. No trigger. [LOCKED]

2. Auth = API token only. OAuth2 is v1.1. [LOCKED]

3. Objects is a dropdown source, not a user resource. [LOCKED]

4. Record Update = one op with Append/Overwrite mode mapping to PATCH/PUT. [LOCKED]

5. Record Upsert = separate op, collection PUT, required `matching_attribute`. [LOCKED]

6. `values` and `filter` are raw JSON fields in v1; typed builders are v1.1. [LOCKED]

7. Task `format` hardcoded `plaintext`; Task Update omits `content`. [LOCKED]

8. Declarative style first; programmatic fallback allowed only where routing cannot express a verb switch (Record Update) cleanly. Decided at plan time. [OPEN-AT-PLAN]

9. Decision Gate 0: confirm fresh-package eligibility with the Creator Portal before scaffolding. [VERIFY-LIVE]

10. Package name `n8n-nodes-attio` unless the Portal requires a scoped name; if scoped, `@nodrel/n8n-nodes-attio`. [VERIFY-LIVE]

---

## 13. Attio-specific gotchas (deltas from a generic CRUD node)

- **Two PUTs, two meanings.** Collection PUT = upsert (with `matching_attribute`); item PUT = overwrite update. Do not conflate.

- **Dual-scope reads.** Record reads need `object_configuration:read` + `record_permission:read`. A token with one scope passes the credential test and 403s at runtime.

- **No auto-create of references.** Referenced records must already exist or the write fails. Relevant to Upsert and to Task `linked_records`.

- **Task content is write-once.** Set at create, not editable via PATCH.

- **Multi-value attributes.** Every attribute is an array of typed value objects, which is why `values` is JSON in v1.

- **Score-based rate limits.** Heavy list queries can 429 on complexity, not just request rate.

- **`Retry-After` is a date.** Not a seconds integer. Any retry guidance must parse it as a timestamp.

---

## 14. User stories and acceptance scenarios

**Story A (Create record):** As a RevOps user, I select Companies from the dropdown, paste a `values` JSON, run Create, and get back the new record with its `record_id`.

- AS-A1: Valid token + valid object + valid values -> 200, item contains `data.id.record_id`.

- AS-A2: Token missing `record_permission:read-write` -> 403 with a message naming the scope.

**Story B (Upsert by email):** As a sync builder, I upsert a Person with `matching_attribute=email_addresses`, and a second run with the same email updates rather than duplicates.

- AS-B1: First run creates; second run with same matching value updates the same `record_id`.

- AS-B2: Omitting `matching_attribute` -> validation error before the request fires.

**Story C (Update append vs overwrite):** As a user, I add a tag without losing existing tags (Append), and separately replace the full tag set (Overwrite).

- AS-C1: Append mode -> PATCH; existing multiselect values are retained plus the new one.

- AS-C2: Overwrite mode -> PUT; multiselect set equals exactly what I sent.

**Story D (Get Many with filter):** As an analyst, I query People filtered by name and page through all results.

- AS-D1: Filter JSON returns only matching records.

- AS-D2: Return All pages through `offset` until exhausted; item count matches the workspace.

**Story E (Note + Task on a record):** As an AE, I log a Note and create a follow-up Task linked to the same Company record.

- AS-E1: Note Create with `parent_object`/`parent_record_id` returns a note linked to the record.

- AS-E2: Task Create with `linked_records` to the same record returns a task; assignee-by-email resolves.

**Story F (AI-Agent tool):** An AI Agent calls the node as a tool to create a record from natural language.

- AS-F1: Operations expose `action` text and run via the agent tool path.

---

## 15. Verify-live checklist (gates)

Each item is a gate before the related operation is "done." Run against a real Attio workspace token.

- [ ] Decision Gate 0: Creator Portal confirms fresh-package eligibility (3). [VERIFY-LIVE]

- [ ] Credential test: valid token -> save succeeds; invalid -> save fails at the credential dialog.

- [ ] `getObjects` dropdown populates with People, Companies, Deals, and any custom objects.

- [ ] Record Create, Get, Update (both modes), Upsert, Get Many, Search, Delete each round-trip.

- [ ] Dual-scope behavior: a single-read-scope token 403s on record read with a scope-naming message. [VERIFY-LIVE]

- [ ] Note Create / Get / Get Many / Delete round-trip.

- [ ] Task Create / Get / Get Many / Update / Delete round-trip; Update has no content field; content is unchanged after update. [VERIFY-LIVE]

- [ ] 429 surfaces a rate-limit message and `Retry-After` is parsed as a date. [VERIFY-LIVE]

- [ ] `request_as` default `workspace` works with a plain API token in Search. [VERIFY-LIVE]

- [ ] AI-Agent tool path executes at least Record Create and Get Many.

- [ ] Linter passes: `npx @n8n/scan-community-package n8n-nodes-attio`.

- [ ] Zero runtime dependencies in the published tarball (`npm pack` then inspect; `dependencies` empty in `package.json`).

---

## 16. Toolchain and scaffolding contract

Matches the established Nodrel process (FedEx, UPS nodes).

- **Scaffold:** `npm create @n8n/node` (the n8n-node CLI). This ships the conventions n8n expects and a ready-to-use `publish.yml` GitHub Actions workflow with provenance. n8n strongly suggests starting from this scaffold for any node intended for verification (https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).

- **CLI:** `@n8n/node-cli` version **0.23.0 or later** as a devDependency, required for the provenance flag used by the publish workflow. Verify with `npm list @n8n/node-cli`.

- **Node:** `>= 22.22`. TypeScript incremental OFF.

- **Tooling:** npm, release-please (semantic versioning and changelog via Conventional Commits), lefthook (local git hooks), commitlint (commit-message linting). The full CI/CD and release-automation design is section 18. This standardizes the Nodrel toolchain on release-please, matching the FedEx and UPS nodes; it replaces the earlier release-it approach so that versioning, changelog, tagging, and the GitHub Release are driven from merged Conventional Commits rather than a local CLI run.

- **package.json essentials** (https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/):
  - `name`: `n8n-nodes-attio` (or scoped per Decision Gate 0).
  - `keywords` includes `n8n-community-node-package`.
  - `n8n.n8nNodesApiVersion: 1`, with `credentials: ["dist/credentials/AttioApi.credentials.js"]` and `nodes: ["dist/nodes/Attio/Attio.node.js"]`.
  - `dependencies`: empty. This is non-negotiable.

- **Publishing (from May 1 2026, mandatory for verification):** publish via the GitHub Actions `publish.yml` with a provenance statement. n8n will not accept verified nodes published from a local machine. Configure npm Trusted Publisher (npmjs.com > package settings > Publish access > Trusted Publishers > Add a publisher > GitHub Actions) with the Nodrel repo owner, repo name, and workflow filename. No long-lived token needed. **As-built correction 2026-08-16:** the registered workflow filename is **`release-please.yml`** (the entry point), NOT `publish.yml` — npm authorises the entry-point workflow of a run. There is no `NPM_TOKEN` fallback; the secret was deleted after an expiry silently blocked the v0.2.4 publish. See §18.3. (https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/)

- **Docs:** English-only README with operations table, credential setup (token generation path and per-operation scopes from 4.3), an example workflow, and the Nodrel support boundary. English-only applies to all parameter names, descriptions, help text, and error messages too.

---

## 17. Non-functional requirements

- **NFR-1 Zero runtime dependencies.** Hard gate for verification.

- **NFR-2 No env/fs access.** All data via parameters.

- **NFR-3 Declarative-first.** Programmatic code only where declarative routing genuinely cannot express the behavior (candidate: Record Update verb switch).

- **NFR-4 Testable core.** Pure functions (9) unit-tested independently of n8n.

- **NFR-5 English-only** interface and docs.

- **NFR-6 Linter clean** under `@n8n/scan-community-package` and `eslint-plugin-n8n-nodes-base`.

- **NFR-7 Provenance publish** via GitHub Actions with npm provenance (OIDC). Release automation, CI gates, and provenance governance are specified in section 18.

- **NFR-8 AI-tool ready.** Operations carry `action` metadata.

- **NFR-9 Secret hygiene.** API token stored as a `password` field, never logged, never echoed in errors.

- **NFR-10 Resilience.** Honor `continueOnFail`; document n8n Retry-On-Fail for 429s.

---

## 18. CI/CD, release automation, and provenance governance

This section is a hard part of v1, not a follow-up. The FedEx and UPS nodes use the same shape: Conventional Commits drive release-please, release-please owns versioning and the GitHub Release, and a separate provenance publish step pushes to npm via OIDC. The goals are a clean developer experience (no manual version bumps, no hand-written changelogs, no local publishing), and supply-chain governance (signed provenance, no long-lived registry token, least-privilege workflow permissions).

### 18.1 Release model: release-please (Google)

Versioning is automated with `googleapis/release-please-action@v4` using `release-type: node`. It parses Conventional Commit messages on `main`, opens and maintains a "release PR" that bumps `package.json`, updates `CHANGELOG.md`, and, when that PR is merged, creates the git tag and the GitHub Release. (https://github.com/googleapis/release-please-action)

Semantic-version mapping (Conventional Commits to SemVer):

- `fix:` to a patch release.
- `feat:` to a minor release.
- `feat!:` / `fix!:` / a `BREAKING CHANGE:` footer to a major release.
- `chore:`, `docs:`, `refactor:`, `test:`, `ci:` do not trigger a release on their own.

Because the v1 node is pre-1.0 during development, set the initial version intentionally and decide the 1.0.0 cut (verification submission is the natural 1.0.0 trigger). release-please honors a `.release-please-manifest.json` and `release-please-config.json` for explicit version control. [LOCKED on tool, OPEN on initial version]

### 18.2 Two-workflow split (release vs publish)

Keep release-please and the npm publish in separate workflows so the n8n-provided `publish.yml` stays the single provenance publisher. This is the integration point between release-please and n8n's mandatory provenance flow (section 16).

**`release-please.yml`** (on push to `main`): runs release-please. Minimum permissions:

```yaml
permissions:
  contents: write
  pull-requests: write
```

**`publish.yml`** (the n8n scaffold workflow, triggered on `release: types: [published]`): builds and publishes to npm with provenance. Because release-please publishes the GitHub Release when the release PR merges, that Release event triggers `publish.yml`. The two stay decoupled: release-please never holds npm credentials, and `publish.yml` never computes versions.

```yaml
on:
  release:
    types: [published]
permissions:
  contents: read
  id-token: write   # required for npm provenance via OIDC
```

If you prefer a single workflow, release-please's `release_created` output can gate the publish step in the same job (`if: ${{ steps.release.outputs.release_created }}`). The two-workflow split is recommended because it preserves the scaffold's `publish.yml` as the verification-registered workflow name. [LOCKED on split, OPEN on single-vs-two at plan time]

> **SUPERSEDED 2026-08-16 — as-built.** The stated rationale for the split turned out to be backwards. Keeping `publish.yml` as "the verification-registered workflow name" is exactly what does *not* work: npm registers the entry-point workflow, so the registered name is `release-please.yml`.
>
> As built, the split is retained but wired the other way round: `release-please.yml` is the single entry point and calls `publish.yml` via `workflow_call`, gated on `release_created` — effectively the `release_created` approach above, with the publish steps kept in their own file for readability. `publish.yml` has no event triggers of its own.



### 18.3 npm publish with provenance (OIDC, no stored token)

The publish step uses npm provenance and the npm **Trusted Publisher** (OIDC) so no long-lived `NPM_TOKEN` is stored:

```yaml
- run: npm ci
- run: npm run build
- run: npm publish --provenance --access public
```

`--provenance` makes npm generate a signed SLSA provenance attestation that cryptographically ties the published tarball to this repository, commit, and workflow run, using GitHub's OIDC identity. This is exactly what n8n requires from May 1 2026 (section 16) and is the core of the supply-chain governance posture.

Setup (matches the n8n submit-node doc): on npmjs.com, package settings > Publish access > Trusted Publishers > Add a publisher > GitHub Actions, with the Nodrel repo owner, repo name, and the workflow filename.

> **SUPERSEDED 2026-08-16 — as-built.** This paragraph originally said to register workflow filename `publish.yml`, and to keep a granular `NPM_TOKEN` as fallback. Both are wrong as built:
> - The registered workflow is **`release-please.yml`**, because npm authorises the *entry-point* workflow of a run, not the reusable workflow containing `npm publish`. `publish.yml` is now `workflow_call`-only and registering it fails as a misleading 404.
> - There is **no `NPM_TOKEN` fallback**. The secret was deleted; the repo has no Actions secrets. A stored token is what silently broke the v0.2.4 publish when it expired, which is the reason for going token-free.
> - Trusted publishing needs **npm >= 11.5.1**; Node 22.x bundles npm 10.x, so `publish.yml` upgrades npm first. `id-token: write` is required on both parent and child workflow.
>
> Actual npmjs.com config: repo `nodrel-dev/n8n-attio-node`, workflow `release-please.yml`, no environment. Verified live: 0.2.6 published token-free with provenance signed to the Sigstore transparency log.

Requires `@n8n/node-cli` >= 0.23.0 (section 16). (https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/, https://docs.npmjs.com/generating-provenance-statements)

### 18.4 CI checks (pull-request gates)

A `ci.yml` runs on every pull request and on push to `main`. All steps must pass before merge (enforced by branch protection). These are the same gates the FedEx and UPS nodes run.

| Check | Command | Purpose |
|-------|---------|---------|
| Install | `npm ci` | Reproducible install from lockfile |
| Lint | `npm run lint` | n8n node lint (`eslint-plugin-n8n-nodes-base`) |
| Community scan | `npx @n8n/scan-community-package n8n-nodes-attio` | The verification linter (section 15) |
| Typecheck | `tsc --noEmit` | Strict types, no emit |
| Build | `npm run build` | Compiles to `dist/` |
| Unit tests | `npm test` | The pure-core tests (section 9) |
| Zero-dep gate | assert `dependencies` is empty in `package.json` | Fails the build if any runtime dependency is added (NFR-1) |
| Commit/PR title lint | commitlint on the PR title | Conventional Commits, required for release-please |

The zero-dep gate is a small CI script (for example `node -e "process.exit(Object.keys(require('./package.json').dependencies||{}).length?1:0)"`). It is the automated enforcement of the single most important verification constraint, so a future contributor cannot reintroduce the dependency that blocked the original node.

### 18.5 Conventional Commits enforcement

release-please only works if history is Conventional Commits. Enforce it at two layers:

- **Local:** lefthook wires a `commit-msg` hook to commitlint and a `pre-commit` hook to lint, so bad commits fail before they are pushed.

- **CI:** because the repo squash-merges, the squash commit uses the **PR title**. Add a CI check that lints the PR title with commitlint, so the merged commit that release-please reads is always conventional. Without this, a non-conventional PR title silently produces no release. [LOCKED]

### 18.6 Supply-chain and security posture

- **No stored registry token** where OIDC trusted publishing is available; provenance via `id-token: write` scoped only to the publish job.

- **Least-privilege `GITHUB_TOKEN`:** set top-level `permissions` to `contents: read` and widen per-job only as needed (release-please needs `contents: write` + `pull-requests: write`; publish needs `id-token: write`).

- **Pin actions** to a major version at minimum (`@v4`), or to a commit SHA for stricter supply-chain control on the publish workflow.

- **Branch protection on `main`:** require the `ci.yml` checks green and a conventional PR title before merge; release and publish run only from `main`.

- **Provenance is the audit trail:** anyone installing `n8n-nodes-attio` can verify, via `npm`, that the tarball was built by this repo at a specific commit by a specific workflow. This is both an n8n verification requirement and the governance story for the Nodrel brand.

### 18.7 Acceptance for the pipeline

- [ ] A `feat:` merge opens or updates a release-please PR with the correct minor bump and changelog entry.

- [ ] Merging the release PR creates the git tag and GitHub Release.

- [ ] The Release event triggers `publish.yml`, which publishes to npm with a visible provenance attestation (check the package page's provenance badge).

- [ ] `ci.yml` fails if a runtime dependency is added, if the community scan fails, if types fail, or if tests fail.

- [ ] A non-conventional PR title fails the PR-title lint and cannot merge.

- [X] No `NPM_TOKEN` is required when OIDC trusted publishing is configured. [VERIFY-LIVE] ✓ 2026-08-16 — 0.2.6 published token-free with provenance signed to the Sigstore transparency log; `NPM_TOKEN` secret deleted, repo now has zero Actions secrets.

---

## Appendix A: Driving Spec Kit

This brief is the source of requirements. Commit it in the repo, then run the Spec Kit commands below in order. Each argument is deliberately short: it points the agent at this brief rather than restating it, so there is one source of truth. Run `/speckit.checklist` at any point; run `/speckit.analyze` after `/speckit.tasks` to catch gaps before implementing.

**1. `/speckit.constitution`**

```
Fill the template at .specify/memory/constitution.md from attio-node-build-brief.md. Replace __SERVICE__
with Attio, __FULLNAME__ with n8n-nodes-attio, set today's date and version 1.0.0. Keep all twelve
principles and fold in: zero runtime dependencies (NFR-1), declarative-first with a narrow programmatic
fallback (NFR-3, decision 8), API-token-only auth with a /v2/self credential test (section 4), the
dual-scope read requirement (4.3), the two-PUT and PATCH-vs-PUT record write model (5.2, 5.3), Task
content being write-once (5.10), English-only and provenance publishing (16, 18). Add one principle:
verification eligibility is gated on Creator Portal confirmation (section 3) before scaffolding. Add one
principle: releases are automated from Conventional Commits via release-please and published to npm only
through the GitHub Actions provenance workflow, never from a local machine (section 18).
```

**2. `/speckit.specify`**

```
Build n8n-nodes-attio, a verified-track n8n community action node that talks directly to the Attio REST
API so a user works with their own workspace via a single API token. Treat attio-node-build-brief.md in
this repo as the source of requirements and write the spec from it: the three resources and operation
matrix (section 2), the user stories and acceptance scenarios (section 14), and the functional
requirements (section 11). Resources are Record (9 ops), Note (4 ops), Task (5 ops); Objects is a dynamic
dropdown source, not a resource. Write in terms of user value and acceptance scenarios; defer API field
names and routing mechanics to the plan, which will draw on the brief's verified contracts. The decisions
in section 12 are locked; do not reopen them.
```

**3. `/speckit.clarify`**

```
Decisions are locked in attio-node-build-brief.md section 12; do not reopen them. Only raise clarifications
for genuine gaps the brief does not already answer, and prioritise the [VERIFY-LIVE] items in section 15:
fresh-package eligibility (3), dual-scope read behavior (4.3), Task content immutability (5.10), request_as
with a plain token (5.5), and 429 Retry-After parsing (7.1).
```

**4. `/speckit.plan`**

```
Plan against attio-node-build-brief.md: the per-operation contracts and JSON paths (section 5), the enum
and dynamic-value reference (6), the error model (7), the n8n field inventory (8), the pure-core signatures
(9), and the dynamic-options handling (10). Honor the toolchain and scaffolding contract (16) and the NFRs
(17): npm and the n8n-node CLI (>=0.23.0), zero runtime dependencies, declarative-first. Resolve the one
open mechanism question (decision 8): can declarative routing switch PATCH vs PUT for Record Update from a
parameter, or is a thin programmatic execute needed for that one operation. Build the getObjects
loadOptions against GET /v2/objects. Plan the CI/CD and release automation per section 18: release-please
for versioning and changelog, a two-workflow split (release-please.yml plus the scaffold publish.yml),
npm publish with provenance via OIDC, and the ci.yml gates including the zero-dependency check and
conventional PR-title lint. Every item in the verify-live checklist (15) is a gate.
```

**5. `/speckit.tasks`**

```
Order tasks: credential + getObjects dropdown first, then Record Create, Get, Update (both modes), Upsert,
Get Many, Search, Delete, then the two secondary Record reads, then Notes, then Tasks, simplest first. Each
operation includes its pure-core unit tests first (brief section 9), a verify-live step (15), and an
AI-Agent tool-path check before it is done. Stand up the CI/CD pipeline early (section 18): scaffold
release-please.yml, the publish.yml provenance workflow, and ci.yml with the zero-dependency gate and
community scan, so every operation merges through green CI from the first task. Decision Gate 0 (Creator
Portal eligibility, section 3) is a task that blocks scaffolding.
```

**6. `/speckit.implement`**

```
Implement task by task in planned order. After each operation, stop at its verify-live gate and confirm
against a real Attio workspace through the running n8n instance before continuing. No runtime dependency at
any point. Surface real Attio error envelopes (status_code/type/code/message), make 403 read as a likely
scope gap, and parse 429 Retry-After as a date. Keep the values and filter payloads as raw JSON in v1.
Publish only via the GitHub Actions provenance workflow; let release-please own all version bumps,
changelog entries, tags, and GitHub Releases from Conventional Commits (section 18). Never bump the
version by hand and never publish from a local machine.
```
