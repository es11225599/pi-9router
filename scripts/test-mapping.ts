/**
 * Standalone test for the 9router -> models.dev mapping logic.
 *
 * Usage:
 *   npx tsx scripts/test-mapping.ts
 *   node --import jiti/register scripts/test-mapping.ts
 */

import fs from "node:fs";
import path from "node:path";
import {
	enrichModel,
	parseNineRouterModelId,
	type ModelsDevApi,
	type NineRouterModel,
} from "../src/mapping.ts";

function loadModelsDev(): ModelsDevApi {
	const cachePath = path.resolve(process.cwd(), "models-dev-api.json");
	if (fs.existsSync(cachePath)) {
		return JSON.parse(fs.readFileSync(cachePath, "utf8")) as ModelsDevApi;
	}
	throw new Error(
		`models-dev-api.json not found. Run a fetch first or create it at ${cachePath}`,
	);
}

const sampleModels: NineRouterModel[] = [
	{ id: "openai/gpt-4o" },
	{ id: "openai/gpt-5" },
	{ id: "anthropic/claude-sonnet-4-20250514" },
	{ id: "anthropic/claude-opus-4-0" },
	{ id: "gemini/gemini-2.5-pro" },
	{ id: "deepseek/deepseek-chat" },
	{ id: "openrouter/anthropic/claude-sonnet-4" },
	{ id: "minimax/minimax-text-01" },
	{ id: "mistral/mistral-large-latest" },
	{ id: "groq/llama-3.3-70b-versatile" },
	{ id: "xai/grok-4" },
	{ id: "kiro/claude-sonnet-4.5" },
	{ id: "my-combo" },
];

function main() {
	const api = loadModelsDev();
	console.log("=== 9router -> models.dev mapping test ===\n");

	let matched = 0;
	let unmatched = 0;

	for (const m of sampleModels) {
		const parsed = parseNineRouterModelId(m.id);
		const enriched = enrichModel(m, api);
		const hasMatch = enriched.modelsDev !== undefined;

		if (hasMatch) matched++;
		else unmatched++;

		console.log(`9router: ${m.id}`);
		if (parsed) {
			console.log(`  alias: ${parsed.alias}, modelId: ${parsed.modelId}`);
		}
		console.log(`  name:           ${enriched.name}`);
		console.log(`  reasoning:      ${enriched.reasoning}`);
		console.log(`  input:          ${enriched.input.join(", ")}`);
		console.log(`  contextWindow:  ${enriched.contextWindow.toLocaleString()}`);
		console.log(`  maxTokens:      ${enriched.maxTokens.toLocaleString()}`);
		console.log(
			`  cost:           input=${enriched.cost.input} output=${enriched.cost.output} cacheRead=${enriched.cost.cacheRead} cacheWrite=${enriched.cost.cacheWrite}`,
		);
		if (enriched.modelsDev) {
			console.log(
				`  models.dev:     ${enriched.modelsDev.provider}/${enriched.modelsDev.modelId}`,
			);
		} else {
			console.log(`  models.dev:     (no match - using defaults)`);
		}
		console.log("");
	}

	console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);
}

main();
