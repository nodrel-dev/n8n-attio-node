# Contract: Task operations (5)

Scopes: Create/Update/Get/Get Many need `task:*` + `object_configuration:read` + `record_permission:read` + `user_management:read`; Delete needs only `task:read-write`. See research.md R2. Pure core: `buildTaskCreateBody`, `buildTaskUpdateBody`.

`format` is hardcoded `plaintext` (no selector). **Task content is write-once** (Principle VI).

---

## 1. Create — `POST /v2/tasks`
- In: Content (required), Deadline At (nullable), Is Completed (bool), Linked Records (fixedCollection: Object dropdown + Record ID), Assignees (fixedCollection: email simple / member id advanced).
- Body: `buildTaskCreateBody` → `{ data: { content, format:'plaintext', deadline_at, is_completed, linked_records[], assignees[] } }`.
- Out: 1 item incl. `id.task_id`. Linked to record; assignee-by-email resolves (AS-E2). Referenced records must pre-exist.

## 2. Update — `PATCH /v2/tasks/{task_id}`
- In: Task ID, **Deadline At, Is Completed, Linked Records, Assignees — NO Content field**.
- Body: `buildTaskUpdateBody` → `{ data: { deadline_at?, is_completed?, linked_records?, assignees? } }` (never `content`).
- Out: 1 item. Content unchanged after update. **[VERIFY-LIVE]**

## 3. Get — `GET /v2/tasks/{task_id}`
- In: Task ID. Out: 1 item.

## 4. Get Many — `GET /v2/tasks`
- In: filters `linked_object`, `linked_record_id`, `assignee`, `is_completed` (bool), `sort`; Limit, **Return All**, `offset`.
- Out: `data[]` → items. Return All loops `offset` in **query string**.

## 5. Delete — `DELETE /v2/tasks/{task_id}`
- In: Task ID. Out: synthesize `{ success: true, task_id }`.

---

## Verify-live gates
- [ ] Task Create / Get / Get Many / Update / Delete round-trip.
- [ ] Update surface has no content field; content unchanged after update.
