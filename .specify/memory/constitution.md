<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.1 → 2.0.0
Rationale (2.0.0, MAJOR — principle redefinitions): Reconciled the constitution with the
shipped node (published `@nodrel-dev/n8n-nodes-attio`, npm 0.2.10). Three principles were
redefined and one added, which is a MAJOR bump under this document's own rules:

  - **Principle II REDEFINED.** The sanctioned programmatic fallback was "the Record Update
    verb switch (PATCH vs PUT)". That fallback was never needed: research.md R1 proved the
    verb switch works declaratively via per-option `routing` on the Multiselect Mode param,
    and that is how it shipped. The sole programmatic surface is now the `getObjects`
    `loadOptions` method, and adding an `execute()` is prohibited outright. This NARROWS
    what is permitted, so existing-compliant work stays compliant.
  - **Principle IX REDEFINED (was factually wrong).** It required `Retry-After` be parsed
    "as a date (a reset timestamp), never as a seconds integer". Attio sends BOTH forms per
    RFC 9110 §10.2.3 depending on which limiter trips (verified live 2026-08-17: `/v2/self`
    returned an HTTP-date, the records-query concurrency limiter returned `9`). Parsing
    date-first is a live bug — `new Date('9')` is a valid Date in 2001 — so the rule now
    mandates ruling out delta-seconds FIRST. See `nodes/Attio/core/formatAttioError.ts`.
  - **Principle XIII RETIRED to satisfied.** Decision Gate 0 (Creator Portal eligibility)
    was cleared; the package name is settled. Kept in place, marked satisfied, so the
    numbering that plan.md's Constitution Check table references stays stable.
  - **Principle XV ADDED.** URL path-segment safety and the n8n Cloud lint invariants
    (`encodeURIComponent` on every routed `$parameter`, no `overrides` field, no `node:*`
    imports) — all three are CI- or lint-enforced today and none existed at ratification.

Also corrected throughout: the operation matrix is **18** (Record 9 + Note 4 + Task 5), not
19 — a typo in the source brief that propagated here, into spec.md, plan.md, tasks.md and
the contracts README (brief §2.1 correction, 2026-08-16). Toolchain floors, the community
scan's package name, and the action-pinning posture were updated to what CI actually runs.

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check derives gates generically
       from this file; no hardcoded principle list, no edit required.
  ✅ .specify/templates/spec-template.md — no constitution coupling; no edit required.
  ✅ .specify/templates/tasks-template.md — no constitution coupling; no edit required.
  ✅ .specify/templates/checklist-template.md — generic; no edit required.

Follow-up TODOs: none.

----- prior amendments -----
Version change: 1.0.0 → 1.0.1
Rationale (1.0.1, PATCH — clarification, no semantic change): Resolved a scope-wording
collision flagged by /speckit-analyze (finding F2). Additional Constraints "Scope (v1)"
listed "Lists, Entries" as deferred, which read as excluding the Record "List Entries"
operation that FR-003 and the operation matrix (Principle XII) already mandate.
Clarified that only standalone Lists/Entries *resources* are deferred; the Record List
Entries *read op* (GET …/records/{id}/entries) remains in v1. Mirrored the same
clarification in spec.md Assumptions. No principle added, removed, or redefined; no gate
changed → PATCH. No template updates required.

Version change: (template) → 1.0.0
Rationale: Initial ratification. First concrete constitution populated from
internal/attio-node-build-brief.md. MAJOR baseline (1.0.0) per explicit instruction.

Modified principles: none (initial adoption).

Principle set (14 total):
  Folded from brief (the twelve core principles include these seven):
    I.   Zero Runtime Dependencies (NFR-1)
    II.  Declarative-First, Narrow Programmatic Fallback (NFR-3, decision 8)
    III. API-Token-Only Auth with /v2/self Credential Test (section 4)
    IV.  Dual-Scope Read Requirement (4.3)
    V.   Two-PUT / PATCH-vs-PUT Record Write Model (5.2, 5.3)
    VI.  Task Content Is Write-Once (5.10)
    VII. English-Only Interface and Provenance Publishing (16, 18)
  Remaining five core principles grounded in the brief:
    VIII. Testable Pure Core (NFR-4, section 9)
    IX.   Faithful Error Surfacing (section 7)
    X.    No Environment or Filesystem Access (NFR-2, FR-10)
    XI.   Readable, AI-Tool-Ready Operations with Dynamic Object Dropdown (FR-2/3/8, NFR-8)
    XII.  Spec Fidelity and Locked-Decision Discipline (sections 2, 12, 15)
  Added per instruction:
    XIII. Verification Eligibility Gated on Creator Portal Confirmation (section 3)
    XIV.  Automated, Provenance-Only Releases via release-please (section 18)

