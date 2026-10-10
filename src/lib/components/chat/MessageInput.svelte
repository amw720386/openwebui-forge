<!-- Text-only adaptation of Open WebUI v0.6.5's rounded message composer. -->
<script lang="ts">
	import Tooltip from '../common/Tooltip.svelte';
	export let prompt = '';
	export let busy = false;
	export let disabled = false;
	export let onSubmit: () => void;
	export let stopResponse: () => void;
	let textarea: HTMLTextAreaElement;
	function resize() {
		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
	}
	$: if (textarea && prompt === '') textarea.style.height = 'auto';
</script>
<form class="w-full" on:submit|preventDefault={onSubmit}>
	<div class="bg-gray-50 dark:bg-gray-850 rounded-3xl p-3 shadow-xs">
		<textarea id="chat-input" aria-label="Message" bind:this={textarea} bind:value={prompt}
			placeholder="Send a message" rows="1" class="w-full max-h-60 resize-none bg-transparent px-2 pt-1 outline-hidden leading-6"
			on:input={resize} on:keydown={(event) => {
				if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
					event.preventDefault();
					if (!busy && !disabled && prompt.trim()) onSubmit();
				}
			}} />
		<div class="flex justify-between items-center mt-1">
			<span class="text-xs text-gray-500 pl-2">Shift + Enter for a new line</span>
			{#if busy}
				<Tooltip content="Stop generation">
					<button type="button" aria-label="Stop generation" on:click={stopResponse}
						class="bg-gray-900 dark:bg-white text-white dark:text-gray-900 size-8 rounded-full flex justify-center items-center">
						<span class="size-3 rounded-xs bg-current"></span>
					</button>
				</Tooltip>
			{:else}
				<Tooltip content="Send message">
					<button type="submit" aria-label="Send message" disabled={disabled || !prompt.trim()}
						class="bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-30 size-8 rounded-full flex justify-center items-center">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m-6 6 6-6 6 6" /></svg>
					</button>
				</Tooltip>
			{/if}
		</div>
	</div>
</form>