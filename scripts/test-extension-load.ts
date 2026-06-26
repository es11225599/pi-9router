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

async function main() {
	await extension(mockPi);

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