Added sections:
  - Additional Constraints (scope, NFR coverage, supply-chain posture)
  - Development Workflow & Quality Gates

Removed sections: none. RATIFICATION_DATE set to adoption date 2026-06-22 per instruction.
-->

# n8n-nodes-attio Constitution

This constitution governs `@nodrel-dev/n8n-nodes-attio`, a verification-track n8n community
action node integrating exactly one third-party service: Attio (REST API v2). It is binding
on all specification, planning, implementation, review, and release work. Where this
document and convenience conflict, this document wins.

The node is **shipped and published**. `internal/attio-node-build-brief.md` remains the
authoritative *requirements* source and this constitution distils its non-negotiables into
enforceable principles — but for **current behaviour**, the code, `CLAUDE.md` and the README
are authoritative. Where a principle below describes a mechanism, that mechanism has been
reconciled against the shipped implementation.

## Core Principles

### I. Zero Runtime Dependencies

The published package MUST declare zero runtime dependencies. `dependencies` in
`package.json` MUST be empty, and CI MUST fail the build if any runtime dependency is
introduced. devDependencies are permitted; bundling, vendoring, or transitively
requiring a third-party package at run time is not. Reach for `this.helpers.httpRequest*`
rather than an HTTP library. This is the single constraint that disqualified the prior
auto-generated Attio node, so it is non-negotiable and machine-enforced — never waived for
convenience.

Rationale: n8n verification forbids runtime dependencies; this is the hard gate that
makes the node eligible (NFR-1, FR-9).

### II. Declarative-First, One Sanctioned Programmatic Surface

The node MUST be built in n8n declarative style with `requestDefaults` and per-operation
`routing`. The **sole** sanctioned programmatic surface is the `getObjects` `loadOptions`
method in `nodes/Attio/methods/loadOptions.ts`. An `execute()` MUST NOT be added.

The Record Update verb switch — historically the one candidate for a programmatic fallback —
is resolved declaratively: the "Multiselect Mode" `options` parameter carries per-option
`routing.request.method` (Append → `PATCH`, Overwrite → `PUT`), which n8n deep-merges into
the request when that option is selected. The verbs come from the tested `updateVerb` pure
function so the mapping has a single source of truth. Any future proposal for programmatic
code MUST be justified at plan time, scoped to the one operation that needs it, and MUST NOT
pull in a runtime dependency.

Rationale: Declarative style maximises verifiability and maintainability. The fallback that
this principle once reserved proved unnecessary (research.md R1), so the permitted surface
is narrowed to what actually ships (NFR-3, decision 8).

### III. API-Token-Only Auth with /v2/self Credential Test

v1 authentication MUST be a single Attio API token (Bearer) via the `attioApi` credential
type, with the token stored as a `password` field. OAuth2 is explicitly out of scope for
v1. The credential MUST define a test request against `GET /v2/self` so an invalid token
fails at credential save, not silently at runtime.

Rationale: A credential test is a verification expectation and prevents the silent-failure
mode of the prior node (section 4, FR-1).

### IV. Dual-Scope Read Requirement

Record reads require BOTH `object_configuration:read` and `record_permission:read`. The
node and its documentation MUST treat this as a first-class footgun: the credential test
(`/v2/self`) passes for any valid token regardless of scope, so a single-scope token will
pass the test and then 403 at read time. The credential field description and README MUST
list the scope pairs per operation group, and a 403 MUST be surfaced as a likely missing
scope (see Principle IX).

Rationale: Scope mismatches are the most likely runtime failure; making them legible is a
correctness and UX requirement (section 4.3).

### V. Two-PUT / PATCH-vs-PUT Record Write Model

The two distinct Attio PUT semantics MUST NOT be conflated. Record Update is one
user-facing operation with a "Multiselect Mode" selector: Append routes to `PATCH`
(additive), Overwrite routes to `PUT` (replaces the set). Record Upsert is a SEPARATE
operation using the collection-level `PUT /v2/objects/{object}/records` with a REQUIRED
`matching_attribute` query parameter. Omitting `matching_attribute` on Upsert MUST fail
validation before the request fires.

