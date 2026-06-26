/**
 * Orchestrates all pi-9router tests and exits non-zero if any required test fails.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const scripts = [
	{ file: "test-prefs.ts", required: true },
	{ file: "test-mapping.ts", required: true },
	{ file: "test-extension-load.ts", required: true },
	{ file: "test-real-mapping.ts", required: false },
];

let failed = 0;
let passed = 0;
let skipped = 0;

for (const { file, required } of scripts) {
	const scriptPath = path.resolve(process.cwd(), "scripts", file);
	const result = spawnSync(
		process.execPath,
		["--import", "jiti/register", scriptPath],
		{ stdio: "inherit", encoding: "utf8" },
	);

	if (result.status === 0) {
		passed++;
		console.log(`✓ ${file}`);
	} else if (!required) {
		skipped++;
		console.log(`○ ${file} (optional, skipped or failed)`);
	} else {
		failed++;
		console.error(`✗ ${file} failed`);
	}
}

console.log(`\n${passed} passed, ${skipped} optional skipped, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
