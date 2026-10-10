import { describe, it, expect } from 'vitest';
import { createOpenAITextStream } from '../src/lib/apis/streaming';

const event = (content: string, finish: string | null = null) => `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: finish }] })}\r\n\r\n`;
function bytes(text: string, size: number) {
	const encoded = new TextEncoder().encode(text);
	return new ReadableStream<Uint8Array>({ start(controller) {
		for (let offset = 0; offset < encoded.length; offset += size) controller.enqueue(encoded.slice(offset, offset + size));
		controller.close();
	} });
}

describe('Forge SSE', () => {
	for (const size of [1, 2, 3, 7, 8192]) it(`preserves Unicode and tokens with ${size}-byte chunks`, async () => {
		const stream = ': heartbeat\r\n\r\ndata: {"choices":[{"delta":{"role":"assistant"},"finish_reason":null}]}\r\n\r\n' + event('Héllo 🌍') + event('\n你好') + event('!', 'length') + 'data: [DONE]\r\n\r\n';
		let text = '', finish = '';
		for await (const update of await createOpenAITextStream(bytes(stream, size))) { text += update.value; finish = update.finishReason ?? finish; }
		expect(text).toBe('Héllo 🌍\n你好!');
		expect(finish).toBe('length');
	});
	for (const tail of ['', 'data: broken\n\n', 'data: [DONE]\n\n']) it(`rejects interrupted or malformed streams: ${tail}`, async () => {
		const received: string[] = [];
		await expect((async () => { for await (const update of await createOpenAITextStream(bytes(event('partial') + tail, 1))) received.push(update.value); })()).rejects.toBeDefined();
		expect(received.join('')).toBe('partial');
	});
	it('surfaces an SSE server error after partial text', async () => {
		await expect((async () => {
			for await (const _ of await createOpenAITextStream(bytes(event('partial') + 'data: {"error":{"message":"generation failed"}}\n\n', 2))) { /* consume */ }
		})()).rejects.toMatchObject({ message: 'generation failed' });
	});
	it('cancels the reader when the consumer stops', async () => {
		let canceled = false;
		const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(event('first'))); }, cancel() { canceled = true; } });
		const iterator = await createOpenAITextStream(body);
		await iterator.next();
		await iterator.return(undefined);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(canceled).toBe(true);
	});
});
