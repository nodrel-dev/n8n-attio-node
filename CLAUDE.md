# @nodrel-dev/n8n-nodes-attio

An n8n community **action node** for the Attio CRM REST API v2 (Records, Notes, Tasks),
published to npm and also usable as an AI-Agent tool. Shipped and released — treat this as a
maintained package, not a greenfield build.

## Hard invariants

Each of these is enforced by a CI gate or a lint rule. Breaking one fails the build, and in two
cases blocks n8n Cloud verification — so do not "temporarily" work around them.

| Invariant | Enforced by |
|---|---|
| **Zero runtime dependencies.** `dependencies` must stay `{}`; the peer dep on `n8n-workflow` is the only external code. Use `this.helpers.httpRequest*` instead of reaching for a library. | CI zero-dependency gate |
| **No `process.env`, no `fs`** anywhere under `nodes/`. All input arrives via node parameters and the `attioApi` credential. | CI grep gate |
| **No `overrides` field in `package.json`.** Banned for community node packages; adding it blocks n8n Cloud verification. | `@n8n/community-nodes/no-overrides-field` |
| **No `node:*` imports or `__dirname` outside `test/e2e/`.** The cloud ruleset lints `nodes/`, `credentials/` *and* `test/core/`; only `playwright.config.ts` and `test/e2e/**` are exempt. | `@n8n/community-nodes/no-restricted-imports` |
| **Every `$parameter` interpolated into a routing URL path must be wrapped in `encodeURIComponent`.** Raw segments containing `/` or `..` collapse during URL normalisation and retarget the request to a different Attio endpoint. The node is `usableAsTool: true`, so these values come from an LLM and may carry prompt-injected input. | `test/core/pathSegmentEncoding.test.ts` |
| **Declarative-first.** `requestDefaults` + per-operation `routing`. The only sanctioned programmatic surface is the `getObjects` `loadOptions` method. Do not add an `execute()`. | Code review |
| **Task content is write-once.** Attio only accepts it at creation, so Task Update must never send `content`. | `buildTaskUpdateBody` + tests |

## Layout

```
nodes/Attio/
  Attio.node.ts          node description, requestDefaults, credentials
  descriptions/          per-resource params + routing (record / note / task), shared.ts
  core/                  pure, framework-free helpers — unit-tested, no n8n imports
  methods/loadOptions.ts the one programmatic surface (getObjects)
credentials/             AttioApi credential (apiToken, password field, /v2/self test)
test/core/               Jest unit tests for core/ and the routing-URL guard
test/e2e/                Playwright suite driving the real n8n editor (Docker + live tokens)
```

`core/` holds the logic worth testing; `descriptions/` should stay declarative wiring. When adding
an operation, write the pure builder and its test first, then wire the routing.

## Commands

```bash
npm run lint          # n8n-node lint — includes the Cloud-compatibility ruleset
npm run typecheck     # tsc --noEmit
npm run build         # tsc + copy svg/json assets into dist/
npm test              # Jest unit suite
npm run e2e:harness   # Docker n8n with the working tree's build mounted
npm run test:e2e      # Playwright suite (needs the harness + live Attio tokens)
```

Before calling work done: `lint`, `typecheck`, `build`, `test`. The e2e suite needs Docker and two
real Attio tokens (see `test/e2e/README.md`) — it is a manual gate, not part of CI.

## Toolchain

Node **>= 22.22**. Dev-only: `@n8n/node-cli` **^0.46.4**, `n8n-workflow` **^2.38.1** (also the peer
dep, declared `*`), TypeScript strict with incremental off, Jest + ts-jest, Playwright, commitlint,
lefthook.

`npm audit` reports ~10 moderate advisories in the dev toolchain — `@n8n/node-cli` pulls a large
LangChain subtree this project never uses. They have no upstream fix and cannot be pinned away
(the `overrides` ban above), and they never reach the published tarball. **`npm audit --omit=dev`
is the gate that matters and must stay at zero.**

## Releases

Fully automated. **Never bump the version by hand and never publish from a local machine.**

Conventional Commits drive it: the squash-merge **PR title** is what `release-please` reads. A
`feat:`/`fix:` merge opens or updates a release PR; merging *that* PR cuts the release and
publishes to npm with provenance via OIDC Trusted Publishing (no stored `NPM_TOKEN`; the repo has
no Actions secrets).

`release-please.yml` is the sole entry point npm authorises — `publish.yml` is `workflow_call`-only
and renaming either file breaks publishing. All third-party actions are pinned to commit SHAs with
the version in a trailing comment; keep new ones pinned the same way. Full detail lives in the
README's maintainer notes.

## Reference material

`attio-api-spec/` is reference-only, for planning. Never import it, copy it into `nodes/`, or read
it at build or run time. Hand-write all node definitions.

`specs/001-attio-action-node/` is the **original design record** for the v1 build, not a live plan —
it describes the feature as specified in June 2026 and parts of it were superseded during
implementation (see the status note at the top of `plan.md`). Use it for the *why* behind a
decision; use the code, this file, and the README for current behaviour.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-attio-action-node/plan.md` (with `research.md`, `data-model.md`,
`contracts/`, and `quickstart.md` in the same directory).
<!-- SPECKIT END -->