Rationale: Collection PUT (upsert) and item PUT (overwrite) carry different meanings;
conflating them causes silent data loss (sections 5.2, 5.3).

### VI. Task Content Is Write-Once

Task `content` is settable only at create. The Task Update UI MUST NOT offer a content
field, and `buildTaskUpdateBody` MUST NOT emit one, because the Attio PATCH body has no
`content`. Task `format` is hardcoded to `plaintext` with no selector. (Note `format` is a
user-facing selector — plaintext or markdown — and is not covered by this principle.) This
limitation MUST be documented and verified live.

Rationale: Exposing an editable content field would mislead users into expecting an effect
the API cannot deliver (section 5.10).

### VII. English-Only Interface and Provenance Publishing

All parameter names, descriptions, help text, error messages, and documentation MUST be
English-only. The package MUST be published only with npm provenance — a signed
attestation tying the tarball to this repository, commit, and workflow run. Publishing
from a local machine is prohibited; only the GitHub Actions provenance workflow may
publish (mechanism detailed in Principle XIV).

Rationale: English-only is a stated product constraint; provenance is mandatory for n8n
verification from May 1 2026 and is the supply-chain audit trail (sections 16, 18, NFR-5,
NFR-7).

### VIII. Testable Pure Core

All transform and body-building logic MUST live in small, framework-free pure functions
under `nodes/Attio/core/` (`objectPath`, `buildValuesBody`, `updateVerb`, `buildQueryBody`,
`buildSearchBody`, `buildNoteBody`, `buildTaskCreateBody`/`buildTaskUpdateBody`,
`mapObjectsToOptions`, `formatAttioError`, `readHeader`, `tryParseJson`). Each MUST have
unit tests — table-driven where the input space is enumerable — written before the operation
is wired or verified live. `descriptions/` stays declarative wiring; the node body only
connects parameters to these functions.

Rationale: A pure core keeps logic testable independently of n8n and enforces the
write-tests-first discipline (NFR-4, section 9).

### IX. Faithful Error Surfacing

Attio's error envelope (`status_code`, `type`, `code`, `message`) MUST be surfaced
verbatim in n8n errors; errors MUST NOT be swallowed. A 403 MUST read as a likely missing
scope, naming the scopes the operation needs. A 429 MUST be surfaced as rate limiting.

`Retry-After` MUST be read as **either** `delta-seconds` **or** an `HTTP-date` (RFC 9110
§10.2.3) — Attio sends both, depending on which limiter trips (verified live 2026-08-17:
`/v2/self` returned `Mon, 17 Aug 2026 14:30:00 GMT`; the records-query concurrency limiter
returned `9`). Delta-seconds MUST be ruled out FIRST, because `new Date('9')` parses to a
valid Date in 2001 and date-first parsing silently converts a nine-second delay into a
timestamp decades in the past — wrong, and wrong in a way that reads as authoritative.

The node MUST respect `continueOnFail` so one bad item does not abort a batch, and the
README MUST direct users to n8n's built-in Retry-On-Fail for 429 resilience.

Rationale: Actionable, accurate errors are the difference between a debuggable node and the
silent failures of the prior implementation (section 7, NFR-10).

### X. No Environment or Filesystem Access

The node MUST NOT read environment variables or the filesystem. All inputs and outputs flow
exclusively through node parameters and credentials. The API token MUST never be logged or
echoed in an error message. CI greps `nodes/` for `process.env` and `fs` access and fails on
any match.

Rationale: Verification and security require that all data flow through declared parameters
with no hidden side channels (NFR-2, FR-10, NFR-9).

### XI. Readable, AI-Tool-Ready Operations with Dynamic Object Dropdown

Operations MUST be organized Resource → Operation with human-readable names and `action`
metadata so the node functions as an AI-Agent tool (`usableAsTool: true`). The Object
selector MUST be populated dynamically from the user's workspace via a `getObjects`
`loadOptions` method backed by `GET /v2/objects`; the common path MUST NOT require
hand-typing slugs. Objects is a dropdown source only, never a user-facing resource.

