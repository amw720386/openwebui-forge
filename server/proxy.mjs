import http from 'node:http';

export function forgeTarget(value = process.env.FORGE_BASE_URL ?? 'http://127.0.0.1:8080') {
	const url = new URL(value);
	if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
		url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
		throw new Error('FORGE_BASE_URL must be a loopback HTTP origin, for example http://127.0.0.1:8080.');
	}
	return url;
}

/** @param {import('node:http').IncomingMessage} req */
export function localRequest(req) {
	try {
		const host = new URL(`http://${req.headers.host}`);
		return ['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname) &&
			(!req.headers.origin || req.headers.origin === host.origin) &&
			(!req.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(String(req.headers['sec-fetch-site'])));
	} catch { return false; }
}

/** @param {import('node:http').ServerResponse} res @param {number} status @param {string} message */
function fail(res, status, message) {
	if (res.headersSent) { res.destroy(); return; }
	res.writeHead(status, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' });
	res.end(JSON.stringify({ error: { message, type: 'proxy_error' } }));
}

// Shared by Vite development and the tiny production static server.
export function forgeProxy(target = forgeTarget()) {
	/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res @param {() => void} next */
	return (req, res, next) => {
		const path = req.url?.split('?')[0] ?? '';
		if (path !== '/v1' && !path.startsWith('/v1/')) { next(); return; }
		if (!localRequest(req)) { fail(res, 403, 'Only same-origin local requests are allowed.'); return; }
		const method = path === '/v1/models' ? 'GET' : path === '/v1/chat/completions' ? 'POST' : null;
		if (!method) { fail(res, 404, 'This UI only proxies Forge models and chat completions.'); return; }
		if (req.method !== method) { fail(res, 405, `${method} required`); return; }
		/** @type {import('node:http').IncomingMessage | undefined} */
		let upstreamResponse;
		const upstream = http.request(new URL(path, target), {
			method,
			headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
		}, (response) => {
			upstreamResponse = response;
			res.writeHead(response.statusCode ?? 502, {
				'Content-Type': response.headers['content-type'] ?? 'application/json',
				'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
			});
			res.flushHeaders();
			response.on('error', () => res.destroy());
			response.pipe(res);
		});
		upstream.on('error', () => {
			if (!res.destroyed) fail(res, 502, 'Cannot reach Forge. Start forge-server, check FORGE_BASE_URL, then refresh models or retry the response.');
		});
		if (method === 'GET') upstream.setTimeout(5000, () => upstream.destroy());
		// A closed browser response cancels the upstream HTTP request and Forge inference.
		res.on('close', () => { upstreamResponse?.destroy(); upstream.destroy(); });
		req.on('aborted', () => upstream.destroy());
		req.on('error', () => upstream.destroy());
		req.pipe(upstream);
	};
}
