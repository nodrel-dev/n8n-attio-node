# Contract: `attioApi` credential

## Definition
- `name: 'attioApi'`, `displayName: 'Attio API'`.
- Field: `apiToken` (string, `typeOptions.password: true`, required).
- Auth (generic): header `Authorization: =Bearer {{$credentials.apiToken}}`.
- `documentationUrl`: Attio "get started" REST docs.

## Credential test
- `GET https://api.attio.com/v2/self`.
- **Valid** token → `{ active: true, scope, sub (workspace_id), ... }` → save succeeds.
- **Invalid/revoked** → `{ active: false }` or 401 → save fails at the credential dialog (FR-1, SC-002).
- The test confirms validity **only**, not scope coverage. A single-scope token passes the test then 403s at runtime (Principle IV). **[VERIFY-LIVE]**

## Description / docs requirement
The field description and README MUST list the refined scope table (research.md R2), highlighting:
- Record reads need `record_permission:read` + `object_configuration:read`.
- Notes/Tasks additionally need `object_configuration:read` + `record_permission:read`; Tasks also `user_management:read`.
- Note/Task **Delete** need only the resource write scope.

Token never logged or echoed (NFR-9).

## Verify-live gates
- [ ] Valid token saves; invalid token rejected at dialog.
- [ ] Single-read-scope token 403s on a record read with a scope-naming message.
