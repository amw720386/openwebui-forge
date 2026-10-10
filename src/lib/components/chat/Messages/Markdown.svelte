<script lang="ts">
	import { marked } from 'marked';
	import MarkdownTokens from './Markdown/MarkdownTokens.svelte';
	export let id = '';
	export let content = '';
	$: tokens = marked.lexer(content);
</script>
<MarkdownTokens {tokens} {id} />