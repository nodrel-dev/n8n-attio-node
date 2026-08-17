/**
 * Brings up the n8n instance the UI suite runs against.
 *
 * Builds and packs the *local* node, installs the tarball into a scratch package,
 * and mounts that into an n8n container as a custom extension — so the suite tests
 * the working tree, never whatever happens to be published on npm.
 *
 * Usage:
 *   node scripts/e2eHarness.mjs up      # build, pack, start, wait for ready
 *   node scripts/e2eHarness.mjs down    # stop and remove container + volume
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CONTAINER = 'n8n-attio-e2e';
const VOLUME = 'n8n_attio_e2e';
const PORT = process.env.N8N_E2E_PORT ?? '5678';
const IMAGE = 'docker.n8n.io/n8nio/n8n:latest';

const run = (cmd, args, opts = {}) =>
	execFileSync(cmd, args, { stdio: 'inherit', encoding: 'utf8', ...opts });

const capture = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

function down() {
	try {
		run('docker', ['rm', '-f', CONTAINER], { stdio: 'ignore' });
	} catch {
		// not running
	}
	try {
		run('docker', ['volume', 'rm', VOLUME], { stdio: 'ignore' });
	} catch {
		// no volume
	}
	console.log('harness: stopped');
}

async function up() {
	console.log('harness: building the local node');
	run('npm', ['run', 'build']);

	const tarball = capture('npm', ['pack', '--silent', '--pack-destination', tmpdir()])
		.split('\n')
		.pop()
		.trim();

	const stage = mkdtempSync(join(tmpdir(), 'n8n-attio-e2e-'));
	writeFileSync(join(stage, 'package.json'), JSON.stringify({ name: 'stage', private: true }));
	console.log(`harness: staging ${tarball}`);
	run('npm', ['install', '--silent', join(tmpdir(), tarball)], { cwd: stage });

	down();

	console.log('harness: starting n8n');
	run('docker', [
		'run', '-d',
		'--name', CONTAINER,
		'-p', `${PORT}:5678`,
		'-e', 'N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom',
		'-e', 'N8N_ENCRYPTION_KEY=local-dev-attio-verify-key',
		'-e', 'N8N_SECURE_COOKIE=false',
		'-e', 'N8N_DIAGNOSTICS_ENABLED=false',
		'-v', `${VOLUME}:/home/node/.n8n`,
		'-v', `${join(stage, 'node_modules/@nodrel-dev/n8n-nodes-attio')}:/home/node/.n8n/custom/n8n-nodes-attio:ro`,
		IMAGE,
	]);

	process.stdout.write('harness: waiting for n8n');
	const deadline = Date.now() + 120_000;
	for (;;) {
		try {
			const body = await fetch(`http://localhost:${PORT}/rest/settings`).then((r) => r.text());
			if (body.includes('"data"')) break;
		} catch {
			// still booting
		}
		if (Date.now() > deadline) throw new Error('\nn8n did not become ready within 120s');
		process.stdout.write('.');
		await new Promise((r) => setTimeout(r, 2000));
	}

	console.log(`\nharness: ready at http://localhost:${PORT}`);
}

const command = process.argv[2] ?? 'up';
if (command === 'down') down();
else await up();
