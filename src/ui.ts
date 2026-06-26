/**
 * TUI helpers for the 9router extension.
 *
 * All output goes through pi's TUI APIs so it does not overlap the terminal UI.
 * When no dialog-capable UI is available we fall back to notify.
 */

import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { DynamicBorder, truncateLine } from "@earendil-works/pi-coding-agent";

interface InfoPanelItem {
	label: string;
	value: string;
}

function padLine(raw: string, width: number): string {
	const visible = raw.length;
	if (visible >= width) return raw;
	return raw + " ".repeat(width - visible);
}

/**
 * Show a bordered info panel inside the pi TUI. Falls back to ctx.ui.notify
 * when the current mode has no dialog-capable UI.
 */
export async function showInfoPanel(
	ctx: ExtensionCommandContext,
	title: string,
	items: InfoPanelItem[],
): Promise<void> {
	if (!ctx.hasUI) {
		const summary = items.map((i) => `${i.label}: ${i.value}`).join(" | ");
		ctx.ui.notify(`${title} — ${summary}`, "info");
		return;
	}

	await ctx.ui.custom<void>((tui, theme, _kb, done) => {
		const top = new DynamicBorder((s: string) => theme.fg("accent", s));
		const bottom = new DynamicBorder((s: string) => theme.fg("accent", s));

		return {
			render(width: number): string[] {
				const out: string[] = [];
				out.push(...top.render(width));

				const titleRaw = title.slice(0, width);
				const titleLine = padLine(titleRaw, width);
				out.push(theme.fg("accent", theme.bold(titleLine)));
				out.push(theme.fg("dim", padLine("", width)));

				for (const item of items) {
					const raw = `${item.label}: ${item.value}`;
					const truncated = truncateLine(raw, width).text;
					const labelPart = `${item.label}: `;
					const valuePart = truncated.slice(labelPart.length);
					out.push(
						theme.fg("muted", labelPart) + theme.fg("text", valuePart),
					);
				}

				out.push(theme.fg("dim", padLine("", width)));
				out.push(theme.fg("dim", truncateLine("press any key to close", width).text));
				out.push(...bottom.render(width));
				return out;
			},
			invalidate() {
				top.invalidate();
				bottom.invalidate();
			},
			handleInput() {
				done();
			},
		};
	});
}

/**
 * Show a transient notification, used for simple confirmations.
 */
export function notify(ctx: ExtensionCommandContext, message: string, type: "info" | "warning" | "error" = "info"): void {
	ctx.ui.notify(message, type);
}
