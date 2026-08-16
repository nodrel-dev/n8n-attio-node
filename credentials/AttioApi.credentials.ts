import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Attio API credential (Principle III).
 *
 * A single workspace-scoped API token, created in Attio under
 * Workspace Settings → Developers. Auth is a Bearer header; the token is a `password`
 * field so it is never displayed, logged, or echoed (NFR-9).
 *
 * The credential test hits `GET /v2/self`, which succeeds for ANY valid token regardless
 * of scope. Scope coverage is therefore NOT validated here — a single-scope token passes
 * the test and only 403s at runtime (Principle IV). The field description lists the refined
 * per-operation scope table (research.md R2) so users provision the right scopes up front.
 */
export class AttioApi implements ICredentialType {
	name = 'attioApi';

	displayName = 'Attio API';

	icon: Icon = { light: 'file:attio.svg', dark: 'file:attio.dark.svg' };

	documentationUrl = 'https://docs.attio.com/rest-api/how-to/get-started';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Workspace API token from Attio → Workspace Settings → Developers. The token must carry the scopes for the operations you use. Record reads need record_permission:read + object_configuration:read; record writes need record_permission:read-write + object_configuration:read (List Entries also needs list_entry:read). Notes need note:read / note:read-write plus object_configuration:read + record_permission:read. Tasks need task:read / task:read-write plus object_configuration:read + record_permission:read + user_management:read. Note and Task Delete need only the resource write scope. The credential test (/v2/self) only confirms the token is valid, not that it has these scopes.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.attio.com',
			url: '/v2/self',
			method: 'GET',
		},
	};
}
