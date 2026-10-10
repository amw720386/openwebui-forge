// Opt-in integration test: requires a real Forge server and the running UI proxy.
import assert from 'node:assert/strict';
const base = process.env.UI_BASE_URL ?? 'http://127.0.0.1:5175';
const request = async (path, body) => {
  const response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(120000) });
  assert.equal(response.status, 200, await response.clone().text());
  return response;
};
const models = await (await request('/v1/models')).json();
const model = models.data[0]?.id;
assert.ok(model, 'Forge must have a loaded model');
const messages = [{ role: 'user', content: 'Hello! My name is Ada.' }];
const first = await (await request('/v1/chat/completions', { model, messages, max_tokens: 32, stream: false })).json();
const reply = first.choices[0].message.content;
assert.ok(reply.length > 0);
messages.push({ role: 'assistant', content: reply }, { role: 'user', content: 'What is my name?' });
const stream = await (await request('/v1/chat/completions', { model, messages, max_tokens: 32, stream: true })).text();
let content = '', finish = '', done = false;
for (const line of stream.split(/\r?\n/)) {
  if (!line.startsWith('data:')) continue;
  const data = line.slice(5).trim();
  if (data === '[DONE]') { done = true; continue; }
  const chunk = JSON.parse(data);
  assert.ok(!chunk.error, JSON.stringify(chunk.error));
  content += chunk.choices[0]?.delta?.content ?? '';
  finish ||= chunk.choices[0]?.finish_reason ?? '';
}
assert.ok(content.length && finish && done, 'Expected content, finish reason and [DONE]');
const exhausted = await fetch(`${base}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hello' }], max_tokens: 2048, stream: true }) });
// The default Forge context is 1024. Larger custom contexts may accept this request.
if (exhausted.status === 400) {
  const error = await exhausted.json();
  assert.match(error.error.message, /context/i);
  console.log('Real Forge context-limit error: passed');
} else {
  await exhausted.body?.cancel();
  console.log('Context-limit probe skipped: server accepts a 2048-token output budget');
}
console.log(`Real Forge integration passed (${model}): discovery, non-streaming, full-history follow-up, SSE finish/[DONE].`);
console.log(`Follow-up: ${content}`);