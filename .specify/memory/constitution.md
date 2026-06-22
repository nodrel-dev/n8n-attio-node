<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.0.1
Rationale (1.0.1, PATCH — clarification, no semantic change): Resolved a scope-wording
collision flagged by /speckit-analyze (finding F2). Additional Constraints "Scope (v1)"
listed "Lists, Entries" as deferred, which read as excluding the Record "List Entries"
operation that FR-003 and the locked 19-operation matrix (Principle XII) already mandate.
Clarified that only standalone Lists/Entries *resources* are deferred; the Record List
Entries *read op* (GET …/records/{id}/entries) remains in v1. Mirrored the same
clarification in spec.md Assumptions. No principle added, removed, or redefined; no gate
changed → PATCH. No template updates required.

----- prior amendments -----
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

Removed sections: none.

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check derives gates generically
       from this file; no hardcoded principle list, no edit required.
  ✅ .specify/templates/spec-template.md — no constitution coupling; no edit required.
  ✅ .specify/templates/tasks-template.md — no constitution coupling; no edit required.
  ✅ .specify/templates/checklist-template.md — generic; no edit required.

Follow-up TODOs: none. RATIFICATION_DATE set to adoption date 2026-06-22 per instruction.
-->

# n8n-nodes-attio Constitution

This constitution governs `n8n-nodes-attio`, a verification-track n8n community action
node integrating exactly one third-party service: Attio (REST API v2). It is binding on
all specification, planning, implementation, review, and release work. Where this
document and convenience conflict, this document wins. The authoritative requirements
source is `internal/attio-node-build-brief.md`; this constitution distills its
non-negotiables into enforceable principles.

## Core Principles

### I. Zero Runtime Dependencies

The published package MUST declare zero runtime dependencies. `dependencies` in
`package.json` MUST be empty, and CI MUST fail the build if any runtime dependency is
introduced. devDependencies are permitted; bundling, vendoring, or transitively
requiring a third-party package at run time is not. This is the single constraint that
disqualified the prior auto-generated Attio node, so it is non-negotiable and
machine-enforced — never waived for convenience.

Rationale: n8n verification forbids runtime dependencies; this is the hard gate that
makes the node eligible (NFR-1, FR-9).

### II. Declarative-First, Narrow Programmatic Fallback

The node MUST be built in n8n declarative style with `requestDefaults` and per-operation
`routing`. Programmatic `execute`/`loadOptions` code is permitted ONLY where declarative
routing genuinely cannot express the required behavior — the sole sanctioned candidate is
the Record Update verb switch (PATCH vs PUT). Any programmatic fallback MUST be justified
at plan time, scoped to the one operation that needs it, and MUST NOT pull in a runtime
dependency.

Rationale: Declarative style maximizes verifiability and maintainability; the fallback is
bounded so it cannot erode the declarative posture (NFR-3, decision 8).

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
field, because the Attio PATCH body has no `content`. Task `format` is hardcoded to
`plaintext` with no selector. This limitation MUST be documented and verified live.

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
(e.g. `objectPath`, `buildValuesBody`, `updateVerb`, `buildQueryBody`, `buildSearchBody`,
`buildNoteBody`, `buildTaskCreateBody`/`buildTaskUpdateBody`, `mapObjectsToOptions`,
`formatAttioError`). Each MUST have unit tests — table-driven where the input space is
enumerable — written before the operation is wired or verified live. The node body only
wires parameters to these functions and to `httpRequest`.

Rationale: A pure core keeps logic testable independently of n8n and enforces the
write-tests-first discipline (NFR-4, section 9).

### IX. Faithful Error Surfacing

Attio's error envelope (`status_code`, `type`, `code`, `message`) MUST be surfaced
verbatim in n8n errors; errors MUST NOT be swallowed. A 403 MUST read as a likely missing
scope. A 429 MUST be surfaced as rate limiting, and any retry guidance MUST parse
`Retry-After` as a date (a reset timestamp), never as a seconds integer. The node MUST
respect `continueOnFail` so one bad item does not abort a batch, and the README MUST direct
users to n8n's built-in Retry-On-Fail for 429 resilience.

Rationale: Actionable, accurate errors are the difference between a debuggable node and the
silent failures of the prior implementation (section 7, NFR-10).

### X. No Environment or Filesystem Access

The node MUST NOT read environment variables or the filesystem. All inputs and outputs flow
exclusively through node parameters and credentials. The API token MUST never be logged or
echoed in an error message.

Rationale: Verification and security require that all data flow through declared parameters
with no hidden side channels (NFR-2, FR-10, NFR-9).

### XI. Readable, AI-Tool-Ready Operations with Dynamic Object Dropdown

Operations MUST be organized Resource → Operation with human-readable names and `action`
metadata so the node functions as an AI-Agent tool. The Object selector MUST be populated
dynamically from the user's workspace via a `getObjects` `loadOptions` method backed by
`GET /v2/objects`; the common path MUST NOT require hand-typing slugs. Objects is a dropdown
source only, never a user-facing resource.

