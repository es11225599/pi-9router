/**
 * Pi extension / package entry point.
 *
 * This extension registers 9router as a pi model provider. It discovers the
 * models exposed by a running 9router instance and enriches them with metadata
 * from https://models.dev/api.json (context window, output limit, reasoning,
 * modalities and pricing).
 *
 * Environment variables:
 *   - NINEROUTER_BASE_URL  default: http://localhost:20128/v1
 *   - NINEROUTER_API_KEY   optional API key for protected 9router instances
 *
 * Commands:
 *   /9router-status      Show 9router connection and registered model status.
 *   /9router-refresh     Re-fetch 9router models and re-register the provider.
 *   /9router-setup       Set the 9router base URL and API key.
 *   /9router-remove-key  Remove the saved 9router API key.
 */

import type { ExtensionAPI, ModelRegistry, ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import { escapeProviderApiKey, getApiKey, getBaseUrl, PROVIDER_NAME } from "./config.ts";
import { enrichModel, type ModelsDevApi, type NineRouterModel } from "./mapping.ts";
import { fetchModelsDevApi } from "./modelsdev.ts";
import { fetchNineRouterModels, type NineRouterModelsResponse } from "./ninerouter.ts";
import { getApiKeySource, getBaseUrlSource, getStoredApiKey, getStoredBaseUrl, hasApiKey, removeApiKey, savePrefs } from "./prefs.ts";
import { notify, showInfoPanel } from "./ui.ts";

const DEFAULT_MODELS: ProviderModelConfig[] = [
	{
		id: "openai/gpt-4o",
		name: "GPT-4o (via 9router)",
		reasoning: false,
		input: ["text", "image"],
		cost: { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
		contextWindow: 128_000,
		maxTokens: 16_384,
	},
	{
		id: "anthropic/claude-sonnet-4-20250514",
		name: "Claude Sonnet 4 (via 9router)",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
		contextWindow: 200_000,
		maxTokens: 32_768,
	},
];

let lastModelsDev: ModelsDevApi | undefined;
let lastNineRouterResponse: NineRouterModelsResponse | undefined;
let registered = false;

function nineRouterModelsToProviderModels(
	nr: NineRouterModelsResponse,
	modelsDev: ModelsDevApi,
): ProviderModelConfig[] {
	const models = nr.data ?? [];
	const result: ProviderModelConfig[] = [];

	for (const m of models) {
		if (m.kind && m.kind !== "llm" && m.kind !== "imageToText") continue;
		const enriched = enrichModel(m as NineRouterModel, modelsDev);
		result.push({
			id: enriched.id,
			name: enriched.name,
			reasoning: enriched.reasoning,
			input: enriched.input,
			cost: enriched.cost,
			contextWindow: enriched.contextWindow,
			maxTokens: enriched.maxTokens,
		});
	}
	return result;
}

async function discoverAndRegister(pi: ExtensionAPI): Promise<void> {
	const baseUrl = getBaseUrl();

	const actualApiKey = getApiKey();
	const providerApiKey = actualApiKey ? escapeProviderApiKey(actualApiKey) : "no-key-required";
	const authHeader = actualApiKey !== undefined;

	let modelsDev: ModelsDevApi | undefined;
	let nineRouterResponse: NineRouterModelsResponse | undefined;

	try {
		[modelsDev, nineRouterResponse] = await Promise.all([
			fetchModelsDevApi(),
			fetchNineRouterModels(baseUrl, actualApiKey),
		]);
	} catch {
		try {
			modelsDev = await fetchModelsDevApi();
		} catch {
			modelsDev = undefined;
		}
	}

	lastModelsDev = modelsDev;
	if (nineRouterResponse) lastNineRouterResponse = nineRouterResponse;

	let models: ProviderModelConfig[];
	if (nineRouterResponse && modelsDev) {
		models = nineRouterModelsToProviderModels(nineRouterResponse, modelsDev);
		if (models.length === 0) models = DEFAULT_MODELS;
	} else {
		models = DEFAULT_MODELS;
	}

	if (registered) pi.unregisterProvider(PROVIDER_NAME);

	pi.registerProvider(PROVIDER_NAME, {
		name: "9Router",
		baseUrl,
		apiKey: providerApiKey,
		api: "openai-completions",
		authHeader,
		models,
	});

	registered = true;
}

function countProviderModels(ctx: { modelRegistry: ModelRegistry }) {
	const all = ctx.modelRegistry.getAll().filter((m) => m.provider === PROVIDER_NAME);
	const available = all.filter((m) => ctx.modelRegistry.hasConfiguredAuth(m)).length;
	return { total: all.length, available };
}

export default async function (pi: ExtensionAPI): Promise<void> {
	await discoverAndRegister(pi);

	pi.registerCommand("9router-status", {
		description: "Show 9router connection and registered model status",
		handler: async (_args, ctx) => {
			const baseUrl = getBaseUrl();
			const discovered = lastNineRouterResponse?.data ?? [];
			const keyConfigured = hasApiKey();
			const { total, available } = countProviderModels(ctx);
			await showInfoPanel(ctx, "9router status", [
				{ label: "baseUrl", value: baseUrl },
				{ label: "baseUrl source", value: getBaseUrlSource() },
				{ label: "reachable", value: discovered.length > 0 ? "yes" : "no" },
				{ label: "apiKey", value: keyConfigured ? "configured" : "not set (optional)" },
				{ label: "apiKey source", value: getApiKeySource() },
				{ label: "discovered", value: `${discovered.length} models` },
				{ label: "available", value: `${available}/${total} in /model` },
			]);
		},
	});

	pi.registerCommand("9router-refresh", {
		description: "Re-fetch 9router models and re-register the provider",
		handler: async (_args, ctx) => {
			try {
				await discoverAndRegister(pi);
				const { total, available } = countProviderModels(ctx);
				await showInfoPanel(ctx, "9router refreshed", [
					{ label: "models available", value: `${available}/${total}` },
					{ label: "reachable", value: (lastNineRouterResponse?.data.length ?? 0) > 0 ? "yes" : "no" },
				]);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				notify(ctx, `refresh failed: ${message}`, "error");
			}
		},
	});

	pi.registerCommand("9router-setup", {
		description: "Set the 9router base URL and API key",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				notify(ctx, "Setup is only available in the interactive TUI", "warning");
				return;
			}

			const defaultBaseUrl = "http://localhost:20128/v1";
			const storedBaseUrl = getStoredBaseUrl();
			const envBaseUrl = process.env.NINEROUTER_BASE_URL;
			const currentBaseUrl = envBaseUrl || storedBaseUrl || defaultBaseUrl;
			const currentKey = getStoredApiKey() || "";

			const baseUrl = await ctx.ui.input(
				"9router base URL (empty = default)",
				currentBaseUrl,
			);
			if (baseUrl === undefined) {
				notify(ctx, "Setup cancelled", "info");
				return;
			}

			const apiKey = await ctx.ui.input(
				"9router API key (optional)",
				currentKey,
			);
			if (apiKey === undefined) {
				notify(ctx, "Setup cancelled", "info");
				return;
			}

			try {
				savePrefs({
					baseUrl: baseUrl.length > 0 ? baseUrl : undefined,
					apiKey: apiKey.length > 0 ? apiKey : undefined,
				});
				await discoverAndRegister(pi);
				const { total, available } = countProviderModels(ctx);
				await showInfoPanel(ctx, "9router setup saved", [
					{ label: "baseUrl", value: getBaseUrl() },
					{ label: "baseUrl source", value: baseUrl.length > 0 ? "stored" : "default" },
					{ label: "apiKey", value: apiKey.length > 0 ? "configured" : "not set (optional)" },
					{ label: "models available", value: `${available}/${total}` },
				]);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				notify(ctx, `setup failed: ${message}`, "error");
			}
		},
	});

	pi.registerCommand("9router-remove-key", {
		description: "Remove the saved 9router API key",
		handler: async (_args, ctx) => {
			try {
				removeApiKey();
				await discoverAndRegister(pi);
				const { total, available } = countProviderModels(ctx);
				await showInfoPanel(ctx, "9router key removed", [
					{ label: "models available", value: `${available}/${total}` },
					{ label: "apiKey", value: "not set (optional)" },
				]);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				notify(ctx, `failed to remove key: ${message}`, "error");
			}
		},
	});
}
