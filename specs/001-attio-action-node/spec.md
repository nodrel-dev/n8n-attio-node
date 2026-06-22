# Feature Specification: Attio Action Node (n8n-nodes-attio)

**Feature Branch**: `001-attio-action-node`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Build n8n-nodes-attio, a verified-track n8n community action node that talks directly to the Attio REST API so a user works with their own workspace via a single API token. Treat attio-node-build-brief.md as the source of requirements: the three resources and operation matrix (section 2), the user stories and acceptance scenarios (section 14), and the functional requirements (section 11). Resources are Record (10 ops), Note (4 ops), Task (5 ops); Objects is a dynamic dropdown source, not a resource. Decisions in section 12 are locked."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect to a workspace and choose an object (Priority: P1)

A workflow builder pastes their Attio API token into the node's credential and immediately
knows whether it works. Once connected, anywhere they need to pick an Attio object (People,
Companies, Deals, or a custom object) they choose it from a dropdown populated from their own
workspace, rather than typing a slug they have to look up.

**Why this priority**: Nothing else in the node functions without a working connection and a
way to target an object. This is the foundational slice and the primary reason to hand-build
the node rather than reuse the existing auto-generated one.

**Independent Test**: Save a valid token and confirm the connection check passes; save an
invalid token and confirm it is rejected at the credential dialog. Open any object-backed
operation and confirm the dropdown lists the workspace's standard and custom objects.

**Acceptance Scenarios**:

1. **Given** a valid API token, **When** the user saves the credential, **Then** the
   connection check succeeds and the credential is saved.
2. **Given** an invalid or revoked token, **When** the user saves the credential, **Then**
   saving fails at the credential dialog with a clear message, not silently at run time.
3. **Given** a saved credential, **When** the user opens an object-backed operation, **Then**
   the object dropdown is populated with the workspace's objects (People, Companies, Deals,
   and any custom objects), shown by readable name.

---

### User Story 2 - Create a record (Priority: P1)

A RevOps user selects an object from the dropdown, supplies the record's attribute values,
runs Create, and gets back the newly created record including its record identifier so the
downstream workflow can reference it.

**Why this priority**: Creating records is the most common write action and the smallest
end-to-end slice that proves auth, object selection, request, and response unwrapping all work
together.

**Independent Test**: With a valid write-scoped token, select Companies, provide values, run
Create, and confirm the returned item contains the new record's identifier.

**Acceptance Scenarios**:

1. **Given** a valid token with record write scope and a selected object, **When** the user
   runs Create with valid values, **Then** the operation returns the new record including its
   record identifier.
2. **Given** a token lacking record write scope, **When** the user runs Create, **Then** the
   operation fails with a message that names the missing scope so the failure is actionable.

---

### User Story 3 - Upsert a record without creating duplicates (Priority: P2)

A sync builder upserts a person keyed on a matching attribute (for example, email). The first
run creates the record; a later run with the same matching value updates the same record
instead of creating a duplicate.

**Why this priority**: Idempotent upsert is the backbone of recurring sync workflows and is a
distinct, high-value behavior separate from plain Create/Update.

**Independent Test**: Run Upsert twice with the same matching value and confirm the second run
updates the record created by the first rather than producing a second record.

**Acceptance Scenarios**:

1. **Given** an Upsert with a matching attribute, **When** it runs the first time, **Then** a
   record is created; **When** it runs again with the same matching value, **Then** the same
   record is updated, not duplicated.
2. **Given** an Upsert with no matching attribute provided, **When** the user runs it, **Then**
   the operation fails validation before any request is sent.

---

### User Story 4 - Update a record with append vs overwrite control (Priority: P2)

A user updating a multi-value attribute (such as tags) can choose to add to the existing set
without losing current values, or to replace the entire set, via a single Update operation
with a clearly labeled mode.

**Why this priority**: Attio's two update semantics are easy to confuse and getting it wrong
causes silent data loss. Exposing the choice explicitly is a core correctness requirement.

**Independent Test**: Update a record's multi-value attribute in Append mode and confirm prior
values are retained plus the new one; repeat in Overwrite mode and confirm the set equals
exactly what was sent.

**Acceptance Scenarios**:

1. **Given** Update in Append mode, **When** the user adds a value to a multi-value attribute,
   **Then** existing values are retained and the new value is added.
2. **Given** Update in Overwrite mode, **When** the user submits a set of values, **Then** the
   attribute's values equal exactly what was sent.

---

