/**
 * Mapping between 9router provider aliases and the corresponding provider ids
 * in the models.dev API (https://models.dev/api.json).
 *
 * 9router exposes upstream providers using short aliases (e.g. `kr` for Kiro,
 * `gemini` for Google Gemini). models.dev uses full provider ids (e.g. `google`).
 * This table bridges the two so we can enrich a 9router model like
 * `gemini/gemini-2.5-pro` with context window, output limit, reasoning and
 * pricing data from models.dev.
 */

export const MODELS_DEV_PROVIDER_URL = "https://models.dev/api.json";

/**
 * Map of 9router provider alias -> models.dev provider id.
 * Only LLM/chat-capable providers are listed. Media-only, search-only and
 * OAuth-proxy providers are omitted and will use fallback defaults.
 */
export const ALIAS_TO_MODELS_DEV_PROVIDER: Record<string, string> = {
	// Direct matches
	openai: "openai",
	anthropic: "anthropic",
	google: "google",
	deepseek: "deepseek",
	openrouter: "openrouter",
	minimax: "minimax",
	"minimax-cn": "minimax-cn",
	mistral: "mistral",
	groq: "groq",
	huggingface: "huggingface",
	azure: "azure",
	nvidia: "nvidia",
	cerebras: "cerebras",
	perplexity: "perplexity",
	"perplexity-web": "perplexity",
	xai: "xai",
	cohere: "cohere",
	nebius: "nebius",
	siliconflow: "siliconflow",
	"siliconflow-cn": "siliconflow-cn",
	chutes: "chutes",
	"fireworks-ai": "fireworks-ai",
	fireworks: "fireworks-ai",
	together: "togetherai",
	"together-ai": "togetherai",
	venice: "venice",

	// Alias redirects
	gemini: "google",
	"gemini-cli": "google",
	vertex: "google-vertex",
	"vertex-partner": "google-vertex",
	"google-vertex": "google-vertex",

	qwen: "alibaba",
	"qwen-cn": "alibaba-cn",
	alibaba: "alibaba",
	glm: "zhipuai",
	"glm-cn": "zhipuai",
	zhipuai: "zhipuai",
	kimi: "moonshotai",
	"kimi-coding": "moonshotai-cn",
	moonshotai: "moonshotai",

	"grok-web": "xai",

	// Free / token-plan providers that also appear on models.dev
	kiro: "kilo",
	kilocode: "kilo",
	"xiaomi-mimo": "xiaomi",
	"xiaomi-tokenplan": "xiaomi-token-plan-cn",
	"xiaomi-tokenplan-ams": "xiaomi-token-plan-ams",
	"xiaomi-tokenplan-sgp": "xiaomi-token-plan-sgp",
	"mimo-free": "xiaomi",
	mmf: "xiaomi",

	"alibaba-coding-plan": "alibaba-coding-plan",
	"alibaba-coding-plan-cn": "alibaba-coding-plan-cn",
	"alibaba-token-plan": "alibaba-token-plan",
	"alibaba-token-plan-cn": "alibaba-token-plan-cn",
	"minimax-coding-plan": "minimax-coding-plan",
	"minimax-cn-coding-plan": "minimax-cn-coding-plan",
	"kimi-for-coding": "kimi-for-coding",
	"zai-coding-plan": "zai-coding-plan",
	"zai-coding-plan-cn": "zai-coding-plan-cn",

	// Other routing / gateway providers present in models.dev
	"vercel-ai-gateway": "vercel",
	"cloudflare-ai-gateway": "cloudflare-ai-gateway",
	"cloudflare-ai": "cloudflare-workers-ai",
	"github-copilot": "github-copilot",
	github: "github-models",
	"codebuddy-cn": "bailing",
	opencode: "opencode",
	"opencode-go": "opencode-go",
	qoder: "qihang-ai",
	iflow: "iflowcn",
	"iflowcn": "iflowcn",
	ollama: "ollama-cloud",
	"ollama-local": "ollama-cloud",
	blackbox: "blackbox",
	"brave-search": "brave", // search via chat model
	hyperbolic: "hyperbolic",
	"nanobanana": "nano-gpt",
};

/**
 * Models.dev model field shape that we care about.
 */
