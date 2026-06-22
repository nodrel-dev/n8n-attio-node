# @nodrel/n8n-nodes-attio

An [n8n](https://n8n.io) community **action node** for the [Attio](https://attio.com) CRM REST API (v2).
Connects with a single workspace API token and works with Records, Notes, and Tasks. Also usable as
an AI-Agent tool.

> **Status:** in active development. The operations table below is filled in as each operation lands
> and is verified live (see `specs/001-attio-action-node/`). This node has **zero runtime
> dependencies** and never reads environment variables or the filesystem.

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `@nodrel/n8n-nodes-attio`.

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
| Note Create / Get / Get Many | `note:*` + `object_configuration:read` + `record_permission:read` |
| Note Delete | `note:read-write` |
| Task Create / Update / Get / Get Many | `task:*` + `object_configuration:read` + `record_permission:read` + `user_management:read` |
| Task Delete | `task:read-write` |

## Operations

_Filled in per operation as each lands (Record → Note → Task). See `specs/001-attio-action-node/`._

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
