<script lang="ts">
	import type { Conversation } from '$lib/types';
	import UserMessage from './Messages/UserMessage.svelte';
	import ResponseMessage from './Messages/ResponseMessage.svelte';
	export let conversation: Conversation;
	export let busy: boolean;
	export let regenerate: () => void;
</script>
<div class="max-w-3xl mx-auto px-4 w-full space-y-6 pb-8">
	{#each conversation.messages as message, index (message.id)}
		<article aria-label={message.role === 'user' ? 'User message' : 'Assistant message'} id={`message-${message.id}`}>
			{#if message.role === 'user'}<UserMessage {message} />
			{:else}<ResponseMessage {message} model={conversation.model} canRegenerate={!busy && index === conversation.messages.length - 1} {regenerate} />{/if}
		</article>
	{/each}
</div>