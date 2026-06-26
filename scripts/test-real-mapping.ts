/**
 * Test the mapping against the live 9router instance on localhost.
 */

import { enrichModel, type ModelsDevApi, type NineRouterModel } from "../src/mapping.ts";
import { fetchModelsDevApi } from "../src/modelsdev.ts";
import { fetchNineRouterModels } from "../src/ninerouter.ts";

async function main() {
	const baseUrl = "http://localhost:20128/v1";
	const apiKey = process.env.NINEROUTER_API_KEY;

	const [modelsDev, nr] = await Promise.all([
		fetchModelsDevApi(),
		fetchNineRouterModels(baseUrl, apiKey),
	]);

	const models = nr.data ?? [];
	let matched = 0;
	let unmatched = 0;

	for (const m of models) {
		const enriched = enrichModel(m as NineRouterModel, modelsDev);
		if (enriched.modelsDev) matched++;
		else unmatched++;
	}

	console.log(`Total 9router models: ${models.length}`);
	console.log(`Matched to models.dev: ${matched}`);
	console.log(`Unmatched (defaults): ${unmatched}`);
	console.log(`Match rate: ${((matched / models.length) * 100).toFixed(1)}%`);

	// Show a few matched and unmatched examples.
	console.log("\n=== Sample matched models ===");
	let shown = 0;
	for (const m of models) {
		const enriched = enrichModel(m as NineRouterModel, modelsDev);
		if (enriched.modelsDev) {
			console.log(
				`  ${m.id} -> ${enriched.modelsDev.provider}/${enriched.modelsDev.modelId} (ctx=${enriched.contextWindow}, out=${enriched.maxTokens})`,
			);
			if (++shown >= 10) break;
		}
	}

	console.log("\n=== Sample unmatched models ===");
	shown = 0;
	for (const m of models) {
		const enriched = enrichModel(m as NineRouterModel, modelsDev);
		if (!enriched.modelsDev) {
			console.log(`  ${m.id} (owned_by=${m.owned_by})`);
			if (++shown >= 10) break;
		}
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