export interface ModelsDevModel {
	id: string;
	name: string;
	family?: string;
	attachment?: boolean;
	reasoning?: boolean | null;
	reasoning_options?: Array<{
		type?: string;
		values?: string[];
		min?: number;
		max?: number;
	}>;
	tool_call?: boolean;
	structured_output?: boolean;
	temperature?: boolean;
	knowledge?: string;
	release_date?: string;
	last_updated?: string;
	modalities?: {
		input?: string[];
		output?: string[];
	};
	open_weights?: boolean;
	status?: string;
	limit?: {
		context?: number;
		output?: number;
		input?: number;
	};
	cost?: {
		input?: number;
		output?: number;
		cache_read?: number;
		cache_write?: number;
	};
	interleaved?: {
		field?: string;
	};
	experimental?: boolean;
}

/**
 * Provider entry from models.dev.
 */
export interface ModelsDevProvider {
	id: string;
	name?: string;
	api?: string;
	doc?: string;
	env?: string[];
	npm?: string;
	models?: Record<string, ModelsDevModel>;
}

/**
 * Full models.dev API payload.
 */
export type ModelsDevApi = Record<string, ModelsDevProvider>;

const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_TOKENS = 8_192;
const DEFAULT_COST = 0;

/**
 * Provider priority used when a bare model id matches multiple providers.
 * Upstream/original providers are preferred over routers/gateways.
 */
const PROVIDER_PRIORITY: readonly string[] = [
	"openai",
	"anthropic",
	"google",
	"deepseek",
	"xai",
	"mistral",
	"alibaba",
	"moonshotai",
	"minimax",
	"zhipuai",
	"xiaomi",
	"nvidia",
	"cohere",
	"perplexity",
	"groq",
	"togetherai",
	"fireworks-ai",
	"hyperbolic",
	"ollama-cloud",
	"openrouter",
	"kilo",
	"requesty",
	"llmgateway",
];

const priorityRank = new Map(PROVIDER_PRIORITY.map((id, i) => [id, i]));

function bestProviderMatch<T extends { providerId: string }>(entries: T[]): T | undefined {
	if (entries.length === 0) return undefined;
	if (entries.length === 1) return entries[0];
	return entries.reduce((best, cur) => {
		const bestRank = priorityRank.get(best.providerId) ?? Number.MAX_SAFE_INTEGER;
		const curRank = priorityRank.get(cur.providerId) ?? Number.MAX_SAFE_INTEGER;
		return curRank < bestRank ? cur : best;
	});
}

interface GlobalIndexEntry {
	providerId: string;
	model: ModelsDevModel;
}

interface GlobalModelIndex {
	byExact: Map<string, GlobalIndexEntry[]>;
	byNormalized: Map<string, GlobalIndexEntry[]>;
	byNameNormalized: Map<string, GlobalIndexEntry[]>;
}

const globalIndexCache = new WeakMap<ModelsDevApi, GlobalModelIndex>();

function addToMap(map: Map<string, GlobalIndexEntry[]>, key: string, entry: GlobalIndexEntry) {
	const list = map.get(key);
	if (list) list.push(entry);
	else map.set(key, [entry]);
}

function buildGlobalModelIndex(modelsDev: ModelsDevApi): GlobalModelIndex {
	const cached = globalIndexCache.get(modelsDev);
	if (cached) return cached;

	const byExact = new Map<string, GlobalIndexEntry[]>();
	const byNormalized = new Map<string, GlobalIndexEntry[]>();
	const byNameNormalized = new Map<string, GlobalIndexEntry[]>();

	for (const [providerId, provider] of Object.entries(modelsDev)) {
		for (const [id, model] of Object.entries(provider.models ?? {})) {
			const entry: GlobalIndexEntry = { providerId, model };
			addToMap(byExact, id, entry);
			addToMap(byNormalized, normalizeModelId(id), entry);
			if (model.name) {
				addToMap(byNameNormalized, normalizeModelId(model.name), entry);
			}
		}
	}

	const index: GlobalModelIndex = { byExact, byNormalized, byNameNormalized };
	globalIndexCache.set(modelsDev, index);
	return index;
}

