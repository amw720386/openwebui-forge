<script lang="ts">
	import { settings } from '$lib/stores';
	import Modal from '../common/Modal.svelte';
	import XMark from '../icons/XMark.svelte';
	import type { Settings } from '$lib/types';
	export let show = false;
	export let exportChats: () => void;
	let maxTokens = 64;
	let theme: Settings['theme'] = 'system';
	$: if (show) { maxTokens = $settings.maxTokens; theme = $settings.theme; }
	function save() {
		if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 2048) return;
		settings.set({ maxTokens, theme }); show = false;
	}
</script>
<Modal bind:show size="sm">
	<form class="p-6" on:submit|preventDefault={save}>
		<div class="flex justify-between items-center mb-6">
			<h2 class="text-lg font-semibold">Settings</h2>
			<button type="button" aria-label="Close settings" on:click={() => show = false}><XMark className="size-5" /></button>
		</div>
		<label for="max-tokens" class="block text-sm font-medium mb-2">Maximum output tokens</label>
		<input id="max-tokens" type="number" min="1" max="2048" step="1" required bind:value={maxTokens} class="w-full rounded-lg bg-gray-50 dark:bg-gray-850 px-3 py-2 text-sm" />
		<p class="text-xs text-gray-500 mt-2 mb-5">Input history and output must fit Forge’s context window. Default: 64.</p>
		<label for="theme" class="block text-sm font-medium mb-2">Theme</label>
		<select id="theme" bind:value={theme} class="w-full rounded-lg bg-gray-50 dark:bg-gray-850 px-3 py-2 text-sm"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select>
		<div class="text-xs text-gray-500 mt-6 space-y-2">
			<p>Forge connection: same-origin /v1 proxy. Configure FORGE_BASE_URL on the UI server to change the local port.</p>
			<button type="button" class="underline" on:click={exportChats}>Export chat history</button>
			<p>Derived from Open WebUI v0.6.5. <a href="/LICENSE.txt" target="_blank" rel="noopener" class="underline">License</a> · <a href="/NOTICE.txt" target="_blank" rel="noopener" class="underline">Attribution</a></p>
		</div>
		<button type="submit" class="w-full mt-6 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 text-sm font-medium">Save settings</button>
	</form>
</Modal>