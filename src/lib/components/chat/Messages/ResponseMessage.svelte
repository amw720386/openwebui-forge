<!-- Adapted from Open WebUI v0.6.5: retain response layout, Markdown, skeleton and actions. -->
<script lang="ts">
	import type { Message } from '$lib/types';
	import Markdown from './Markdown.svelte';
	import Name from './Name.svelte';
	import Skeleton from './Skeleton.svelte';
	import Error from './Error.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import DocumentDuplicate from '$lib/components/icons/DocumentDuplicate.svelte';
	import ArrowPath from '$lib/components/icons/ArrowPath.svelte';
	import { copyToClipboard } from '$lib/utils';
	export let message: Message;
	export let model: string;
	export let canRegenerate = false;
	export let regenerate: () => void;
	let copied = false;
	let copyError = '';
	async function copy() {
		try { await copyToClipboard(message.content); copied = true; copyError = ''; }
		catch { copyError = 'Clipboard unavailable. Select the text to copy it.'; }
	}
</script>
<div class="flex gap-3">
	<div class="size-8 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-semibold text-xs mt-0.5" aria-hidden="true">F</div>
	<div class="flex-auto w-0 max-w-full">
		<Name>{model || 'Forge'}</Name>
		<div class="chat-assistant w-full markdown-prose mt-1">
			{#if message.content}<Markdown id={message.id} content={message.content} />
			{:else if message.status === 'streaming'}<Skeleton />{/if}
		</div>
		{#if message.error}<div role="alert"><Error content={message.error} /></div>{/if}
		{#if message.status === 'stopped'}<p class="text-xs text-gray-500 mt-2">Generation stopped. Partial text has been kept.</p>{/if}
		{#if message.finishReason === 'length'}<p class="text-xs text-gray-500 mt-2">Maximum output tokens reached.</p>{/if}
		{#if message.status !== 'streaming'}
			<div class="flex items-center mt-2 text-gray-600 dark:text-gray-500">
				<Tooltip content={copied ? 'Copied' : 'Copy message'}>
					<button aria-label="Copy assistant message" class="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition" disabled={!message.content} on:click={copy}><DocumentDuplicate className="size-4" /></button>
				</Tooltip>
				{#if canRegenerate}
					<Tooltip content={message.error ? 'Retry response' : 'Regenerate response'}>
						<button aria-label="Regenerate response" class="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition" on:click={regenerate}><ArrowPath className="size-4" /></button>
					</Tooltip>
				{/if}
				{#if copied}<span role="status" class="text-xs">Copied</span>{/if}
				{#if copyError}<span role="status" class="text-xs">{copyError}</span>{/if}
			</div>
		{/if}
	</div>
</div>