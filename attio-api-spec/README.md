# Attio REST API: OpenAPI Spec Bundle

Captured for the `n8n-nodes-attio` verified community node build brief (Nodrel).

## Provenance

- **Source:** `https://api.attio.com/openapi/api` (Attio's canonical, live OpenAPI spec, linked from https://docs.attio.com/rest-api/endpoint-reference/openapi)
- **Captured:** 2026-06-21
- **Spec:** OpenAPI 3.1.0, Attio API v2.0.0
- **Server:** `https://api.attio.com`
- **Coverage:** 45 paths, 19 shared schemas, 27 resource tags

This is the canonical spec, not the trimmed copy bundled in the existing
`n8n-nodes-attio` v0.6.0 node. The live spec has 13 more paths and 7 more
schemas than that vendored copy (it adds Files, Meetings, Call Recordings, SQL,
record search, and views).

## Files

- `openapi.json` — the full canonical spec, pretty-printed. Ground truth. Use
  this when you need anything not covered by the per-resource splits.
- `_meta-and-auth.json` — info block, servers, security schemes (API token +
  OAuth2 scopes), and all 27 resource tags. Read this first for auth.
- `by-resource/_schemas.json` — all 19 shared component schemas. The per-resource
  files reference these by `$ref`, so keep this alongside them.
- `by-resource/<resource>.json` — one file per resource tag, each containing just
  that resource's paths and operations. Drop in only what a given task needs.

## v1 scope for the node (locked)

The build brief covers three resources as an **action node** (no trigger in v1):

- **`by-resource/records.json`** — the core. Records are rows of CRM data
  (people, companies, deals, custom objects). Operations: list (query), create,
  upsert, get, update (PUT overwrite / PATCH append), delete, search, plus
  attribute-value and entry reads.
  Objects are **dynamic** (`by-resource/objects.json` → `GET /v2/objects`), so
  the node needs a `loadOptionsMethod` dropdown to populate the object selector.
- **`by-resource/notes.json`** — list, create, get, delete. Freeform text logged
  against a record.
- **`by-resource/tasks.json`** — list, create, get, update, delete. Action items
  linked to records.

Deferred: Webhooks (`by-resource/webhooks.json`) drives the v2 trigger node.
Lists + Entries (`by-resource/lists.json`, `by-resource/entries.json`) are v2.

## Auth (from `_meta-and-auth.json`)

- **v1: API token** (Bearer). User generates it in Attio → Workspace Settings →
  Developers, sets scopes per resource, and pastes it into the n8n credential.
  Tokens are workspace-scoped. Reading a record requires both the
  `object_configuration` and `record_permission` read scopes.
- **v1.1: OAuth2** authorization-code flow. authorizationUrl
  `https://app.attio.com/authorize`, tokenUrl `https://app.attio.com/oauth/token`,
  ~26 granular scopes. Only needed for multi-workspace published apps.

## Full resource inventory (canonical spec)

| Resource          | Paths | Ops | v1?           |
|-------------------|-------|-----|---------------|
| Records           | 6     | 10  | **yes**       |
| Notes             | 2     | 4   | **yes**       |
| Tasks             | 2     | 5   | **yes**       |
| Objects           | 3     | 5   | dropdown only |
| Attributes        | 6     | 10  | no            |
| Lists             | 3     | 5   | v2            |
| Entries           | 4     | 8   | v2            |
| Webhooks          | 2     | 5   | v2 (trigger)  |
| Comments          | 2     | 3   | no            |
| Threads           | 2     | 2   | no            |
| Workspace members | 2     | 2   | no            |
| Files             | 4     | 6   | no            |
| Meetings          | 2     | 3   | no            |
| Call recordings   | 2     | 4   | no            |
| Transcripts       | 1     | 1   | no            |
| Meta              | 1     | 1   | no            |
| SQL               | 1     | 1   | no            |
