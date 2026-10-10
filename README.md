# openwebui-forge

A small, local, single-user chat UI for the independent [Forge inference runtime](https://github.com/amw720386/forge). Derived from [Open WebUI v0.6.5](https://github.com/open-webui/open-webui/tree/v0.6.5), preserving its Git history, chat layout, reusable Svelte components, Markdown rendering and code blocks. The original frontend is the work of Open WebUI's authors; see [LICENSE](LICENSE), [NOTICE](NOTICE) and [baseline verification](docs/UPSTREAM.md).

## Run locally on Windows

Requires Node.js 22 or 24, npm, and a separately built Forge server with a supported model. No Python, Docker, API key or account is needed for this UI.

In **Forge's own directory**, follow its build/model instructions, then run, for example:

```powershell
.\bin\forge-server.exe -model models/Qwen2.5-0.5B-Instruct -device cpu
```

Leave Forge running at `http://127.0.0.1:8080`. This project does not build Forge, download models or execute inference.

In **this directory**:

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:5175**. For a production build:

```powershell
npm run build
npm start
```

Both servers bind to loopback. The UI proxies only `GET /v1/models` and `POST /v1/chat/completions` to Forge, using the returned model ID and full conversation history. To use another local Forge port, set `$env:FORGE_BASE_URL = 'http://127.0.0.1:8082'` before starting the UI. Remote targets and cross-origin proxy requests are rejected. No Forge CORS changes are needed.

## Features and limits

Sidebar, new/rename/delete/search chats, streaming, stop, latest-response regeneration, Markdown, highlighted common code languages, copy, responsive layout and light/dark/system themes. Stop cancels the HTTP request and keeps partial text. Settings expose only maximum output tokens (default 64).

History and settings are stored in this browser's localStorage for this exact URL; clearing browser data removes them. Export history from Settings. Use one active tab; there is no multi-tab synchronization or import. Storage failures are shown. No accounts, providers, tools, RAG, images, audio, model downloads or telemetry remain.

Forge is stateless and greedy. Input history plus output must fit its context (currently 1024 tokens by default). Context errors preserve history and suggest a smaller output limit or new chat; no messages are silently trimmed. When Forge restarts, use **Refresh models**. The model selector never loads a model on the server.

## Verify

```powershell
npm run check
npm test
npm run build
# Requires a real Forge server and the running UI:
npm run test:forge
```

Automated tests use fixtures for fragmented Unicode SSE, errors, persistence, cancellation and offline/restart behavior. `test:forge` separately exercises real model discovery, non-streaming chat, a streamed full-history follow-up and the default context limit. Refresh bundled notices with `node scripts/notices.mjs` after changing runtime dependencies. Upstream BSD attribution, Inter's OFL, and bundled-library notices are included in the served assets.