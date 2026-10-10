import { writable } from 'svelte/store';
import type { Conversation, Settings } from '$lib/types';
import { defaultSettings } from '$lib/persistence';

export const chats = writable<Conversation[]>([]);
export const settings = writable<Settings>({ ...defaultSettings });
export const showSidebar = writable(true);
export const storageError = writable('');