Rationale: Readable operations and a dynamic dropdown are the user-value justification for
hand-building over auto-generation, and `action` text enables the AI-tool path (FR-2, FR-3,
FR-8, NFR-8).

### XII. Spec Fidelity and Locked-Decision Discipline

The section 2.1 operation matrix (10 Record, 4 Note, 5 Task) is the authoritative operation
list. Successful responses are unwrapped from the top-level `data` key into n8n items (one
per array element for lists, one for single-object operations). Decisions marked [LOCKED] in
the brief MUST NOT be reopened during clarification or implementation. Every [VERIFY-LIVE]
item is a gate that MUST be confirmed against a real Attio workspace before the related
operation is marked done.

Rationale: A single source of truth and disciplined gates prevent scope drift and unverified
claims shipping as done (sections 2, 12, 15).

### XIII. Verification Eligibility Gated on Creator Portal Confirmation

Before any scaffolding, Decision Gate 0 MUST be cleared: confirm with the n8n Creator Portal
that a fresh, hand-built package under the Nodrel identity is accepted for verification given
the existing thin auto-generated node, rather than a PR being required. If the Portal
requires a different package name or scope (e.g. `@nodrel/n8n-nodes-attio`), that name MUST
be captured before scaffolding, because it is baked into `package.json`, the npm Trusted
Publisher config, and the credential and node type IDs.

Rationale: The package name and eligibility are foundational and expensive to change after
scaffolding; resolving them first prevents a costly rebuild (section 3).

### XIV. Automated, Provenance-Only Releases via release-please

Releases MUST be automated from Conventional Commits. `release-please` (action v4,
`release-type: node`) owns version bumps, `CHANGELOG.md`, git tags, and the GitHub Release.
Publishing to npm MUST occur ONLY through the GitHub Actions provenance workflow
(`publish.yml`, triggered on `release: published`, with `id-token: write` for OIDC and
`--provenance`). Versions MUST NEVER be bumped by hand and the package MUST NEVER be
published from a local machine. Conventional Commits MUST be enforced locally (lefthook +
commitlint) and in CI (PR-title lint), since squash-merge uses the PR title.

Rationale: Automated, provenance-only releases give a clean developer experience and a
verifiable supply-chain audit trail with no long-lived registry token (section 18, NFR-7).

## Additional Constraints

- **Scope (v1):** Action node only; no trigger. Resources are Record, Note, and Task.
  Standalone Lists and Entries resources (managing lists or creating/editing list entries
  directly), Webhooks/trigger, and typed attribute builders are deferred to later versions.
  This deferral does NOT exclude the Record **List Entries** read operation (FR-003,
  `GET …/records/{id}/entries`), which is part of the locked 19-operation matrix. `values`
  and `filter` are raw JSON fields in v1.
- **Toolchain:** Scaffold via `npm create @n8n/node`; `@n8n/node-cli` >= 0.23.0 as a
  devDependency; Node >= 22.22; TypeScript incremental OFF.
- **Linter clean:** MUST pass `eslint-plugin-n8n-nodes-base` and
  `npx @n8n/scan-community-package n8n-nodes-attio` (NFR-6).
- **Supply-chain posture:** least-privilege `GITHUB_TOKEN` (top-level `contents: read`,
  widened per job only as needed), actions pinned to at least a major version, branch
  protection on `main` requiring green CI and a conventional PR title.

## Development Workflow & Quality Gates

- **Tests first:** Pure-core unit tests (Principle VIII) precede wiring or live
  verification for each operation.
- **CI gates (every PR and push to `main`, all must pass before merge):** `npm ci`,
  `npm run lint`, the community scan, `tsc --noEmit`, `npm run build`, `npm test`, the
  zero-dependency assertion, and the conventional PR-title lint.
- **Verify-live gates:** Each [VERIFY-LIVE] item in brief section 15 is confirmed against a
  real Attio workspace; an AI-Agent tool-path check runs before an operation is done.
- **Build order:** credential + `getObjects` dropdown first, then Record operations
  (Create, Get, Update both modes, Upsert, Get Many, Search, Delete, secondary reads),
  then Notes, then Tasks. The CI/CD pipeline stands up early so every operation merges
  through green CI.
- **Review:** Reviewers MUST verify compliance with every applicable principle above before
  approving; deviations require explicit, recorded justification.

## Governance

This constitution supersedes other practices for `n8n-nodes-attio`. Amendments MUST be
proposed as a documented change to this file, reviewed, and approved before taking effect;
each amendment records its rationale in the Sync Impact Report and propagates to dependent
templates and docs.

Versioning of this constitution follows semantic versioning:
- **MAJOR** — backward-incompatible governance changes or principle removals/redefinitions.
- **MINOR** — a new principle or section, or materially expanded guidance.
- **PATCH** — clarifications and wording fixes with no semantic change.

Compliance is reviewed at every spec, plan, and PR stage. The plan template's Constitution
Check derives its gates from this file; planners and reviewers MUST keep that check aligned
with the principles here. Locked decisions (Principle XII) are not subject to relitigation
through normal review — only through a recorded amendment.

**Version**: 1.0.1 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-06-22
