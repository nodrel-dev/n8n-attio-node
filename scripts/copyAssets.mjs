// Copies non-TS node assets (icons, codex metadata) into dist/, preserving paths.
// Used by `npm run build` after `tsc`, since tsc only emits compiled JS.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ASSET_EXTENSIONS = ['.svg', '.png', '.json'];
const SOURCE_DIRS = ['nodes', 'credentials'];
const DIST = 'dist';

function walk(dir, onFile) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full, onFile);
		} else if (ASSET_EXTENSIONS.some((ext) => full.endsWith(ext))) {
			onFile(full);
		}
	}
}

let copied = 0;
for (const srcDir of SOURCE_DIRS) {
	if (!existsSync(srcDir)) continue;
	walk(srcDir, (file) => {
		const target = join(DIST, relative('.', file));
		mkdirSync(dirname(target), { recursive: true });
		cpSync(file, target);
		copied += 1;
	});
}

console.log(`copyAssets: copied ${copied} asset(s) into ${DIST}/`);
