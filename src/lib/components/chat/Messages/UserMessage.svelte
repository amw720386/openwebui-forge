<!-- Adapted from Open WebUI v0.6.5: retain the user bubble and copy action. -->
<script lang="ts">
	import type { Message } from '$lib/types';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import DocumentDuplicate from '$lib/components/icons/DocumentDuplicate.svelte';
	import { copyToClipboard } from '$lib/utils';
	export let message: Message;
	let copied = false;
	let copyError = '';
	async function copy() {
		try { await copyToClipboard(message.content); copied = true; copyError = ''; }
		catch { copyError = 'Clipboard unavailable. Select the text to copy it.'; }
	}
</script>
<div class="flex justify-end pb-1">
	<div class="rounded-3xl max-w-[90%] px-5 py-2 bg-gray-50 dark:bg-gray-850 whitespace-pre-wrap" dir="auto">{message.content}</div>
</div>
<div class="flex justify-end text-gray-600 dark:text-gray-500">
	<Tooltip content={copied ? 'Copied' : 'Copy message'}>
		<button aria-label="Copy user message" class="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition" on:click={copy}><DocumentDuplicate className="size-4" /></button>
	</Tooltip>
	{#if copied}<span role="status" class="text-xs self-center">Copied</span>{/if}
	{#if copyError}<span role="status" class="text-xs self-center">{copyError}</span>{/if}
</div>