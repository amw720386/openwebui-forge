import type { Conversation, Settings } from './types';

export const HISTORY_KEY = 'openwebui-forge.history.v1';
export const SETTINGS_KEY = 'openwebui-forge.settings.v1';
export const defaultSettings: Settings = { maxTokens: 64, theme: 'system' };

export function loadHistory(storage: Pick<Storage, 'getItem'>): Conversation[] {
	const raw = storage.getItem(HISTORY_KEY);
	if (!raw) return [];
	const value = JSON.parse(raw);
	if (value.version !== 1 || !Array.isArray(value.conversations)) throw new Error('Saved chat history is invalid. It has not been overwritten.');
	for (const chat of value.conversations) {
		if (typeof chat.id !== 'string' || typeof chat.title !== 'string' || typeof chat.model !== 'string' || !Number.isFinite(chat.updatedAt) || !Array.isArray(chat.messages)) throw new Error('Saved chat history is invalid. It has not been overwritten.');
		for (const [index, message] of chat.messages.entries()) {
			if (typeof message.id !== 'string' || typeof message.content !== 'string' || message.role !== (index % 2 ? 'assistant' : 'user')) throw new Error('Saved messages are invalid. They have not been overwritten.');
			if (message.status === 'streaming') {
				message.status = 'stopped';
				message.error = 'Generation was interrupted by a page reload. Partial text has been kept.';
			}
		}
	}
	return value.conversations;
}

export function saveHistory(storage: Pick<Storage, 'setItem'>, conversations: Conversation[]) {
	storage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, conversations }));
}

export function loadSettings(storage: Pick<Storage, 'getItem'>): Settings {
	const value = JSON.parse(storage.getItem(SETTINGS_KEY) ?? '{}');
	return {
		maxTokens: Number.isInteger(value.maxTokens) && value.maxTokens >= 1 && value.maxTokens <= 2048 ? value.maxTokens : 64,
		theme: ['system', 'light', 'dark'].includes(value.theme) ? value.theme : 'system'
	};
}