function* candidateModelIds(modelId: string) {
	yield modelId;
	let idx = modelId.indexOf("/");
	while (idx !== -1) {
		yield modelId.slice(idx + 1);
		idx = modelId.indexOf("/", idx + 1);
	}
}

function findModelGlobally(
	modelId: string,
	modelsDev: ModelsDevApi,
): { providerId: string; model: ModelsDevModel } | undefined {
	const index = buildGlobalModelIndex(modelsDev);
	const needle = normalizeModelId(modelId);

	for (const candidate of candidateModelIds(modelId)) {
		const normalizedCandidate = normalizeModelId(candidate);

		const exact = bestProviderMatch(index.byExact.get(candidate) ?? []);
		if (exact) return { providerId: exact.providerId, model: exact.model };

		const norm = bestProviderMatch(index.byNormalized.get(normalizedCandidate) ?? []);
		if (norm) return { providerId: norm.providerId, model: norm.model };

		// Name contains candidate.
		for (const [name, entries] of index.byNameNormalized) {
			if (name.includes(normalizedCandidate)) {
				const best = bestProviderMatch(entries);
				if (best) return { providerId: best.providerId, model: best.model };
			}
		}

		// Normalized id contains candidate.
		for (const [id, entries] of index.byNormalized) {
			if (id.includes(normalizedCandidate)) {
				const best = bestProviderMatch(entries);
				if (best) return { providerId: best.providerId, model: best.model };
			}
		}
	}

	return undefined;
}

/**
 * Normalize a model id for fuzzy matching.
 * Strips date suffixes, replaces separators with dashes, lowercases.
 */
function normalizeModelId(id: string): string {
	return id
		.toLowerCase()
		.replace(/[_\.]/g, "-")
		.replace(/-\d{8}$/, "") // e.g. claude-sonnet-4-20250514 -> claude-sonnet-4-5
		.replace(/-\d{6}$/, "")
		.replace(/-preview$/, "")
		.replace(/-latest$/, "")
		.replace(/-exp$/, "")
		.trim();
}

/**
 * Build an index of normalized model ids for a given models.dev provider.
 */
function buildNormalizedIndex(
	models: Record<string, ModelsDevModel> | undefined,
): Map<string, ModelsDevModel> {
	const index = new Map<string, ModelsDevModel>();
	if (!models) return index;
	for (const [id, model] of Object.entries(models)) {
		index.set(normalizeModelId(id), model);
		// Also index by normalized name.
		if (model.name) {
			index.set(normalizeModelId(model.name), model);
		}
	}
	return index;
}

export interface EnrichedModelDetails {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
	};
	contextWindow: number;
	maxTokens: number;
	modelsDev?: {
		provider: string;
		modelId: string;
	};
}

export interface NineRouterModel {
	id: string;
	object?: string;
	owned_by?: string;
	kind?: string;
}

/**
 * Extract the 9router alias and bare model id from a 9router model id.
 * 9router ids are always "alias/modelId" (e.g. "openai/gpt-4o").
 */
export function parseNineRouterModelId(
	fullId: string,
): { alias: string; modelId: string } | null {
	const slash = fullId.indexOf("/");
	if (slash <= 0 || slash === fullId.length - 1) return null;
	return {
		alias: fullId.slice(0, slash),
		modelId: fullId.slice(slash + 1),
	};
}

/**
 * Map a single 9router model to enriched details using models.dev data.
 */
