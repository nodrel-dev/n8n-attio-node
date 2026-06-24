# Contract: Record operations (9)

Scopes: writes = `record_permission:read-write` + `object_configuration:read`; reads = `record_permission:read` + `object_configuration:read` (List Entries also `list_entry:read`). See research.md R2.

`{object}` = dropdown slug. Pure core: `objectPath`, `buildValuesBody`, `updateVerb`, `buildQueryBody`, `buildSearchBody`.

---

## 1. Create — `POST /v2/objects/{object}/records`
- In: Object, Values (json).
- Body: `buildValuesBody(values)` → `{ data: { values: {...} } }`.
- Out: `{ data: <record> }` → 1 item incl. `id.record_id` (AS-A1).
- Errors: 403 → missing `record_permission:read-write` (AS-A2). Malformed Values → pre-request error.

## 2. Upsert — `PUT /v2/objects/{object}/records?matching_attribute=...`
- Collection-level PUT (no `record_id`).
- In: Object, **Matching Attribute (required)**, Values.
- Validation: empty `matching_attribute` → fail before request (AS-B2, FR-5).
- Body: same as Create. Query: `matching_attribute`.
- Out: 1 item; same `record_id` on repeat with same matching value (SC-005). Referenced records must pre-exist (no auto-create).

## 3. Get — `GET /v2/objects/{object}/records/{record_id}`
- In: Object, Record ID. Out: `{ data: <record> }` → 1 item. Dual read scope.

## 4. Update — `PATCH` **or** `PUT /v2/objects/{object}/records/{record_id}`
- In: Object, Record ID, **Multiselect Mode** (Append/Overwrite), Values.
- **Verb via per-option routing** (research.md R1): Append → `PATCH` (additive), Overwrite → `PUT` (replace set). Same body `{ data: { values } }`.
- Out: 1 item. Append retains existing + new; Overwrite set == sent (SC-006, AS-C1/C2).

## 5. Get Many — `POST /v2/objects/{object}/records/query`
- In: Object, Filter (json), Sort (fixedCollection attribute+direction), Limit, **Return All**, offset (Additional Fields).
- Body: `buildQueryBody` → `{ filter?, filter_view_id?, sorts?, limit?, offset? }` (filter XOR filter_view_id).
- Out: `data[]` → one item per element. Return All loops `offset` in **body** until short page (SC-007, AS-D2).

## 6. Search — `POST /v2/objects/records/search`
- Cross-object free-text. In: Query (required), Objects (multiOptions `getObjects`, required), Limit, Request As (collection, default `{type:'workspace'}`).
- Body: `buildSearchBody` → `{ query, objects[], limit?, request_as }`.
- Out: `data[]` → one item per element. `request_as` member impersonation is advanced. **[VERIFY-LIVE]** plain token + workspace.

## 7. Delete — `DELETE /v2/objects/{object}/records/{record_id}`
- In: Object, Record ID. Out: synthesize `{ success: true, record_id }` (no meaningful body).

## 8. List Attribute Values — `GET /v2/objects/{object}/records/{record_id}/attributes/{attribute}/values`
- In: Object, Record ID, Attribute (free text in v1; dropdown v1.1). Out: historical values → items. Read scope.

## 9. List Entries — `GET /v2/objects/{object}/records/{record_id}/entries`
- In: Object, Record ID. Out: list entries referencing this record → items. Scopes incl. `list_entry:read`.

---

## Verify-live gates (brief §15)
- [ ] Create, Get, Update (both modes), Upsert, Get Many, Search, Delete each round-trip.
- [ ] Append never reduces set; Overwrite equals sent.
- [ ] Upsert twice with same matching value → one record.
- [ ] Return All count matches workspace.
- [ ] AI-Agent tool path runs Create and Get Many (AS-F1, SC-009).
