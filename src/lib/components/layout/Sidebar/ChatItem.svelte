<!-- Adapted from Open WebUI v0.6.5; local rename/delete replace backend menus. -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Conversation } from '$lib/types';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import GarbageBin from '$lib/components/icons/GarbageBin.svelte';
	import Check from '$lib/components/icons/Check.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	export let chat: Conversation;
	export let selected = false;
	export let onSelect: () => void;
	export let onRename: (id: string, title: string) => void;
	export let onDelete: (id: string) => void;
	let editing = false;
	let title = '';
	function save() { if (title.trim()) { onRename(chat.id, title.trim()); editing = false; } }
	function focus(node: HTMLInputElement) { node.focus(); node.select(); }
</script>
<div class="w-full relative group flex items-center rounded-lg {selected ? 'bg-gray-200 dark:bg-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-950'}">
	{#if editing}
		<input aria-label="Conversation title" use:focus bind:value={title} on:keydown={(event) => {
			if (event.key === 'Enter') save();
			if (event.key === 'Escape') editing = false;
		}} class="bg-transparent min-w-0 flex-1 outline-hidden px-[11px] py-[6px] text-sm" maxlength="120" />
		<button aria-label="Save title" class="p-1" on:click={save}><Check className="size-4" /></button>
		<button aria-label="Cancel rename" class="p-1" on:click={() => editing = false}><XMark className="size-4" /></button>
	{:else}
		<a class="flex-1 min-w-0 rounded-lg px-[11px] py-[6px] text-sm truncate" href={`/c/${chat.id}`} aria-current={selected ? 'page' : undefined} on:click={(event) => { event.preventDefault(); onSelect(); goto(`/c/${chat.id}`); }} on:dblclick={() => { title = chat.title; editing = true; }}>{chat.title}</a>
		<div class="flex shrink-0 pr-1 opacity-60 group-hover:opacity-100 focus-within:opacity-100">
			<button aria-label={`Rename ${chat.title}`} class="p-1" on:click={() => { title = chat.title; editing = true; }}><Pencil className="size-3.5" /></button>
			<button aria-label={`Delete ${chat.title}`} class="p-1" on:click={() => onDelete(chat.id)}><GarbageBin className="size-3.5" /></button>
		</div>
	{/if}
</div>