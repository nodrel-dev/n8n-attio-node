# Contracts: Attio Action Node

The node's external interface is the set of **n8n operations** it exposes (the AI-tool/agent contract) mapped onto **Attio REST API v2** calls. These files document, per operation: the n8n parameters in, the HTTP request out, the response shape, the unwrap rule, and the scopes required.

Conventions (brief §5):
- Base URL `https://api.attio.com`; all bodies `application/json`; JSON accept/content-type via `requestDefaults`.
- Success responses wrap payload in top-level `data`. The node unwraps `data` into n8n items: one item per array element (lists), one item (single).
- DELETE returns no meaningful body → node synthesizes `{ success: true, <id> }`.
- `{object}` path segment comes from the dynamic dropdown (slug, via `getObjects`).
- Errors surface the Attio envelope `{ status_code, type, code, message }` verbatim through `formatAttioError`; 403 → likely-missing-scope; 429 → rate-limit + `Retry-After` as date.

Files:
- `credential.md` — `attioApi` + `/v2/self` test
- `load-options.md` — `getObjects` (`GET /v2/objects`)
- `record-operations.md` — 10 Record ops
- `note-operations.md` — 4 Note ops
- `task-operations.md` — 5 Task ops

Scopes per operation: see `research.md` R2 (refined beyond brief §4.3).
