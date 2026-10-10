import type { Conversation, Role, Model } from '$lib/types';
import { createOpenAITextStream } from './streaming';

export class ForgeError extends Error {
	constructor(message: string, public code = '') {
		super(message);
		this.name = 'ForgeError';
	}
}

export function errorMessage(error: unknown): string {
	if (typeof error === 'string') return error;
	if (error && typeof error === 'object' && 'message' in error) {
		const message = String(error.message);
		const code = 'type' in error ? String(error.type) : 'code' in error ? String(error.code) : '';
		if (code === 'context_length_exceeded' || /exceeds context|context limit/.test(message)) {
			return `This conversation exceeds the model's context limit. Reduce maximum output tokens or start a new chat. History has been kept. Forge: ${message}`;
		}
		return message;
	}
	return 'Forge returned an unexpected error.';
}

async function checkResponse(response: Response) {
	if (response.ok) return;
	let body: { error?: unknown } = {};
	try { body = await response.json(); } catch { /* Proxy may return a plain error. */ }
	throw new ForgeError(body.error ? errorMessage(body.error) : `Forge request failed (HTTP ${response.status}).`, String(response.status));
}

async function request(path: string, options: RequestInit = {}) {
	try { return await fetch(path, options); }
	catch (error) {
		if (options.signal?.aborted) throw error;
		throw new ForgeError('Cannot reach Forge. Check that forge-server and the UI server are running, then retry.');
	}
}

export async function getModels(signal?: AbortSignal): Promise<Model[]> {
	const response = await request('/v1/models', { signal });
	await checkResponse(response);
	const body = await response.json();
	if (!Array.isArray(body.data) || body.data.some((model: Model) => typeof model.id !== 'string' || !model.id)) {
		throw new ForgeError('Forge returned an invalid model list.');
	}
	return body.data.map(({ id }: Model) => ({ id }));
}

// Forge is stateless. Never filter, truncate, template, or add provider defaults.
export function completionBody(conversation: Conversation, maxTokens: number, stream = true) {
	if (!conversation.model) throw new ForgeError('Select a model returned by Forge.');
	if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 2048) {
		throw new ForgeError('Maximum output tokens must be an integer between 1 and 2048.');
	}
	const messages: { role: Role; content: string }[] = conversation.messages.map(({ role, content }) => ({ role, content }));
	if (!messages.length || messages.some((message, index) => message.role !== (index % 2 ? 'assistant' : 'user')) || messages.at(-1)?.role !== 'user') {
		throw new ForgeError('Retry the last response before sending another message.');
	}
	if (messages.some(({ content }) => content.includes('\0'))) throw new ForgeError('Messages cannot contain NUL characters.');
	return { model: conversation.model, messages, max_tokens: maxTokens, stream };
}

export async function* complete(conversation: Conversation, maxTokens: number, signal: AbortSignal) {
	const response = await request('/v1/chat/completions', {
		method: 'POST', headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(completionBody(conversation, maxTokens)), signal
	});
	await checkResponse(response);
	if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
		throw new ForgeError('Expected an SSE response from Forge.');
	}
	try {
		for await (const update of await createOpenAITextStream(response.body)) yield update;
	} catch (error) {
		if (signal.aborted) throw error;
		throw new ForgeError(errorMessage(error));
	}
}