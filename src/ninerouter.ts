/**
 * Minimal 9router OpenAI-compatible API client.
 */

export interface NineRouterModelsResponse {
	object: string;
	data: Array<{
		id: string;
		object?: string;
		owned_by?: string;
		kind?: string;
	}>;
}

export async function fetchNineRouterModels(
	baseUrl: string,
	apiKey?: string,
	signal?: AbortSignal,
): Promise<NineRouterModelsResponse> {
	const url = `${baseUrl.replace(/\/$/, "")}/models`;
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	const response = await fetch(url, {
		method: "GET",
		headers,
		signal,
	});

	if (!response.ok) {
		throw new Error(
			`9router /models failed: ${response.status} ${response.statusText}`,
		);
	}

	return (await response.json()) as NineRouterModelsResponse;
}
