# Contract: `getObjects` loadOptions

## Purpose
Populate the Object dropdown (and Search `objects` multiOptions) from the user's own workspace. This is the single piece justifying hand-building over the auto-generated node (Principle XI).

## Mechanism
- Programmatic `methods.loadOptions.getObjects` (sanctioned; not a runtime dependency).
- Request: `GET /v2/objects` via `this.helpers.httpRequestWithAuthentication('attioApi', ...)`.
- Map each element with the pure `mapObjectsToOptions`:
  - option **name** = `plural_noun` ?? `singular_noun` ?? `api_slug`
  - option **value** = `api_slug`
- Returns `INodePropertyOptions[]`. No caching (runs at design time).

## Scopes
- `object_configuration:read`.

## Errors
- Surface failures via `formatAttioError`; a 403 here means the token lacks `object_configuration:read`.

## Verify-live gates
- [ ] Dropdown populates with People, Companies, Deals, and any custom objects, by readable name (SC-001).
