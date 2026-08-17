# UI automation suite

Playwright specs that drive the Attio node through the real n8n editor.

## What this covers — and what it deliberately does not

The unit suite (`npm test`) covers the pure core, and the operations have been
round-tripped against the live Attio API. Re-running all 18 CRUD operations through
a browser would be slower and more brittle without adding signal, so this suite is
scoped to **editor-only behaviour that no other layer can reach**:

| Spec | What breaks without it |
|---|---|
| `discoverability.spec.ts` | Node missing from the node creator, or falling back to a generic icon |
| `actions-manifest.spec.ts` | An operation silently added, renamed or dropped from the 9/4/5 split |
| `load-options.spec.ts` | `loadOptions` dropdowns failing — they only ever run in the editor |
| `display-options.spec.ts` | Wrong parameters shown for a resource/operation pair |
| `validation.spec.ts` | `required` not enforced, so users burn API calls on incomplete nodes |
| `execute.spec.ts` | Credential, parameters and output panel not wired together |
| `error-surface.spec.ts` | `formatAttioError` messages not reaching the user |

Specs seed workflows through n8n's REST API and then deep-link to the node's NDV
(`/workflow/{id}/{nodeId}`) rather than dragging nodes across the canvas. Canvas
interaction is the most brittle part of n8n's UI and testing it would tell us about
n8n, not about this node.

## Requirements

- Docker (for the n8n harness)
- Attio API tokens in the environment:
  - `ATTIO_API_TOKEN_FULL` — all resources read-write, used as the working credential
  - `ATTIO_API_TOKEN` — **restricted**: Records at *Read* only, plus Object Configuration
    read. `error-surface.spec.ts` depends on this token lacking
    `record_permission:read-write`, and will fail if it is over-granted.

Verify a token's real scopes with `GET https://api.attio.com/v2/self`.

## Running

```bash
npm run e2e:harness          # build, pack and start n8n with the local node mounted
set -a && . ./.env.local && set +a
npm run test:e2e             # run the suite
node scripts/e2eHarness.mjs down   # tear the harness down
```

`npm run test:e2e:ui` opens Playwright's watch UI.

The harness mounts the **working tree's** build, not the published package, so the
suite always tests local changes.

## Live data

`execute.spec.ts` creates a real Attio record and deletes it in teardown, keyed to a
unique per-run email. `error-surface.spec.ts` only ever provokes 403s, so it writes
nothing. Seeded n8n workflows are deleted after each test.

## Notes for maintainers

- n8n annotates its UI with `data-test-id`, not Playwright's default `data-testid`;
  this is set once via `testIdAttribute` in `playwright.config.ts`.
- n8n names only two of its three parameter shapes in the DOM: simple params as
  `{name}-parameter-input-options-container` and `fixedCollection` as
  `fixed-collection-{name}`. Plain `collection` params (Update Fields, Additional
  Fields) carry no name — assert those via `Ndv.visibleParameterLabels()`.
- Element Plus renders every select's menu into a body-level popper and leaves closed
  ones in the DOM, so dropdown queries must be scoped with `:visible`. Unscoped, the
  page carries ~25 `.el-select-dropdown__item`s from every select at once.
- A `loadOptions` select renders **disabled** until its request resolves (~800ms
  against the live workspace). `Ndv.clickSelect` waits for `toBeEnabled` before
  clicking. Do not swap that for `dispatchEvent` or `{force: true}`: both bypass
  Playwright's actionability check, so they no-op against the disabled input and the
  resulting empty dropdown is indistinguishable from a broken `loadOptions`.
- n8n 2.x will not delete an unarchived workflow — `DELETE /rest/workflows/{id}`
  returns `400 Workflow must be archived before it can be deleted`. `deleteWorkflow`
  archives first and checks both statuses.

Verified green against n8n **2.25.7** (`n8nio/n8n:latest`, 2026-08-17): 25/25, no
workflows and no Attio records left behind.