### User Story 5 - Query and page through records (Priority: P2)

An analyst queries an object with a filter, sorts the results, and can either limit the page
or retrieve every matching record across pages without manual paging.

**Why this priority**: Reading data back out (with filtering and full pagination) is required
for most reporting and downstream-processing workflows.

**Independent Test**: Run a filtered query and confirm only matching records return; enable
"Return All" and confirm the item count matches the workspace's matching records across pages.

**Acceptance Scenarios**:

1. **Given** a filter, **When** the user runs Get Many, **Then** only records matching the
   filter are returned.
2. **Given** "Return All" is enabled, **When** the user runs Get Many, **Then** results page
   through until exhausted and the returned item count matches the matching records.

---

### User Story 6 - Log a note and a follow-up task on a record (Priority: P3)

An account executive logs a note against a company record and creates a follow-up task linked
to that same record, assigning it to a teammate by email.

**Why this priority**: Notes and Tasks complete the v1 CRM-activity surface beyond records, but
depend on records existing first, so they come after the record slices.

**Independent Test**: Create a note with a parent object and parent record and confirm it is
linked to that record; create a task linked to the same record with an assignee by email and
confirm the task is created and the assignee resolves.

**Acceptance Scenarios**:

1. **Given** a parent object and parent record, **When** the user creates a note, **Then** the
   note is returned linked to that record.
2. **Given** a linked record and an assignee email, **When** the user creates a task, **Then**
   the task is returned linked to the record and the assignee resolves.
3. **Given** an existing task, **When** the user opens Update, **Then** there is no field to
   change the task's content, reflecting that task content cannot be edited after creation.

---

### User Story 7 - Drive the node from an AI agent (Priority: P3)

An AI agent invokes the node as a tool to create a record or list records from a natural-language
instruction, using the node's readable operation names and action descriptions.

**Why this priority**: AI-agent compatibility broadens the node's usefulness and is a stated
goal, but it builds on operations that must already work for humans.

**Independent Test**: From the AI-agent tool path, run Create Record and Get Many and confirm
both execute successfully.

**Acceptance Scenarios**:

1. **Given** an AI agent using the node as a tool, **When** it calls a record operation,
   **Then** the operation exposes readable action text and executes via the agent tool path.

---

### Edge Cases

- **Valid token, missing scope**: The connection check passes (the token is valid) but an
  operation later fails because the token lacks a required scope. Record reads in particular
  require two scopes together; a token with only one passes the check and then fails the read.
  The failure must name the missing scope rather than failing opaquely.
- **Referenced record does not exist**: A write that references another record fails if that
  referenced record has not been created yet (Attio does not auto-create references). Relevant
  to Upsert and to task-to-record links.
- **Rate limiting**: A request may be rejected for exceeding a rate limit, including heavy list
  queries rejected for complexity rather than raw request rate. The node must communicate that
  this is rate limiting and how long until reset.
- **Malformed values input**: When the freeform attribute values are not a valid object, the
  node reports a clear error before sending the request.
- **Empty or partial results**: List operations with no matches return zero items cleanly; a
  delete returns a clear success indicator even though the service returns no meaningful body.
- **Batch with one bad item**: When processing multiple input items, one failing item does not
  abort the whole batch when the user has opted into continue-on-fail.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A user MUST be able to authenticate with a single Attio API token, and the
  credential MUST be validated against the workspace identity check at save time so an invalid
  token is rejected at the credential dialog rather than failing silently later.
- **FR-002**: The object selector MUST be populated dynamically from the user's own workspace
  (standard and custom objects), shown by readable name, so the common path never requires
  hand-typing an object slug.
- **FR-003**: All 19 operations of the operation matrix MUST be available, grouped by Resource
  then Operation with human-readable names: Record (Create, Upsert, Get, Update, Get Many,
  Search, Delete, List Attribute Values, List Entries — 10 operations), Note (Create, Get, Get
  Many, Delete — 4 operations), Task (Create, Get, Get Many, Update, Delete — 5 operations).
- **FR-004**: Record Update MUST expose an explicit Append vs Overwrite choice and apply
  additive behavior for Append and full-replacement behavior for Overwrite on multi-value
  attributes.
- **FR-005**: Record Upsert MUST require a matching attribute, MUST be a distinct operation
  from Update, and MUST create-or-update keyed on that matching attribute.
- **FR-006**: Get Many operations MUST support filtering and a "Return All" option that pages
  through every matching result, plus an explicit limit when "Return All" is off.
