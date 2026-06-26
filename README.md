# @nodrel-dev/n8n-nodes-attio

An [n8n](https://n8n.io) community **action node** for the [Attio](https://attio.com) CRM REST API (v2).
Connects with a single workspace API token and works with Records, Notes, and Tasks. Also usable as
an AI-Agent tool.

> **Status:** all three resources are implemented and verified live against a real workspace
> (see `specs/001-attio-action-node/`). This node has **zero runtime dependencies** and never reads
> environment variables or the filesystem.

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `@nodrel-dev/n8n-nodes-attio`.

Requires Node.js **>= 22.22** (self-hosted n8n).

## Credentials

Create an **Attio API** credential and paste a workspace API token (stored as a password field, never
logged or echoed). The credential is validated with `GET /v2/self` when you save it — an invalid token
is rejected at the dialog.

### Required token scopes (per operation group)

`GET /v2/self` passes for any valid token, so a missing scope only surfaces as a `403` at run time. The
node surfaces that `403` as a likely missing-scope error. Provision the token with the scopes below so it
works the first time.

| Operation group | Required scopes |
|---|---|
| Record Create / Upsert / Update / Delete | `record_permission:read-write` + `object_configuration:read` |
| Record Get / Get Many / Search / List Attribute Values | `record_permission:read` + `object_configuration:read` |
| Record List Entries | `record_permission:read` + `object_configuration:read` + `list_entry:read` |
| Object dropdown (`GET /v2/objects`) | `object_configuration:read` |
| Note Create | `note:read-write` + `object_configuration:read` + `record_permission:read` |
| Note Get / Get Many | `note:read` + `object_configuration:read` + `record_permission:read` |
| Note Delete | `note:read-write` |
| Task Create / Update | `task:read-write` + `object_configuration:read` + `record_permission:read` + `user_management:read` |
| Task Get / Get Many | `task:read` + `object_configuration:read` + `record_permission:read` + `user_management:read` |
| Task Delete | `task:read-write` |

## Operations

Pick a **Resource** (Record, Note, or Task), then an **Operation**. Every operation also exposes an
`action` label so the node can be used as an **AI-Agent tool**. The **Object** dropdown is populated
live from your workspace; you can also supply an object slug or ID via an expression.

### Record (9)

| Operation | What it does | Attio endpoint |
|---|---|---|
| Create | Create a record from a JSON **Values** object | `POST /v2/objects/{object}/records` |
| Create or Update | Upsert, matching on an attribute slug (no duplicates) | `PUT /v2/objects/{object}/records?matching_attribute=…` |
| Get | Fetch one record by ID | `GET /v2/objects/{object}/records/{record_id}` |
| Update | Update a record; **Multiselect Mode** = Append (PATCH) or Overwrite (PUT) | `PATCH` / `PUT …/records/{record_id}` |
| Get Many | Filter (JSON or saved view), sort, paginate; **Return All** auto-pages | `POST /v2/objects/{object}/records/query` |
| Search | Cross-object free-text search | `POST /v2/objects/records/search` |
| Delete | Delete a record (returns `{ success, record_id }`) | `DELETE …/records/{record_id}` |
| List Attribute Values | Historical values for one attribute | `GET …/records/{record_id}/attributes/{attribute}/values` |
| List Entries | List entries that reference the record | `GET …/records/{record_id}/entries` |

**Values** is a JSON object of attribute slugs → values, e.g. `{"name": "Acme", "domains": ["acme.com"]}`.
For **Update**, _Append_ keeps existing multiselect values and adds the new ones; _Overwrite_ replaces the
set so it equals exactly what you send.

### Note (4)

| Operation | What it does | Attio endpoint |
|---|---|---|
| Create | Create a note linked to a parent record (Plaintext or Markdown) | `POST /v2/notes` |
| Get | Fetch one note by ID | `GET /v2/notes/{note_id}` |
| Get Many | List notes, optionally filtered by parent object/record; **Return All** | `GET /v2/notes` |
| Delete | Delete a note (returns `{ success, note_id }`) | `DELETE /v2/notes/{note_id}` |

### Task (5)

| Operation | What it does | Attio endpoint |
|---|---|---|
| Create | Create a task; link records and assign by **email** or member ID | `POST /v2/tasks` |
| Update | Update deadline / completion / links / assignees — **content is write-once** | `PATCH /v2/tasks/{task_id}` |
| Get | Fetch one task by ID | `GET /v2/tasks/{task_id}` |
| Get Many | List tasks, filtered by assignee / completion / linked record; **Return All** | `GET /v2/tasks` |
| Delete | Delete a task (returns `{ success, task_id }`) | `DELETE /v2/tasks/{task_id}` |

Task **content is set only at creation** and cannot be changed later, so the Update surface has no
Content field. Assignee **email** is resolved to a workspace member server-side; a member ID is the
advanced alternative. To filter Get Many by a linked record, provide **both** the Linked Object and
Linked Record ID (Attio requires them together).

## Example workflow

Create a company, then attach a note to it:

1. **Attio → Record → Create**
   - Object: `Companies`
   - Values: `{ "name": "Acme", "domains": ["acme.com"] }`
2. **Attio → Note → Create**
   - Parent Object: `Companies`
   - Parent Record ID: `={{ $json.id.record_id }}` (from step 1)
   - Title: `Imported from n8n`
   - Format: `Plaintext`
   - Content: `Created by an automated workflow.`

The same pattern drives an **AI Agent**: add this node as a tool and the agent can call e.g.
_Record → Create_ and _Record → Get Many_ by their action names.

## Rate limiting

Attio can return `429` with a `Retry-After` **date** (not a seconds count) — heavy query calls can be
rate-limited on complexity, not just request rate. The node surfaces a clear rate-limit message and the
parsed reset time. For automatic resilience, enable n8n's built-in **Retry On Fail** on the node.

## Support boundary

Maintained by **Nodrel** as a community node. Issues and PRs welcome on GitHub. This is not an official
Attio product.

---

## Maintainer notes — release & publishing

Releases are fully automated. **Never bump the version by hand and never publish from a local machine.**

- **Conventional Commits** drive everything. The squash-merge **PR title** is what `release-please` reads,
  so it must be a valid conventional commit (enforced by the `pr-title` CI job).
- **`release-please`** (`.github/workflows/release-please.yml`) owns version bumps, the changelog, tags,
  and GitHub Releases. A `feat:`/`fix:` merge opens or updates a release PR; merging that PR cuts the
  release.
- **`publish.yml`** runs only on `release: published` and publishes to npm with `--provenance` via OIDC
  Trusted Publishing — there is **no stored `NPM_TOKEN`**.

### npm Trusted Publisher (OIDC) setup

1. On npmjs.com, open the package's **Settings → Trusted Publishers** (create the package/scope first if
   needed).
2. Add a GitHub Actions publisher: repository `nodrel/n8n-nodes-attio`, workflow `publish.yml`.
3. No npm token is stored in GitHub. The `publish.yml` job requests an OIDC token via
   `permissions: id-token: write` and npm verifies it, attaching a provenance badge to the release.

### Branch protection (`main`)

- Require the **CI** status check (`build-test`) to pass before merge.
- Require a **conventional PR title** (the `pr-title` job) to pass.
- Require PRs (no direct pushes) so every change flows through CI and a squash-merge title
  `release-please` can read.

### Least-privilege `GITHUB_TOKEN`

- `ci.yml` declares top-level `permissions: contents: read`.
- `release-please.yml` needs `contents: write` + `pull-requests: write` (only that workflow).
- `publish.yml` needs `contents: read` + `id-token: write` (only that workflow).

## License

[MIT](./LICENSE)
