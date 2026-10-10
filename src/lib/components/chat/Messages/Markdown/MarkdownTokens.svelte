<!-- Recursive Markdown rendering retained from Open WebUI v0.6.5; provider artifacts removed. -->
<script lang="ts">
	import DOMPurify from 'dompurify';
	import type { Token } from 'marked';
	import CodeBlock from '../CodeBlock.svelte';
	import MarkdownInlineTokens from './MarkdownInlineTokens.svelte';
	import { unescapeHtml } from '$lib/utils';
	export let id = '';
	export let tokens: Token[] = [];
	export let top = true;
	function inlineTokens(token: Token): Token[] | undefined { return 'tokens' in token ? token.tokens : undefined; }
</script>
{#each tokens as token, tokenIdx (tokenIdx)}
	{#if token.type === 'hr'}
		<hr class="border-gray-100 dark:border-gray-850" />
	{:else if token.type === 'heading'}
		<svelte:element this={'h' + token.depth} dir="auto"><MarkdownInlineTokens tokens={token.tokens} /></svelte:element>
	{:else if token.type === 'code'}
		<CodeBlock lang={token.lang ?? ''} code={token.text ?? ''} />
	{:else if token.type === 'table'}
		<div class="overflow-x-auto max-w-full rounded-lg my-2">
			<table class="w-full text-sm text-left">
				<thead class="text-xs bg-gray-50 dark:bg-gray-850">
					<tr>{#each token.header as cell, index}<th class="px-3! py-1.5! border border-gray-100 dark:border-gray-850" style:text-align={token.align[index] ?? 'left'}><MarkdownInlineTokens tokens={cell.tokens} /></th>{/each}</tr>
				</thead>
				<tbody>{#each token.rows as row}<tr>{#each row as cell, index}<td class="px-3! py-1.5! border border-gray-100 dark:border-gray-850" style:text-align={token.align[index] ?? 'left'}><MarkdownInlineTokens tokens={cell.tokens} /></td>{/each}</tr>{/each}</tbody>
			</table>
		</div>
	{:else if token.type === 'blockquote'}
		<blockquote dir="auto"><svelte:self tokens={token.tokens} id={`${id}-${tokenIdx}`} /></blockquote>
	{:else if token.type === 'list'}
		<svelte:element this={token.ordered ? 'ol' : 'ul'} start={token.ordered ? token.start || 1 : undefined} dir="auto">
			{#each token.items as item}
				<li>{#if item.task}<input type="checkbox" checked={item.checked} disabled aria-label="Task status" />{/if}<svelte:self tokens={item.tokens} top={token.loose} /></li>
			{/each}
		</svelte:element>
	{:else if token.type === 'html'}
		{@html DOMPurify.sanitize(token.text, { ALLOWED_TAGS: ['details', 'summary', 'p', 'br', 'b', 'strong', 'i', 'em', 'code', 'pre', 'del'], ALLOWED_ATTR: [] })}
	{:else if token.type === 'paragraph'}
		<p dir="auto"><MarkdownInlineTokens tokens={token.tokens ?? []} /></p>
	{:else if token.type === 'text'}
		{#if top}<p>{#if inlineTokens(token)}<MarkdownInlineTokens tokens={inlineTokens(token) ?? []} />{:else}{unescapeHtml(token.text)}{/if}</p>
		{:else if inlineTokens(token)}<MarkdownInlineTokens tokens={inlineTokens(token) ?? []} />
		{:else}{unescapeHtml(token.text)}{/if}
	{:else if token.type === 'space'}
		<div class="my-2"></div>
	{/if}
{/each}