export function enrichModel(
	ninerouterModel: NineRouterModel,
	modelsDev: ModelsDevApi,
): EnrichedModelDetails {
	const parsed = parseNineRouterModelId(ninerouterModel.id);

	if (!parsed) {
		return defaultDetails(ninerouterModel.id, ninerouterModel.id);
	}

	const { alias, modelId } = parsed;
	let modelsDevProviderId = ALIAS_TO_MODELS_DEV_PROVIDER[alias];
	const provider = modelsDevProviderId ? modelsDev[modelsDevProviderId] : undefined;
	const models = provider?.models;

	let matched: ModelsDevModel | undefined;

	if (models) {
		// 1. exact id match
		matched = models[modelId];

		// 2. normalized id match
		if (!matched) {
			const index = buildNormalizedIndex(models);
			matched = index.get(normalizeModelId(modelId));
		}

		// 3. try matching against the model name field
		if (!matched) {
			const needle = normalizeModelId(modelId);
			for (const m of Object.values(models)) {
				if (m.name && normalizeModelId(m.name).includes(needle)) {
					matched = m;
					break;
				}
				if (needle.includes(normalizeModelId(m.id))) {
					matched = m;
					break;
				}
			}
		}
	}

	// If no provider-specific match, try a global search by stripping any custom
	// provider prefix. For example "custom/gpt-4o" can match "openai/gpt-4o"
	// once the "custom/" alias is removed.
	if (!matched) {
		const global = findModelGlobally(modelId, modelsDev);
		if (global) {
			matched = global.model;
			modelsDevProviderId = global.providerId;
		}
	}

	if (matched) {
		return detailsFromModelsDev(
			ninerouterModel.id,
			matched,
			modelsDevProviderId || alias,
			matched.id,
		);
	}

	// 4. Some 9router connections expose upstream models with nested provider
	// prefixes, e.g. "kc/anthropic/claude-sonnet-4-20250514" (Kilo connection
	// exposing Anthropic models) or "nvidia/minimaxai/minimax-m2.7". Try to
	// interpret the first segment of the modelId as another 9router alias and
	// look up the remainder in the corresponding models.dev provider.
	if (!matched && modelId.includes("/")) {
		const innerSlash = modelId.indexOf("/");
		const innerAlias = modelId.slice(0, innerSlash);
		const innerModelId = modelId.slice(innerSlash + 1);
		const innerProviderId = ALIAS_TO_MODELS_DEV_PROVIDER[innerAlias];
		const innerProvider = innerProviderId ? modelsDev[innerProviderId] : undefined;
		if (innerProvider?.models) {
			matched = innerProvider.models[innerModelId];
			if (!matched) {
				const index = buildNormalizedIndex(innerProvider.models);
				matched = index.get(normalizeModelId(innerModelId));
			}
			if (!matched) {
				const needle = normalizeModelId(innerModelId);
				for (const m of Object.values(innerProvider.models)) {
					if (m.name && normalizeModelId(m.name).includes(needle)) {
						matched = m;
						break;
					}
					if (needle.includes(normalizeModelId(m.id))) {
						matched = m;
						break;
					}
				}
			}
			if (matched) {
				return detailsFromModelsDev(
					ninerouterModel.id,
					matched,
					innerProviderId || innerAlias,
					innerModelId,
				);
			}
		}
	}

	// Fallback: derive a friendly name from the model id.
	const fallbackName = ninerouterModel.id
		.split("/")
		.pop()!
		.replace(/-/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
	return defaultDetails(ninerouterModel.id, fallbackName);
}

function defaultDetails(id: string, name: string): EnrichedModelDetails {
	return {
		id,
		name,
		reasoning: false,
		input: ["text"],
		cost: {
			input: DEFAULT_COST,
			output: DEFAULT_COST,
			cacheRead: DEFAULT_COST,
			cacheWrite: DEFAULT_COST,
		},
		contextWindow: DEFAULT_CONTEXT_WINDOW,
		maxTokens: DEFAULT_MAX_TOKENS,
	};
}

function detailsFromModelsDev(
	id: string,
	model: ModelsDevModel,
	modelsDevProvider: string,
	modelsDevModelId: string,
): EnrichedModelDetails {
	const input: ("text" | "image")[] = [];
	for (const modality of model.modalities?.input ?? ["text"]) {
		if (modality === "text" || modality === "image") {
			input.push(modality);
		}
	}
	if (input.length === 0) input.push("text");

	const cost = model.cost ?? {};
	const limit = model.limit ?? {};

	return {
		id,
		name: model.name || id,
		reasoning: !!model.reasoning,
		input,
		cost: {
			input: cost.input ?? DEFAULT_COST,
			output: cost.output ?? DEFAULT_COST,
			cacheRead: cost.cache_read ?? DEFAULT_COST,
			cacheWrite: cost.cache_write ?? DEFAULT_COST,
		},
		contextWindow: limit.context ?? DEFAULT_CONTEXT_WINDOW,
		maxTokens: limit.output ?? DEFAULT_MAX_TOKENS,
		modelsDev: {
			provider: modelsDevProvider,
			modelId: modelsDevModelId,
		},
	};
}
