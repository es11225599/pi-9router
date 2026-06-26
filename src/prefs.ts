/**
 * Persistent extension preferences for pi-9router.
 *
 * Stores the API key and base URL in pi's agent directory so the extension
 * works without requiring environment variables every session.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface PrefsData {
	apiKey?: string;
	baseUrl?: string;
}

export function getPrefsPath(): string {
	const agentDir = process.env.PI_AGENT_DIR || join(homedir(), ".pi", "agent");
	return join(agentDir, "pi-9router.json");
}

function readPrefs(): PrefsData {
	const path = getPrefsPath();
	if (!existsSync(path)) return {};
	try {
		const content = readFileSync(path, "utf8");
		if (!content.trim()) return {};
		return JSON.parse(content) as PrefsData;
	} catch {
		return {};
	}
}

export function savePrefs(prefs: Partial<PrefsData>): void {
	const path = getPrefsPath();
	const dir = dirname(path);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true, mode: 0o700 });
	}

	const current = readPrefs();
	const merged: PrefsData = { ...current };
	if (prefs.apiKey !== undefined) {
		if (prefs.apiKey.length > 0) merged.apiKey = prefs.apiKey;
		else delete merged.apiKey;
	}
	if (prefs.baseUrl !== undefined) {
		if (prefs.baseUrl.length > 0) merged.baseUrl = prefs.baseUrl;
		else delete merged.baseUrl;
	}

	writeFileSync(path, JSON.stringify(merged, null, 2), { encoding: "utf-8", mode: 0o600 });
}

export function removeApiKey(): void {
	savePrefs({ apiKey: "" });
}

export function getStoredApiKey(): string | undefined {
	const key = readPrefs().apiKey;
	if (typeof key === "string" && key.length > 0) return key;
	return undefined;
}

export function getStoredBaseUrl(): string | undefined {
	const url = readPrefs().baseUrl;
	if (typeof url === "string" && url.length > 0) return url;
	return undefined;
}

export function hasApiKey(): boolean {
	return process.env.NINEROUTER_API_KEY !== undefined && process.env.NINEROUTER_API_KEY.length > 0
		? true
		: getStoredApiKey() !== undefined;
}

export function getApiKeySource(): "env" | "stored" | "none" {
	if (process.env.NINEROUTER_API_KEY && process.env.NINEROUTER_API_KEY.length > 0) return "env";
	if (getStoredApiKey()) return "stored";
	return "none";
}

export function getBaseUrlSource(): "env" | "stored" | "default" {
	if (process.env.NINEROUTER_BASE_URL && process.env.NINEROUTER_BASE_URL.length > 0) return "env";
	if (getStoredBaseUrl()) return "stored";
	return "default";
}
