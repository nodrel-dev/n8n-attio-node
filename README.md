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

Attio can return `429` with a `Retry-After` header in **either** form allowed by RFC 9110 §10.2.3 — an
HTTP **date** (a reset timestamp) or **delta-seconds** — depending on which limiter trips. Limits are
per endpoint: heavy query calls can be rate-limited on complexity, not just request rate. The node
reads both forms and surfaces a clear rate-limit message with the reset time or the delay. For
automatic resilience, enable n8n's built-in **Retry On Fail** on the node.

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
- **`publish.yml`** is `workflow_call`-only. `release-please.yml` invokes it directly once it has cut a
  release, and it publishes to npm with `--provenance` via OIDC Trusted Publishing — there is **no stored
  `NPM_TOKEN`**, and the repo carries no Actions secrets at all.

  It is deliberately **not** triggered by `release: published`. release-please creates the Release using
  `GITHUB_TOKEN`, and GitHub does not fire workflow-triggering events for `GITHUB_TOKEN` actions, so that
  trigger never fires. `v0.2.4` was tagged and released but never reached npm before this was corrected.

- **Recovery**: to republish a tag whose publish never ran, dispatch **`release-please.yml`** (not
  `publish.yml`) with the `tag` input, e.g. `v0.2.6`. It skips automatically if that version is already
  on npm, so re-running is safe.

### npm Trusted Publisher (OIDC) setup

1. On npmjs.com, open the package's **Settings → Trusted Publishers**.
2. Add a GitHub Actions publisher:

   | Field | Value |
   |-------|-------|
   | Organization or user | `nodrel-dev` |
   | Repository | `n8n-attio-node` |
   | Workflow filename | `release-please.yml` |
   | Environment | *(leave empty)* |

   > ⚠️ The workflow is **`release-please.yml`**, not `publish.yml` — even though `publish.yml` is the
   > file that actually runs `npm publish`. npm authorises the *entry-point* workflow of a run, not the
   > reusable workflow it calls. Registering `publish.yml` fails as a misleading 404 on publish.
   > Renaming `release-please.yml` breaks publishing until this config is updated to match.

3. No npm token is stored in GitHub. Both the calling job and `publish.yml` declare
   `permissions: id-token: write` (OIDC needs it on parent *and* child); npm verifies the token and
   attaches a provenance badge. Trusted publishing requires **npm >= 11.5.1**, so `publish.yml` upgrades
   npm before publishing — Node 22.x ships npm 10.x, which has no trusted-publishing support.

### Branch protection (`main`)

- Require the **CI** status check (`build-test`) to pass before merge.
- Require a **conventional PR title** (the `pr-title` job) to pass.
- Require PRs (no direct pushes) so every change flows through CI and a squash-merge title
  `release-please` can read.

### CI gates

`ci.yml` runs on every PR and every push to `main`. Beyond lint / typecheck / build / test it
enforces the invariants that keep this package publishable:

| Gate | What it protects |
|---|---|
| `npm audit --omit=dev --audit-level=low` | **Blocking.** With zero runtime dependencies this is the audit that reaches users; it must stay clean. |
| `npm audit` (full) | **Report-only.** Dev-toolchain advisories stay visible without failing the build — `@n8n/node-cli` pulls a large LangChain subtree this project never uses, and those findings have no upstream fix and never enter the tarball. |
| Zero-dependency gate | `dependencies` must stay `{}`. |
| No-env / no-filesystem gate | No `process.env` or `fs` under `nodes/`. |
| `@n8n/scan-community-package` | Runs against the published package once it exists. |
| `pr-title` (commitlint) | The squash-merge title `release-please` will read. |

`npm audit` will report moderate advisories in the dev toolchain. They cannot be pinned away: the
`overrides` field is rejected for community node packages by
`@n8n/community-nodes/no-overrides-field`, and failing that rule blocks n8n Cloud verification.

### Least-privilege `GITHUB_TOKEN`

Every workflow declares its own permissions; none inherit the repository default.

| Workflow | Permissions | Why |
|---|---|---|
| `ci.yml` | `contents: read` | Read-only build and test. |
| `codeql.yml` | top-level `{}`; job needs `security-events: write`, `packages: read`, `actions: read`, `contents: read` | Uploads scanning results. |
| `label.yml` | top-level `{}`; job needs `contents: read`, `pull-requests: write` | Applies labels to PRs. |
| `stale.yml` | top-level `{}`; job needs `issues: write`, `pull-requests: write` | Marks and closes stale threads. |
| `release-please.yml` | `contents: write`, `pull-requests: write` | Cuts tags, releases and the release PR. |
| `publish.yml` | `contents: read`, `id-token: write` | OIDC needs `id-token` on **parent and child**. |

### Pinned actions

All third-party actions are pinned to a **full commit SHA**, with the human-readable version in a
trailing comment so Dependabot can still offer updates:

```yaml
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0
```

Git tags are mutable — `@v4` is a pointer the upstream owner can move at any time. That matters most
on the publish path: `release-please.yml` is the sole entry point npm authorises for Trusted
Publishing and it hands `id-token: write` down to `publish.yml`, so an action swapped underneath
that chain could mint the OIDC token and publish arbitrary code as this package. **Keep any new
action pinned the same way.** The only unpinned `uses:` is the in-repo
`./.github/workflows/publish.yml`, which is a path, not a third-party reference.

### `pull_request_target` in `label.yml`

`label.yml` runs on `pull_request_target` so PRs from forks get a token that can write labels. That
trigger runs in the base repository's context with access to secrets and **is triggered by untrusted
contributors**. Two rules keep it safe, and both must hold for any step added there:

1. **Never add `actions/checkout`** or any step that fetches the PR head. Building or running
   fork-authored code under this trigger executes untrusted code with a write-capable token.
2. **Never interpolate PR-controlled text** (title, branch name, body) into a `run:` block. Pass it
   through `env:` instead, as `ci.yml` does for the PR title.

`actions/labeler` reads the changed-file list through the API and never checks out or executes PR
content, which is why it is safe under this trigger.

## License

[MIT](./LICENSE)
