<!-- Open WebUI v0.6.5 code block presentation; execution/editor dependencies removed. -->
<script lang="ts">
	import hljs from 'highlight.js/lib/common';
	import DOMPurify from 'dompurify';
	import { copyToClipboard } from '$lib/utils';
	import ChevronUpDown from '$lib/components/icons/ChevronUpDown.svelte';
	export let lang = '';
	export let code = '';
	let collapsed = false;
	let copied = false;
	let error = '';
	$: language = lang.split(/\s/)[0];
	$: highlightedCode = language && hljs.getLanguage(language) ? hljs.highlight(code, { language }).value : hljs.highlightAuto(code).value;
	async function copy() {
		try { await copyToClipboard(code); copied = true; error = ''; }
		catch { error = 'Select the code to copy it.'; }
	}
</script>
<div class="relative my-2 flex flex-col rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-850" dir="ltr">
	<div class="flex items-center justify-between pl-4 pr-2.5 py-1.5 text-xs font-medium">
		<span>{lang || 'text'}</span>
		<div class="flex gap-1">
			<button class="rounded-md px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={collapsed ? 'Expand code' : 'Collapse code'} on:click={() => collapsed = !collapsed}><ChevronUpDown className="size-3" /></button>
			<button class="rounded-md px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Copy code" on:click={copy}>{copied ? 'Copied' : 'Copy code'}</button>
		</div>
	</div>
	{#if !collapsed}<pre class="px-4 pb-3 overflow-x-auto text-sm !whitespace-pre"><code class="hljs">{@html DOMPurify.sanitize(highlightedCode)}</code></pre>{/if}
	{#if error}<p role="status" class="text-xs px-4 pb-2">{error}</p>{/if}
</div>
