# Phase 1 Data Model: Attio Action Node

This node has no persistent storage. "Entities" here are (a) the domain objects exchanged with Attio, (b) the n8n parameter surface, and (c) the pure-core function types. Field names trace to brief §5–§9.

---

## 1. Domain entities (Attio API)

### Object (dropdown source only — never a user-facing resource)
- `api_slug` (string) — used as the option **value** and the `{object}` path segment.
- `plural_noun`, `singular_noun` (string) — option **name** (prefer plural).
- `object_id` (uuid) — accepted by the path but slug is preferred for readability.
- Source: `GET /v2/objects` → `data: AttioObject[]`.

### Record
- `id.record_id` (uuid) — identity; returned on Create/Upsert.
- `values` (map: attribute slug → array of typed value objects) — multi-value by design; raw JSON in v1.
- Parent: belongs to one Object. Path: `/v2/objects/{object}/records/{record_id}`.

### Note
- `id.note_id` (uuid).
- `parent_object` (object slug, required), `parent_record_id` (uuid, required) — links to a Record.
- `title` (string, required), `format` (`plaintext` | `markdown`, required), `content` (string, required).
- Optional: `created_at` (ISO 8601), `meeting_id` (string|null).
- Response adds `content_plaintext`, `content_markdown`, `created_by_actor`.

### Task
- `id.task_id` (uuid).
- `content` (string, **write-once at create**), `format` (`plaintext` only — hardcoded).
- `deadline_at` (ISO 8601 | null), `is_completed` (boolean).
- `linked_records` (array of `{ target_object, target_record_id }` in v1).
- `assignees` (array; by `workspace_member_email_address` simple, `referenced_actor_id` advanced).
- Update (PATCH) body covers `deadline_at`, `is_completed`, `linked_records`, `assignees` — **never `content`**.

### Credential (`attioApi`)
- `apiToken` (string, `password`, required). Bearer auth. Workspace-scoped; carries permission scopes (see research.md R2).
- Test: `GET /v2/self` (valid → save; invalid → fail at dialog).

### Error envelope
- `{ status_code: number, type: string, code: string, message: string }`. 400/401/403/404/429 all share this shape. 429 adds a `Retry-After` **date** header.

---

## 2. n8n parameter surface (display order, brief §8)

| # | Parameter | Type | Shown for | Notes |
|---|-----------|------|-----------|-------|
| 1 | Resource | options (Record/Note/Task) | always | `noDataExpression: true` |
| 2 | Operation | options | per resource (`displayOptions`) | readable names + `action` text |
| 3 | Object | options + `loadOptionsMethod: getObjects` | all Record ops + Note Create (`parent_object`) | required |
| 4 | Record ID | string | Record Get/Update/Delete/List Attr Values/List Entries | |
| 5 | Multiselect Mode | options (Append/Overwrite) | Record Update only | **per-option routing → PATCH/PUT** |
| 6 | Matching Attribute | string | Record Upsert only | required; validated pre-request |
| 7 | Values | json | Record Create/Upsert/Update | raw JSON → `data.values` |
| 8 | Filter (json) + Sort (fixedCollection) + Limit + Return All | mixed | Record Get Many | filter XOR filter_view_id |
| 9 | Query (string) + Objects (multiOptions `getObjects`) + Request As (collection) | mixed | Record Search | `request_as` default workspace |
| 10 | Parent Record ID / Title / Format / Content | mixed | Note Create | + parent filters for Get Many; Note ID for Get/Delete |
| 11 | Content / Deadline At / Is Completed / Linked Records / Assignees | mixed | Task Create | **same minus Content** for Update; filters for Get Many; Task ID for item ops |
| 12 | Additional Fields / Options | collection | per-op | offset, created_at, meeting_id, etc. |

Static enums (brief §6): Note `format` = plaintext/markdown; Sort `direction` = asc/desc; `request_as.type` = workspace/workspace-member (default workspace); Assignee `referenced_actor_type` = workspace-member.

---

## 3. Pure-core function types (brief §9 — tests-first)

```ts
objectPath(object: string): string;                 // slug/id passthrough → path segment
buildValuesBody(valuesJson: string): { data: { values: Record<string, unknown> } };  // validates parse-to-object
updateVerb(mode: 'append' | 'overwrite'): 'PATCH' | 'PUT';
buildQueryBody(opts: QueryOptions): RecordsQueryBody;   // filter XOR filter_view_id, sorts, limit, offset
buildSearchBody(opts: SearchOptions): RecordsSearchBody; // query, objects[], limit, request_as
buildNoteBody(opts: NoteCreateOptions): NoteCreateBody;
buildTaskCreateBody(opts: TaskCreateOptions): TaskCreateBody;  // content + format:plaintext
buildTaskUpdateBody(opts: TaskUpdateOptions): TaskUpdateBody;  // OMITS content
mapObjectsToOptions(objects: AttioObject[]): { name: string; value: string }[];
formatAttioError(status: number, body: AttioErrorEnvelope): string;  // 403→scope hint, 429→rate-limit+date
```

### Validation rules (enforced in pure core, before any request)
- `buildValuesBody`: JSON MUST parse to an object → else clear error (edge case: malformed values).
- Upsert: `matching_attribute` MUST be non-empty → else validation error pre-request (AS-B2, FR-5).
- `buildQueryBody`: `filter` and `filter_view_id` are mutually exclusive.
- `buildTaskUpdateBody`: never includes `content`.
- `formatAttioError`: never echoes the token; surfaces `code`/`message` verbatim; 403 → "likely missing scope" + the scope set for that op group; 429 → rate-limit message + `Retry-After` parsed as date.

---

## 4. State / transitions

- **Credential**: invalid → (save blocked) ; valid → saved. No runtime mutation.
- **Record multi-value attribute under Update**: Append (PATCH) → set ∪ {new}; Overwrite (PUT) → set := sent (SC-006).
- **Upsert keyed on `matching_attribute`**: no match → create; match → update same `record_id` (SC-005, idempotent).
- **Task content**: settable at create only; immutable thereafter (no transition exposed).
