/**
 * Regression guard: every user-controlled path segment must be URL-encoded.
 *
 * The declarative routing URLs interpolate node parameters straight into the request path
 * (e.g. `/v2/objects/{object}/records/{recordId}`). Left raw, a value containing `/` or `..`
 * collapses during URL normalisation and redirects the call to a different Attio endpoint
 * than the operation advertises:
 *
 *   /v2/objects/companies/records/../../../../v2/webhooks  ->  https://api.attio.com/v2/webhooks
 *
 * That matters because the node sets `usableAsTool: true`, so an LLM agent supplies these
 * arguments and may be steered by prompt injection in retrieved CRM data. Wrapping each
 * segment in `encodeURIComponent` percent-encodes `/`, `?` and `#`, pinning every request to
 * the endpoint its operation declares. (`encodeURIComponent` is injected into n8n's expression
 * sandbox by `Expression.initializeGlobalContext`, so it is available inside `{{ }}`.)
 */
import { recordDescription } from '../../nodes/Attio/descriptions/record.description';
import { noteDescription } from '../../nodes/Attio/descriptions/note.description';
import { taskDescription } from '../../nodes/Attio/descriptions/task.description';

/** Every `routing.request.url` string anywhere in a description tree. */
function collectRoutingUrls(value: unknown, found: string[] = []): string[] {
	if (Array.isArray(value)) {
		for (const entry of value) collectRoutingUrls(entry, found);
		return found;
	}
	if (value && typeof value === 'object') {
		const node = value as Record<string, unknown>;
		const request = (node.routing as Record<string, unknown> | undefined)?.request as
			| Record<string, unknown>
			| undefined;
		if (typeof request?.url === 'string') found.push(request.url);
		for (const child of Object.values(node)) collectRoutingUrls(child, found);
	}
	return found;
}

/** Every `{{ ... }}` interpolation inside a routing template. */
function interpolations(url: string): string[] {
	return Array.from(url.matchAll(/\{\{(.*?)\}\}/g), (match) => match[1].trim());
}

const ENCODED_SEGMENT = /^encodeURIComponent\(\s*\$parameter\.[A-Za-z0-9_]+\s*\)$/;

describe('routing URL path-segment encoding', () => {
	const urls = collectRoutingUrls([recordDescription, noteDescription, taskDescription]);

	it('finds the routing templates it is meant to guard', () => {
		// Guards the guard: a refactor that hides the routing objects must fail loudly
		// rather than let this suite pass vacuously over an empty list.
		expect(urls.length).toBeGreaterThanOrEqual(18);
	});

	it('wraps every $parameter path segment in encodeURIComponent', () => {
		const unencoded = urls.flatMap((url) =>
			interpolations(url)
				.filter((expression) => expression.includes('$parameter'))
				.filter((expression) => !ENCODED_SEGMENT.test(expression))
				.map((expression) => `${url} -> ${expression}`),
		);
		expect(unencoded).toEqual([]);
	});

	it('leaves no raw {{$parameter.x}} segment in any routing URL', () => {
		expect(urls.filter((url) => /\{\{\s*\$parameter\./.test(url))).toEqual([]);
	});

	it('keeps every routing URL a relative path (no absolute URL can retarget the host)', () => {
		for (const url of urls) {
			expect(url.replace(/^=/, '')).toMatch(/^\//);
		}
	});
});
