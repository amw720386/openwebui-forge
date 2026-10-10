<!-- Reduced from Open WebUI v0.6.5: a single model, local history and HTTP streaming. -->
<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { chats, settings, showSidebar, storageError } from '$lib/stores';
	import type { Conversation, Message, Model } from '$lib/types';
	import { complete, getModels, errorMessage } from '$lib/apis/forge';
	import Sidebar from '../layout/Sidebar.svelte';
	import ModelSelector from './ModelSelector.svelte';
	import MessageInput from './MessageInput.svelte';
	import Messages from './Messages.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import Modal from '../common/Modal.svelte';
	import Error from './Messages/Error.svelte';
	import MenuLines from '../icons/MenuLines.svelte';
	import PencilSquare from '../icons/PencilSquare.svelte';
	import ArrowPath from '../icons/ArrowPath.svelte';
	import Cog6 from '../icons/Cog6.svelte';

	let models: Model[] = [];
	let selectedModel = '';
	let modelError = '';
	let loadingModels = false;
	let prompt = '';
	let composerError = '';
	let showSettings = false;
	let deleteId = '';
	let confirmDelete = false;
	let busy = false;
	let controller: AbortController | undefined;
	let discoveryController: AbortController | undefined;
	let viewport: HTMLDivElement;
	let autoScroll = true;
	let lastRoute = '';
	let mounted = false;

	$: activeId = $page.params.id ?? '';
	$: conversation = $chats.find((chat) => chat.id === activeId);
	$: displayedModel = conversation?.model ?? selectedModel;
	$: lastMessage = conversation?.messages.at(-1);
	$: canSend = models.some((model) => model.id === displayedModel) && !loadingModels &&
		(!lastMessage || (lastMessage.role === 'assistant' && !!lastMessage.content));
	$: if (mounted && activeId !== lastRoute) {
		stopResponse();
		prompt = '';
		composerError = '';
		lastRoute = activeId;
		autoScroll = true;
		scrollToBottom();
	}

	function publish(chat: Conversation) {
		chats.update((items) => [chat, ...items.filter((item) => item.id !== chat.id)]);
	}
	async function scrollToBottom() {
		await tick();
		if (autoScroll && viewport) viewport.scrollTop = viewport.scrollHeight;
	}
	function stopResponse() { controller?.abort(); }
	function newChat() { stopResponse(); goto('/'); prompt = ''; composerError = ''; }

	async function refreshModels() {
		discoveryController?.abort();
		const discovery = new AbortController();
		discoveryController = discovery;
		loadingModels = true;
		try {
			const loaded = await getModels(discovery.signal);
			if (discovery.signal.aborted) return;
			models = loaded;
			if (!models.some((model) => model.id === selectedModel)) selectedModel = models[0]?.id ?? '';
			modelError = models.length ? '' : 'Forge has no loaded model. Load a model in forge-server, then refresh.';
		} catch (error) {
			if (!discovery.signal.aborted) { models = []; modelError = errorMessage(error); }
		} finally { if (discoveryController === discovery) loadingModels = false; }
	}
	function selectModel(value: string) {
		selectedModel = value;
		if (conversation) publish({ ...conversation, model: value, updatedAt: Date.now() });
	}
	async function submit() {
		if (busy || !canSend || !prompt.trim()) return;
		const text = prompt.trim();
		if (text.includes('\0')) { composerError = 'Messages cannot contain NUL characters.'; return; }
		let chat = conversation;
		if (!chat) {
			chat = { id: crypto.randomUUID(), title: text.slice(0, 60), model: selectedModel, updatedAt: Date.now(), messages: [] };
			publish(chat);
			await goto(`/c/${chat.id}`);
			await tick();
		}
		prompt = '';
		composerError = '';
		chat = { ...chat, messages: [...chat.messages, { id: crypto.randomUUID(), role: 'user', content: text }], updatedAt: Date.now() };
		await generate(chat);
	}
	async function regenerate() {
		if (!conversation || busy) return;
		const messages = [...conversation.messages];
		if (messages.at(-1)?.role === 'assistant') messages.pop();
		if (messages.at(-1)?.role !== 'user') return;
		await generate({ ...conversation, messages });
	}
	async function generate(chat: Conversation) {
		if (busy) return;
		const abort = new AbortController();
		controller = abort;
		busy = true;
		autoScroll = true;
		const response: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', status: 'streaming' };
		const running = { ...chat, messages: [...chat.messages, response], updatedAt: Date.now() };
		publish(running);
		scrollToBottom();
		try {
			for await (const update of complete(chat, $settings.maxTokens, abort.signal)) {
				response.content += update.value;
				if (update.finishReason) response.finishReason = update.finishReason;
				publish({ ...running, messages: [...running.messages] });
				scrollToBottom();
			}
			response.status = abort.signal.aborted ? 'stopped' : 'complete';
		} catch (error) {
			response.status = abort.signal.aborted ? 'stopped' : 'error';
			if (!abort.signal.aborted) response.error = errorMessage(error);
		} finally {
			publish({ ...running, updatedAt: Date.now(), messages: [...running.messages] });
			if (controller === abort) { controller = undefined; busy = false; }
			scrollToBottom();
		}
	}
	function renameChat(id: string, title: string) {
		chats.update((items) => items.map((chat) => chat.id === id ? { ...chat, title, updatedAt: Date.now() } : chat));
	}
	function requestDelete(id: string) { deleteId = id; confirmDelete = true; }
	async function deleteChat() {
		if (deleteId === activeId) {
			stopResponse();
			// Wait for the running request's final state before removing its history.
			while (busy) await new Promise((resolve) => setTimeout(resolve, 10));
			await goto('/');
		}
		chats.update((items) => items.filter((chat) => chat.id !== deleteId));
		confirmDelete = false;
	}
	function exportChats() {
		const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, conversations: $chats }, null, 2)], { type: 'application/json' }));
		const link = document.createElement('a');
		link.href = url; link.download = 'forge-chats.json'; link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
	onMount(() => {
		mounted = true; lastRoute = activeId;
		if (matchMedia('(max-width: 767px)').matches) showSidebar.set(false);
		refreshModels(); scrollToBottom();
		const cancel = () => stopResponse();
		window.addEventListener('beforeunload', cancel);
		return () => window.removeEventListener('beforeunload', cancel);
	});
	onDestroy(() => { stopResponse(); discoveryController?.abort(); });
