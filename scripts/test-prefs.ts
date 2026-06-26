/**
 * Test the preferences persistence and config fallback chain.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getApiKey, getBaseUrl } from "../src/config.ts";
import {
	getApiKeySource,
	getBaseUrlSource,
	getPrefsPath,
	getStoredApiKey,
	getStoredBaseUrl,
	hasApiKey,
	removeApiKey,
	savePrefs,
} from "../src/prefs.ts";

function assert(cond: boolean, message: string) {
	if (!cond) throw new Error(`ASSERT FAILED: ${message}`);
}

async function main() {
	const originalEnvKey = process.env.NINEROUTER_API_KEY;
	const originalEnvUrl = process.env.NINEROUTER_BASE_URL;
	const originalAgentDir = process.env.PI_AGENT_DIR;

	const tempDir = mkdtempSync(join(tmpdir(), "pi-9router-prefs-test-"));
	process.env.PI_AGENT_DIR = tempDir;

	try {
		console.log("prefs path:", getPrefsPath());

		delete process.env.NINEROUTER_API_KEY;
		delete process.env.NINEROUTER_BASE_URL;
		savePrefs({ apiKey: undefined, baseUrl: undefined });

		assert(getBaseUrl() === "http://localhost:20128/v1", "default base URL");
		assert(getApiKey() === undefined, "no key by default");
		assert(!hasApiKey(), "no key configured");
		assert(getApiKeySource() === "none", "key source none");
		assert(getBaseUrlSource() === "default", "base URL source default");

		savePrefs({ baseUrl: "http://example.com/v1" });
		assert(getBaseUrl() === "http://example.com/v1", "stored base URL used");
		assert(getBaseUrlSource() === "stored", "base URL source stored");

		savePrefs({ apiKey: "secret-key-123" });
		assert(getApiKey() === "secret-key-123", "stored API key used");
		assert(hasApiKey(), "has stored key");
		assert(getApiKeySource() === "stored", "key source stored");

		process.env.NINEROUTER_API_KEY = "env-key";
		assert(getApiKey() === "env-key", "env key takes precedence");
		assert(getApiKeySource() === "env", "key source env");

		process.env.NINEROUTER_BASE_URL = "http://env.example.com/v1";
		assert(getBaseUrl() === "http://env.example.com/v1", "env base URL takes precedence");
		assert(getBaseUrlSource() === "env", "base URL source env");

		removeApiKey();
		assert(getStoredApiKey() === undefined, "stored key removed");
		assert(getApiKey() === "env-key", "env key still present");

		delete process.env.NINEROUTER_API_KEY;
		assert(getApiKey() === undefined, "no key after env removed");
		assert(getApiKeySource() === "none", "key source none after cleanup");

		console.log("Preferences tests passed.");
	} finally {
		if (originalEnvKey !== undefined) process.env.NINEROUTER_API_KEY = originalEnvKey;
		else delete process.env.NINEROUTER_API_KEY;
		if (originalEnvUrl !== undefined) process.env.NINEROUTER_BASE_URL = originalEnvUrl;
		else delete process.env.NINEROUTER_BASE_URL;
		if (originalAgentDir !== undefined) process.env.PI_AGENT_DIR = originalAgentDir;
		else delete process.env.PI_AGENT_DIR;
		rmSync(tempDir, { recursive: true, force: true });
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
