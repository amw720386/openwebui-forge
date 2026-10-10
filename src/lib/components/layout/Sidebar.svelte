<!-- Open WebUI v0.6.5 sidebar layout, reduced to local conversations. -->
<script lang="ts">
	import type { Conversation } from '$lib/types';
	import { showSidebar } from '$lib/stores';
	import ChatItem from './Sidebar/ChatItem.svelte';
	import PencilSquare from '$lib/components/icons/PencilSquare.svelte';
	import Cog6 from '$lib/components/icons/Cog6.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	export let conversations: Conversation[];
	export let activeId = '';
	export let newChat: () => void;
	export let openSettings: () => void;
	export let renameChat: (id: string, title: string) => void;
	export let deleteChat: (id: string) => void;
	export let onSelect: () => void;
	let search = '';
	$: filtered = [...conversations].filter((chat) => chat.title.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt);
	function select() { onSelect(); if (matchMedia('(max-width: 767px)').matches) showSidebar.set(false); }
</script>
{#if $showSidebar}
	<button class="fixed inset-0 bg-black/40 z-40 md:hidden" aria-label="Close sidebar" on:click={() => showSidebar.set(false)}></button>
	<aside aria-label="Conversations" class="fixed md:relative inset-y-0 left-0 z-50 w-[260px] shrink-0 flex flex-col bg-gray-50 dark:bg-gray-950 h-[100dvh] p-2">
		<div class="flex justify-between items-center px-2 py-3">
			<span class="font-semibold tracking-tight">Forge</span>
			<button class="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800" aria-label="Close sidebar" on:click={() => showSidebar.set(false)}><XMark className="size-5" /></button>
		</div>
		<button class="flex gap-2 items-center text-sm font-medium w-full rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-900" on:click={() => { newChat(); select(); }}><PencilSquare className="size-4" />New chat</button>
		<input aria-label="Search conversations" bind:value={search} placeholder="Search chats" class="bg-transparent text-sm px-3 py-2 mb-4 outline-hidden" />
		<div class="overflow-y-auto flex-1 space-y-0.5">
			{#if filtered.length}<p class="px-3 pb-2 text-xs text-gray-500 font-medium">Conversations</p>{/if}
			{#each filtered as chat (chat.id)}<ChatItem {chat} selected={activeId === chat.id} onSelect={select} onRename={renameChat} onDelete={deleteChat} />{/each}
			{#if !filtered.length}<p class="px-3 text-xs text-gray-500">{search ? 'No matching chats' : 'Your chats will appear here.'}</p>{/if}
		</div>
		<button class="flex items-center gap-2 px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-sm" on:click={openSettings}><Cog6 className="size-4" />Settings</button>
		<a class="px-3 pb-2 text-[10px] text-gray-500 hover:underline" href="/NOTICE.txt" target="_blank" rel="noopener">Derived from Open WebUI v0.6.5</a>
	</aside>
{/if}