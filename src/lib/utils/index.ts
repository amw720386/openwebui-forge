import { decode } from 'html-entities';

export const unescapeHtml = (value: string) => decode(value);
export async function copyToClipboard(text: string) {
	await navigator.clipboard.writeText(text);
}

export function safeLink(href: string): string | undefined {
	try {
		const url = new URL(href, window.location.origin);
		return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : undefined;
	} catch { return undefined; }
}