- **FR-007**: API errors MUST surface the service's own message and code; a permission failure
  MUST communicate a likely missing scope, and a rate-limit failure MUST communicate that it is
  rate limiting and when access resets. Errors MUST NOT be silently swallowed.
- **FR-008**: The node MUST be usable as an AI-agent tool, with operations carrying action text
  that allows an agent to select and invoke them.
- **FR-009**: The published package MUST have zero runtime dependencies.
- **FR-010**: The node MUST NOT access environment variables or the filesystem; all data MUST
  flow through node parameters and the credential, and the token MUST never be logged or echoed.
- **FR-011**: Successful responses MUST be returned as n8n items — one item per result for list
  operations and one item for single-result operations — with the service's response envelope
  unwrapped so users work with the payload directly.
- **FR-012**: The credential's guidance and the package documentation MUST list the required
  permission scopes per operation group, including the multi-scope read requirements that
  generalize beyond records: record reads need `record_permission:read` +
  `object_configuration:read`; List Entries additionally needs `list_entry:read`; Note reads
  and Task reads additionally need `object_configuration:read` + `record_permission:read`, and
  Tasks further need `user_management:read` (see research.md R2 for the full per-operation table).
- **FR-013**: The node MUST honor n8n's continue-on-fail option so a single failing input item
  does not abort an entire batch.
- **FR-014**: Task content MUST be settable only at creation; the Task Update surface MUST NOT
  offer a content field, reflecting that task content cannot be changed after creation.
- **FR-015**: The Objects concept MUST be exposed only as the source for the object dropdown and
  MUST NOT appear as a user-facing resource.
- **FR-016**: All user-facing text — operation and field names, descriptions, help, and error
  messages — and all documentation MUST be in English only.

### Key Entities *(include if feature involves data)*

- **Record**: An entry of an Attio object (a person, company, deal, or custom-object item),
  identified by a record identifier and holding a set of multi-value attributes.
- **Object**: A type definition in the workspace (People, Companies, Deals, custom). Surfaced
  only as dropdown choices that target which object an operation acts on; not a user resource.
- **Note**: A titled piece of content attached to a parent record, with a format and body.
- **Task**: A to-do with content (set once at creation), an optional deadline, completion state,
  links to records, and assignees.
- **Credential (Attio API token)**: A workspace-scoped secret carrying permission scopes that
  govern which operations succeed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from pasting a valid token to creating their first record without
  ever typing an object slug by hand.
- **SC-002**: 100% of invalid tokens are rejected at credential save time rather than at first
  operation run.
- **SC-003**: All 19 operations across the three resources are available and individually
  succeed against a real workspace.
- **SC-004**: Every permission failure surfaces a message that identifies the missing scope, so
  a user can fix it without external documentation.
- **SC-005**: A recurring upsert run twice with the same matching value produces exactly one
  record, not duplicates.
- **SC-006**: An Append update never reduces a multi-value attribute's existing set; an Overwrite
  update makes the set exactly what was sent.
- **SC-007**: A "Return All" query returns a count equal to the matching records in the workspace
  with no manual paging by the user.
- **SC-008**: The published package contains zero runtime dependencies and passes the n8n
  community verification scan.
- **SC-009**: An AI agent can successfully create a record and list records through the node's
  tool path.

## Assumptions

- v1 is an action node only; there is no trigger node. Triggers, standalone **Lists** and
  **Entries** resources (managing lists or creating/editing list entries directly), and a typed
  per-attribute value builder are out of scope for v1 (deferred to later versions). This does
  **not** exclude the Record **List Entries** read operation (FR-003, `GET …/records/{id}/entries`),
  which returns the list entries a given record belongs to and is part of the locked 19-operation
  matrix.
- Authentication is API-token only for v1; OAuth2 is deferred. (Section 12, locked.)
- Attribute values and query filters are supplied as freeform structured input in v1 rather than
  field-by-field forms; a typed builder is a later-version enhancement. (Section 12, locked.)
- The user has an Attio workspace and can generate an API token with the appropriate scopes from
  their workspace developer settings.
- The dropdown reflects the workspace at the moment the user opens it (design time); no values
  are cached across executions.
- Package eligibility and the exact published package name are confirmed with the n8n Creator
  Portal before scaffolding (governance gate); this spec assumes that gate is cleared and does
  not re-decide it.
- Standard, user-friendly error handling and reasonable performance expectations apply; exact
  rate-limit thresholds are governed by the service and are not fixed by this spec.
