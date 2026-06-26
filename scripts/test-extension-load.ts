/**
 * Smoke test: load the extension with a mock pi object.
 * Verifies that the async factory completes and registers a provider.
 */

import extension from "../src/index.ts";
import type { ExtensionAPI, ProviderConfig } from "@earendil-works/pi-coding-agent";

const registered: Array<{ name: string; config: ProviderConfig }> = [];

const mockPi = {
	on: () => {},
	registerCommand: () => {},
	registerTool: () => {},
	registerProvider: (name: string, config: ProviderConfig) => {
		registered.push({ name, config });
	},
	unregisterProvider: (name: string) => {
		const idx = registered.findIndex((r) => r.name === name);
		if (idx >= 0) registered.splice(idx, 1);
	},
	getActiveTools: () => [],
	getAllTools: () => [],
	setActiveTools: () => {},
	getCommands: () => [],
	setModel: async () => false,
	getThinkingLevel: () => "off" as const,
	setThinkingLevel: () => {},
	appendEntry: () => {},
	setSessionName: () => {},
	getSessionName: () => undefined,
	setLabel: () => {},
	exec: async () => ({ stdout: "", stderr: "", code: 0, killed: false }),
	sendMessage: () => {},
	sendUserMessage: () => {},
	registerMessageRenderer: () => {},
	registerShortcut: () => {},
	registerFlag: () => {},
	getFlag: () => undefined,
	events: { on: () => {}, emit: () => {} },
} as unknown as ExtensionAPI;

const modelsDevPayload = {
	openai: {
		id: "openai",
		models: {
			"gpt-4o": {
				id: "gpt-4o",
				name: "GPT-4o",
				modalities: { input: ["text", "image"], output: ["text"] },
				limit: { context: 128_000, output: 16_384 },
				cost: { input: 2.5, output: 10 },
			},
		},
	},
};

const nineRouterPayload = {
	object: "list",
	data: [{ id: "openai/gpt-4o", object: "model", owned_by: "openai", kind: "llm" }],
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
	const url = typeof input === "string" ? input : input.toString();
	if (url.includes("models.dev/api.json")) {
		return new Response(JSON.stringify(modelsDevPayload), { status: 200 });
	}
	if (url.endsWith("/models")) {
		return new Response(JSON.stringify(nineRouterPayload), { status: 200 });
	}
	return originalFetch(input, init);
};

function assert(cond: boolean, message: string) {
	if (!cond) throw new Error(`ASSERT FAILED: ${message}`);
}

async function main() {
	await extension(mockPi);

	assert(registered.length > 0, "expected at least one provider to be registered");

	console.log(`Registered providers: ${registered.length}`);
	for (const r of registered) {
		console.log(`  ${r.name}: ${r.config.models?.length ?? 0} models`);
		console.log(`    baseUrl: ${r.config.baseUrl}`);
		console.log(`    apiKey: ${r.config.apiKey}`);
		console.log(`    api: ${r.config.api}`);
		const sample = r.config.models?.slice(0, 3) ?? [];
		for (const m of sample) {
			console.log(`    - ${m.id}: ${m.name} (ctx=${m.contextWindow}, out=${m.maxTokens})`);
		}
	}
}

main().catch((err) => {
	console.error("Extension failed to load:", err);
	process.exit(1);
});