Rationale: Readable operations and a dynamic dropdown are the user-value justification for
hand-building over auto-generation, and `action` text enables the AI-tool path (FR-2, FR-3,
FR-8, NFR-8).

### XII. Spec Fidelity and Locked-Decision Discipline

The section 2.1 operation matrix — **Record 9 + Note 4 + Task 5 = 18 operations** — is the
authoritative operation list. (An earlier "10 Record / 19 total" reading was a typo in the
brief, corrected 2026-08-16 and verified against the built node loaded in n8n.) Successful
responses are unwrapped from the top-level `data` key into n8n items (one per array element
for lists, one for single-object operations). Decisions marked [LOCKED] in the brief MUST NOT
be reopened during clarification or implementation. Every [VERIFY-LIVE] item is a gate that
MUST be confirmed against a real Attio workspace before the related operation is marked done.

Rationale: A single source of truth and disciplined gates prevent scope drift and unverified
claims shipping as done (sections 2, 12, 15).

### XIII. Verification Eligibility Gated on Creator Portal Confirmation — SATISFIED

**Status: cleared.** Decision Gate 0 required confirming with the n8n Creator Portal, before
any scaffolding, that a fresh hand-built package under the Nodrel identity was accepted for
verification given the existing thin auto-generated node. That confirmation was obtained and
the package ships as **`@nodrel-dev/n8n-nodes-attio`**. The name is now baked into
`package.json`, the npm Trusted Publisher configuration, and the credential and node type
IDs; changing it is a breaking republish, not an edit.

This principle is retained rather than removed so principle numbering stays stable for the
Constitution Check table in `specs/001-attio-action-node/plan.md`. It binds any *future*
package rename or additional published package.

Rationale: The package name and eligibility were foundational and expensive to change after
scaffolding; resolving them first prevented a costly rebuild (section 3).

### XIV. Automated, Provenance-Only Releases via release-please

Releases MUST be automated from Conventional Commits. `release-please` (action v4,
`release-type: node`) owns version bumps, `CHANGELOG.md`, git tags, and the GitHub Release.
Versions MUST NEVER be bumped by hand and the package MUST NEVER be published from a local
machine. Conventional Commits MUST be enforced locally (lefthook + commitlint) and in CI
(PR-title lint), since squash-merge uses the PR title.

Publishing MUST occur ONLY through `publish.yml`, which is **`workflow_call`-only and invoked
directly by `release-please.yml`**. It MUST NOT be triggered by `release: published`: GitHub
does not fire workflow-triggering events for actions taken with `GITHUB_TOKEN`, so that
trigger never fires — `v0.2.4` was tagged and released but never reached npm before this was
corrected. `release-please.yml` is also the sole entry-point workflow npm authorises for
Trusted Publishing, because npm authorises the entry point of a run, not the reusable
workflow it calls. **Renaming either workflow file breaks publishing** until the npm Trusted
Publisher config is updated to match. Both the calling job and `publish.yml` MUST declare
`id-token: write` (OIDC needs it on parent *and* child).

Rationale: Automated, provenance-only releases give a clean developer experience and a
verifiable supply-chain audit trail with no long-lived registry token (section 18, NFR-7).

### XV. URL Path Safety and n8n Cloud Lint Invariants

Three machine-enforced invariants protect the routing layer and Cloud verification
eligibility. None may be "temporarily" worked around.

1. **Every `$parameter` interpolated into a routing URL path MUST be wrapped in
   `encodeURIComponent`.** A raw segment containing `/` or `..` collapses during URL
   normalisation and retargets the request at a different Attio endpoint. Because the node is
   `usableAsTool: true`, these values can arrive from an LLM and may carry prompt-injected
   input. Enforced by `test/core/pathSegmentEncoding.test.ts`.
2. **`package.json` MUST NOT carry an `overrides` field.** It is rejected for community node
   packages by `@n8n/community-nodes/no-overrides-field`, and failing that rule blocks n8n
   Cloud verification — so dependency advisories MUST NOT be resolved by pinning transitives.
3. **No `node:*` imports and no `__dirname` outside `test/e2e/`.** The Cloud ruleset lints
   `nodes/`, `credentials/` *and* `test/core/`; only `playwright.config.ts` and `test/e2e/**`
   are exempt. Enforced by `@n8n/community-nodes/no-restricted-imports`.

