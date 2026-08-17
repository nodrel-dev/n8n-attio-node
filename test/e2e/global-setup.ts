import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { request, type FullConfig } from '@playwright/test';

import { ensureCredential, ensureSignedIn } from './support/n8n-client';

/**
 * Prepares the n8n instance once per run: signs in (creating the owner on a fresh
 * volume), provisions both Attio credentials, and persists the session plus the
 * credential ids for the specs to consume.
 */

export const AUTH_STATE = resolve(__dirname, '.auth/state.json');
export const CREDENTIALS_FILE = resolve(__dirname, '.auth/credentials.json');

export interface SeedCredentials {
	fullId: string;
	fullName: string;
	restrictedId: string;
	restrictedName: string;
}

export const CREDENTIAL_NAMES = {
	full: 'Attio Full (e2e)',
	restricted: 'Attio Restricted (e2e)',
} as const;

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`${name} is not set. The UI suite drives the live Attio API — export it, or ` +
				`source .env.local, before running. See test/e2e/README.md.`,
		);
	}
	return value;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
	const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:5678';

	const fullToken = requireEnv('ATTIO_API_TOKEN_FULL');
	const restrictedToken = requireEnv('ATTIO_API_TOKEN');

	const context = await request.newContext({ baseURL });

	// n8n serves a plain-text "starting up" body before it is ready.
	const deadline = Date.now() + 120_000;
	for (;;) {
		try {
			const probe = await context.get('/rest/settings');
			if (probe.ok() && (await probe.text()).includes('"data"')) break;
		} catch {
			// connection refused while the container boots
		}
		if (Date.now() > deadline) {
			throw new Error(
				`n8n at ${baseURL} did not become ready within 120s. Start the harness first ` +
					`(see test/e2e/README.md).`,
			);
		}
		await new Promise((r) => setTimeout(r, 2_000));
	}

	await ensureSignedIn(context);

	const credentials: SeedCredentials = {
		fullId: await ensureCredential(context, CREDENTIAL_NAMES.full, fullToken),
		fullName: CREDENTIAL_NAMES.full,
		restrictedId: await ensureCredential(context, CREDENTIAL_NAMES.restricted, restrictedToken),
		restrictedName: CREDENTIAL_NAMES.restricted,
	};

	mkdirSync(dirname(AUTH_STATE), { recursive: true });
	await context.storageState({ path: AUTH_STATE });
	writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
	await context.dispose();
}
