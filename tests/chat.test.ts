import { describe, it, expect, vi, afterEach } from 'vitest';
import { completionBody, complete, getModels, errorMessage, ForgeError } from '../src/lib/apis/forge';
import { HISTORY_KEY, loadHistory, saveHistory, loadSettings } from '../src/lib/persistence';
import type { Conversation } from '../src/lib/types';

const chat: Conversation = { id: 'chat-1', title: 'Hello', model: 'actual-model-id', updatedAt: 1, messages: [
	{ id: '1', role: 'user', content: 'Hello' }, { id: '2', role: 'assistant', content: 'Hi!' }, { id: '3', role: 'user', content: 'What did I say?' }
] };
afterEach(() => { vi.unstubAllGlobals(); });
describe('Forge request contract', () => {
	it('sends the complete history and only supported fields', () => {
		expect(completionBody(chat, 64)).toEqual({ model: 'actual-model-id', max_tokens: 64, stream: true, messages: [
			{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Hi!' }, { role: 'user', content: 'What did I say?' }
		] });
	});
	it('rejects invalid limits, NUL, or turns rather than truncating', () => {
		for (const limit of [0, 2049, 1.5, NaN]) expect(() => completionBody(chat, limit)).toThrow();
		expect(() => completionBody({ ...chat, messages: chat.messages.slice(0, 2) }, 64)).toThrow(/Retry/);
		expect(() => completionBody({ ...chat, messages: [{ id: 'x', role: 'user', content: '\0' }] }, 64)).toThrow(/NUL/);
	});
	it('renders context and unsupported-parameter errors clearly', () => {
		expect(errorMessage({ type: 'context_length_exceeded', message: 'formatted input exceeds context (1024)' })).toContain('History has been kept');
		expect(errorMessage({ message: 'temperature must be 0' })).toBe('temperature must be 0');
		const formatted = errorMessage({ type: 'context_length_exceeded', message: 'formatted input exceeds context (1024)' });
		expect(errorMessage(new ForgeError(formatted))).toBe(formatted);
	});
	it('passes AbortSignal to fetch and preserves cancellation', async () => {
		const abort = new AbortController();
		vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
		const pending = complete(chat, 64, abort.signal).next();
		abort.abort();
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
	});
	it('can rediscover models after an offline failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(Response.json({ data: [{ id: 'restarted-model' }] })));
		await expect(getModels()).rejects.toThrow(/Cannot reach Forge/);
		expect(await getModels()).toEqual([{ id: 'restarted-model' }]);
	});
});
describe('local persistence', () => {
	const store = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; };
	it('round-trips history, renamed titles and Unicode across reloads', () => {
		const storage = store();
		saveHistory(storage, [{ ...chat, title: 'Renamed 🌍' }]);
		expect(loadHistory(storage)).toEqual([{ ...chat, title: 'Renamed 🌍' }]);
		saveHistory(storage, []);
		expect(loadHistory(storage)).toEqual([]);
	});
	it('recovers a streaming response as stopped with partial text intact', () => {
		const storage = store();
		saveHistory(storage, [{ ...chat, messages: [...chat.messages, { id: '4', role: 'assistant', content: 'partial', status: 'streaming' }] }]);
		expect(loadHistory(storage)[0].messages.at(-1)).toMatchObject({ content: 'partial', status: 'stopped' });
	});
	it('does not overwrite corrupt history and surfaces quota failures', () => {
		const storage = store(); storage.setItem(HISTORY_KEY, '{broken');
		expect(() => loadHistory(storage)).toThrow(); expect(storage.getItem(HISTORY_KEY)).toBe('{broken');
		expect(() => saveHistory({ setItem: () => { throw new Error('quota'); } }, [chat])).toThrow('quota');
	});
	it('validates settings loaded from storage', () => {
		expect(loadSettings({ getItem: () => '{"maxTokens":5000,"theme":"invalid"}' })).toEqual({ maxTokens: 64, theme: 'system' });
	});
});
