/**
 * Minimal client for the models.dev API.
 * https://models.dev/api.json
 */

import type { ModelsDevApi } from "./mapping.ts";

export async function fetchModelsDevApi(
	signal?: AbortSignal,
): Promise<ModelsDevApi> {
	const response = await fetch("https://models.dev/api.json", {
		method: "GET",
		headers: { Accept: "application/json" },
		signal,
	});

	if (!response.ok) {
		throw new Error(
			`models.dev API failed: ${response.status} ${response.statusText}`,
		);
	}

	return (await response.json()) as ModelsDevApi;
}
