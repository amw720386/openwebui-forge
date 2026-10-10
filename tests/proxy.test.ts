import http from 'node:http';
import { once } from 'node:events';
import { describe, it, expect } from 'vitest';
import { forgeProxy, forgeTarget } from '../server/proxy.mjs';

async function listen(server: http.Server) {
	server.listen(0, '127.0.0.1'); await once(server, 'listening');
	return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
async function close(server: http.Server) { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
describe('local proxy', () => {
	it('rejects remote targets, credentials and API path overrides', () => {
		for (const target of ['http://example.com', 'https://127.0.0.1', 'http://user:secret@localhost', 'http://127.0.0.1/v1']) expect(() => forgeTarget(target)).toThrow();
	});
	it('forwards text requests, blocks other origins/routes and reconnects after restart', async () => {
		let received = '';
		const upstream = http.createServer((req, res) => { req.on('data', (data) => received += data); req.on('end', () => { res.setHeader('Content-Type', 'application/json'); res.end('{"data":[{"id":"fixture"}]}'); }); });
		const target = await listen(upstream);
		const proxy = forgeProxy(forgeTarget(target));
		const ui = http.createServer((req, res) => proxy(req, res, () => { res.writeHead(404); res.end(); }));
		const base = await listen(ui);
		try {
			expect((await fetch(`${base}/v1/models`)).status).toBe(200);
			const body = '{"model":"fixture","messages":[{"role":"user","content":"hello"}],"stream":true,"max_tokens":64}';
			await fetch(`${base}/v1/chat/completions`, { method: 'POST', body });
			expect(received).toBe(body);
			expect((await fetch(`${base}/v1/models`, { headers: { Origin: 'https://evil.example' } })).status).toBe(403);
			const hostileHost = await new Promise<number>((resolve, reject) => {
				http.get(`${base}/v1/models`, { headers: { Host: 'evil.example' } }, (response) => { response.resume(); resolve(response.statusCode!); }).on('error', reject);
			});
			expect(hostileHost).toBe(403);
			expect((await fetch(`${base}/v1/embeddings`, { method: 'POST' })).status).toBe(404);
			expect((await fetch(`${base}/v1/models`, { method: 'POST' })).status).toBe(405);
			const port = (upstream.address() as { port: number }).port;
			await close(upstream);
			const offline = await fetch(`${base}/v1/models`); expect(offline.status).toBe(502); expect(await offline.text()).toContain('Cannot reach Forge');
			upstream.listen(port, '127.0.0.1'); await once(upstream, 'listening');
			expect((await fetch(`${base}/v1/models`)).status).toBe(200);
		} finally { await close(ui); await close(upstream); }
	});
	it('propagates Stop/disconnect to the upstream server', async () => {
		let canceled = false;
		const upstream = http.createServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('data: first\n\n');
			res.on('close', () => canceled = true);
		});
		const target = await listen(upstream), proxy = forgeProxy(forgeTarget(target));
		const ui = http.createServer((req, res) => proxy(req, res, () => res.end()));
		const base = await listen(ui);
		try {
			const abort = new AbortController();
			const response = await fetch(`${base}/v1/chat/completions`, { method: 'POST', body: '{}', signal: abort.signal });
			await response.body!.getReader().read(); abort.abort();
			await new Promise((resolve) => setTimeout(resolve, 100)); expect(canceled).toBe(true);
		} finally { await close(ui); await close(upstream); }
	});
});
