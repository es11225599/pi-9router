import { getStoredApiKey, getStoredBaseUrl } from "./prefs.ts";

/**
 * Configuration helpers for the 9router pi extension.
 *
 * The extension reads connection details in this order:
 *   1. Environment variables (NINEROUTER_BASE_URL, NINEROUTER_API_KEY)
 *   2. Stored extension preferences (~/.pi/agent/pi-9router.json)
 *   3. Defaults (http://localhost:20128/v1, no API key)
 */

export const DEFAULT_BASE_URL = "http://localhost:20128/v1";
export const PROVIDER_NAME = "9router";
export const MODELS_DEV_API_URL = "https://models.dev/api.json";

export function getBaseUrl(): string {
	const env = process.env.NINEROUTER_BASE_URL;
	const stored = getStoredBaseUrl();
	const candidate = env || stored || DEFAULT_BASE_URL;
	const trimmed = candidate.replace(/\/$/, "");
	if (trimmed.endsWith("/v1")) return trimmed;
	return `${trimmed}/v1`;
}

/**
 * Escape a literal API key so pi's `$ENV` interpolation does not mangle it.
 * `$$` is parsed back to a literal `$` by pi's config-value resolver.
 */
export function escapeProviderApiKey(key: string): string {
	return key.replace(/\$/g, "$$");
}

/**
 * Return the configured 9router API key, if any.
 *
 * 9router does not require an API key, so this returns `undefined` when
 * neither the env var nor a stored key exists.
 */
export function getApiKey(): string | undefined {
	const env = process.env.NINEROUTER_API_KEY;
	if (env) return env;
	return getStoredApiKey();
}
