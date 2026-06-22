# Contract: Note operations (4)

Scopes: Create/Get/Get Many need `note:*` + `object_configuration:read` + `record_permission:read`; Delete needs only `note:read-write`. See research.md R2. Pure core: `buildNoteBody`.

---

## 1. Create — `POST /v2/notes`
- In: Parent Object (dropdown), Parent Record ID, Title, Format (plaintext/markdown), Content; optional `created_at`, `meeting_id` (Additional Fields).
- Body: `buildNoteBody` → `{ data: { parent_object, parent_record_id, title, format, content, created_at?, meeting_id? } }`.
- Out: 1 item incl. `id.note_id`, `content_plaintext`, `content_markdown`, `created_by_actor`. Linked to the record (AS-E1).

## 2. Get Many — `GET /v2/notes`
- In: parent filters `parent_object`, `parent_record_id` (optional), Limit, **Return All**, `offset`.
- Out: `data[]` → items. Return All loops `offset` in **query string** until short page.

## 3. Get — `GET /v2/notes/{note_id}`
- In: Note ID. Out: 1 item.

## 4. Delete — `DELETE /v2/notes/{note_id}`
- In: Note ID. Out: synthesize `{ success: true, note_id }`.

---

## Verify-live gates
- [ ] Note Create / Get / Get Many / Delete round-trip; Create links to the parent record.
