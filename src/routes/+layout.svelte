<script lang="ts">
	import { onMount } from 'svelte';
	import Chat from '$lib/components/chat/Chat.svelte';
	import { chats, settings, storageError } from '$lib/stores';
	import { loadHistory, loadSettings, saveHistory, SETTINGS_KEY } from '$lib/persistence';
	import '../tailwind.css';
	import '../app.css';
	import 'tippy.js/dist/tippy.css';

	let ready = false;
	onMount(() => {
		let writableHistory = true;
		try { chats.set(loadHistory(localStorage)); }
		catch { writableHistory = false; storageError.set('Saved chat history could not be read. It has not been overwritten. New chats will only be kept in memory.'); }
		try { settings.set(loadSettings(localStorage)); }
		catch { storageError.set('Browser settings could not be read. Default settings are in use.'); }
		const media = matchMedia('(prefers-color-scheme: dark)');
		const applyTheme = () => {
			document.documentElement.classList.toggle('dark', $settings.theme === 'dark' || ($settings.theme === 'system' && media.matches));
		};
		const unsubscribeSettings = settings.subscribe((value) => {
			applyTheme();
			try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(value)); }
			catch { storageError.set('Settings could not be saved. Browser storage is unavailable or full.'); }
		});
		const unsubscribeChats = chats.subscribe((value) => {
			if (!writableHistory) return;
			try { saveHistory(localStorage, value); }
			catch { storageError.set('Chat history could not be saved. Browser storage is unavailable or full. Keep this page open and export your chats.'); }
		});
		media.addEventListener('change', applyTheme);
		ready = true;
		return () => { unsubscribeSettings(); unsubscribeChats(); media.removeEventListener('change', applyTheme); };
	});
</script>

<svelte:head><title>Forge · openwebui-forge</title></svelte:head>
{#if ready}<Chat />{/if}
<slot />