Rationale: (1) is a security boundary on an LLM-reachable surface; (2) and (3) are hard
gates on Cloud verification that fail late and expensively if discovered at review time.

## Additional Constraints

- **Scope (v1):** Action node only; no trigger. Resources are Record, Note, and Task.
  Standalone Lists and Entries resources (managing lists or creating/editing list entries
  directly), Webhooks/trigger, and typed attribute builders are deferred to later versions.
  This deferral does NOT exclude the Record **List Entries** read operation (FR-003,
  `GET …/records/{id}/entries`), which is part of the 18-operation matrix. `values` and
  `filter` are raw JSON fields in v1.
- **Toolchain:** Node **>= 22.22**. Dev-only: `@n8n/node-cli` **^0.46.4**, `n8n-workflow`
  **^2.38.1** (also the peer dependency, declared `*`), TypeScript strict with incremental
  OFF, Jest + ts-jest, Playwright, commitlint, lefthook. Toolchain floors moved up from the
  ratification-era `@n8n/node-cli >= 0.23.0` / `n8n-workflow ^1.70.0` to clear critical and
  high dependency advisories.
- **Linter clean:** MUST pass `npm run lint` (`n8n-node lint`, which includes the Cloud
  compatibility ruleset) and `npx @n8n/scan-community-package @nodrel-dev/n8n-nodes-attio`.
- **Dependency advisories:** `npm audit --omit=dev --audit-level=low` is the **blocking**
  gate and MUST stay at zero — with zero runtime dependencies, that is the audit that
  reaches users. Full `npm audit` is report-only: `@n8n/node-cli` pulls a large LangChain
  subtree this project never uses, those advisories have no upstream fix, cannot be pinned
  away (Principle XV.2), and never enter the published tarball.
- **Supply-chain posture:** least-privilege `GITHUB_TOKEN` (every workflow declares its own
  permissions; none inherit the repository default). All third-party actions MUST be pinned
  to a **full commit SHA** with the version in a trailing comment — git tags are mutable, and
  an action swapped underneath the publish chain could mint the OIDC token and publish
  arbitrary code as this package. `label.yml` runs on `pull_request_target`: it MUST NOT add
  `actions/checkout` or interpolate PR-controlled text into a `run:` block. Branch protection
  on `main` requires green CI and a conventional PR title.

## Development Workflow & Quality Gates

- **Tests first:** Pure-core unit tests (Principle VIII) precede wiring or live
  verification for each operation.
- **CI gates (`ci.yml`, every PR and push to `main`, all must pass before merge):**
  `npm ci`, `npm run lint`, blocking production audit, report-only full audit, the community
  scan, `tsc --noEmit`, `npm run build`, `npm test`, the zero-dependency assertion, the
  no-env/no-filesystem grep, and the conventional PR-title lint.
- **Local gates before calling work done:** `npm run lint`, `npm run typecheck`,
  `npm run build`, `npm test`.
- **E2E:** `npm run e2e:harness` (Docker n8n with the working tree's build mounted) then
  `npm run test:e2e` (Playwright against the real editor). This needs Docker and two live
  Attio tokens — it is a **manual gate, not part of CI**. See `test/e2e/README.md`.
- **Verify-live gates:** Each [VERIFY-LIVE] item in brief section 15 is confirmed against a
  real Attio workspace; an AI-Agent tool-path check runs before an operation is done.
- **Review:** Reviewers MUST verify compliance with every applicable principle above before
  approving; deviations require explicit, recorded justification.

## Governance

This constitution supersedes other practices for `@nodrel-dev/n8n-nodes-attio`. Amendments
MUST be proposed as a documented change to this file, reviewed, and approved before taking
effect; each amendment records its rationale in the Sync Impact Report and propagates to
dependent templates and docs.

Versioning of this constitution follows semantic versioning:
- **MAJOR** — backward-incompatible governance changes or principle removals/redefinitions.
- **MINOR** — a new principle or section, or materially expanded guidance.
- **PATCH** — clarifications and wording fixes with no semantic change.

Compliance is reviewed at every spec, plan, and PR stage. The plan template's Constitution
Check derives its gates from this file; planners and reviewers MUST keep that check aligned
with the principles here. Locked decisions (Principle XII) are not subject to relitigation
through normal review — only through a recorded amendment.

**Version**: 2.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-09-07
