<script lang="ts">
	import type { Model } from '$lib/types';
	export let models: Model[];
	export let value = '';
	export let disabled = false;
	export let onChange: (value: string) => void;
</script>
<div class="flex flex-col w-full items-start min-w-0">
	<select aria-label="Model" {disabled} bind:value on:change={() => onChange(value)}
		class="font-semibold text-lg bg-transparent rounded-xl px-2 py-2 pr-6 outline-hidden max-w-full truncate">
		{#if !value}<option value="" disabled>Select a model</option>
		{:else if !models.some((model) => model.id === value)}<option value={value} disabled>{value} (unavailable)</option>{/if}
		{#each models as model}<option value={model.id}>{model.id}</option>{/each}
	</select>
</div>