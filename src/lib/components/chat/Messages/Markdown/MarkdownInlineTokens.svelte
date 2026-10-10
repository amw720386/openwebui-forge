<!-- Inline Markdown renderer from Open WebUI v0.6.5, with local text-only output. -->
<script lang="ts">
	import DOMPurify from 'dompurify';
	import type { Token } from 'marked';
	import { unescapeHtml, safeLink } from '$lib/utils';
	export let tokens: Token[] = [];
</script>
{#each tokens as token}
	{#if token.type === 'escape'}{unescapeHtml(token.text)}
	{:else if token.type === 'html'}
		{@html DOMPurify.sanitize(token.text, { ALLOWED_TAGS: ['br', 'b', 'strong', 'i', 'em', 'code', 'del'], ALLOWED_ATTR: [] })}
	{:else if token.type === 'link'}
		<a href={safeLink(token.href)} target="_blank" rel="noopener noreferrer nofollow" title={token.title ?? undefined}>
			{#if token.tokens}<svelte:self tokens={token.tokens} />{:else}{token.text}{/if}
		</a>
	{:else if token.type === 'image'}
		<span>{token.text}</span>
	{:else if token.type === 'strong'}<strong><svelte:self tokens={token.tokens} /></strong>
	{:else if token.type === 'em'}<em><svelte:self tokens={token.tokens} /></em>
	{:else if token.type === 'codespan'}<code class="codespan">{unescapeHtml(token.text)}</code>
	{:else if token.type === 'br'}<br />
	{:else if token.type === 'del'}<del><svelte:self tokens={token.tokens} /></del>
	{:else if token.type === 'text'}{unescapeHtml(token.text)}
	{/if}
{/each}