</script>

<svelte:head><title>{conversation?.title ? `${conversation.title} · Forge` : 'Forge · openwebui-forge'}</title></svelte:head>
<SettingsModal bind:show={showSettings} {exportChats} />
<Modal bind:show={confirmDelete} size="sm">
	<div class="p-6">
		<h2 class="font-semibold text-lg mb-2">Delete conversation?</h2>
		<p class="text-sm text-gray-500">This will permanently delete “{$chats.find((chat) => chat.id === deleteId)?.title}” from this browser.</p>
		<div class="flex gap-2 mt-6">
			<button class="flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 py-2 text-sm" on:click={() => confirmDelete = false}>Cancel</button>
			<button class="flex-1 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2 text-sm" on:click={deleteChat}>Delete</button>
		</div>
	</div>
</Modal>
<div class="flex h-[100dvh] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
	<Sidebar conversations={$chats} {activeId} {newChat} {renameChat} deleteChat={requestDelete} onSelect={stopResponse} openSettings={() => showSettings = true} />
	<main class="flex-1 min-w-0 flex flex-col">
		<nav aria-label="Chat controls" class="flex items-center gap-1 px-3 py-2">
			<button aria-label="Toggle sidebar" class="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850" on:click={() => showSidebar.set(!$showSidebar)}><MenuLines /></button>
			<ModelSelector {models} value={displayedModel} disabled={busy || loadingModels} onChange={selectModel} />
			<button aria-label="Refresh models" disabled={loadingModels || busy} class="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 disabled:opacity-40" on:click={refreshModels}><ArrowPath className="size-4" /></button>
			<button aria-label="Settings" class="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850" on:click={() => showSettings = true}><Cog6 className="size-5" /></button>
			<button aria-label="New chat" class="p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850" on:click={newChat}><PencilSquare className="size-5" /></button>
		</nav>
		{#if modelError}<div role="alert" class="max-w-3xl w-full mx-auto px-4"><Error content={modelError} /></div>{/if}
		{#if $storageError}<div role="alert" class="max-w-3xl w-full mx-auto px-4"><Error content={$storageError} /><button class="text-xs underline" on:click={exportChats}>Export chats</button></div>{/if}
		<div bind:this={viewport} id="messages-container" class="flex-1 overflow-y-auto pt-5" on:scroll={() => autoScroll = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80}>
			{#if conversation}
				<Messages {conversation} {busy} {regenerate} />
			{:else if activeId}
				<div role="alert" class="max-w-3xl mx-auto px-4"><Error content="This conversation was not found in this browser." /><button class="underline text-sm" on:click={newChat}>Start a new chat</button></div>
			{:else}
				<div class="h-full min-h-40 flex flex-col justify-center items-center pb-12 px-4">
					<div class="size-12 rounded-2xl bg-gray-100 dark:bg-gray-850 flex items-center justify-center text-xl font-semibold mb-4" aria-hidden="true">F</div>
					<h1 class="text-2xl font-semibold tracking-tight">How can I help you today?</h1>
					<p class="text-sm text-gray-500 mt-2">Chat with your local Forge model.</p>
				</div>
			{/if}
		</div>
		<div class="max-w-3xl w-full mx-auto px-4 pb-3 pt-2">
			{#if composerError}<div role="alert"><Error content={composerError} /></div>{/if}
			{#if lastMessage && !lastMessage.content && lastMessage.status !== 'streaming'}
				<p class="text-xs text-gray-500 mb-2">Retry the last response or start a new chat before sending another message.</p>
			{/if}
			<MessageInput bind:prompt {busy} disabled={!canSend || (!!activeId && !conversation)} onSubmit={submit} {stopResponse} />
			<p class="text-center text-[11px] text-gray-500 pt-2">Forge can make mistakes. Chats are saved in this browser.</p>
		</div>
	</main>
</div>