// Adapted from Open WebUI v0.6.5. Decode bytes before parsing SSE to preserve Unicode.
import { EventSourceParserStream } from 'eventsource-parser/stream';

export type TextStreamUpdate = { value: string; finishReason?: string };

export async function createOpenAITextStream(responseBody: ReadableStream<Uint8Array>): Promise<AsyncGenerator<TextStreamUpdate>> {
	const reader = responseBody.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).getReader();
	return (async function* () {
		let finished = false;
		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) throw new Error('Forge disconnected before [DONE]. Partial text has been kept; retry the response.');
				if (value.data.trim() === '[DONE]') {
					if (!finished) throw new Error('Forge ended the stream without a finish reason.');
					return;
				}
				let chunk;
				try { chunk = JSON.parse(value.data); } catch { throw new Error('Forge sent malformed stream data. Partial text has been kept.'); }
				if (chunk.error) throw chunk.error;
				const choice = chunk.choices?.[0];
				if (!choice) continue; // Optional usage-only chunks.
				if (finished) throw new Error('Forge sent content after the finish reason.');
				const content = choice.delta?.content ?? '';
				if (typeof content !== 'string') throw new Error('Forge sent a non-text response.');
				const finishReason = choice.finish_reason ?? undefined;
				if (finishReason) finished = true;
				yield { value: content, finishReason };
			}
		} finally {
			await reader.cancel().catch(() => {});
			reader.releaseLock();
		}
	})();
}