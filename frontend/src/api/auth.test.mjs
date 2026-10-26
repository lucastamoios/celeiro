import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let authApi;

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
  });
  authApi = await server.ssrLoadModule('/src/api/auth.ts');
});

after(async () => {
  await server.close();
});

test('setPassword is account-scoped and does not require an organization', async () => {
  const originalFetch = globalThis.fetch;
  let capturedHeaders;
  globalThis.fetch = async (_url, init) => {
    capturedHeaders = init.headers;
    return new Response(JSON.stringify({ data: { message: 'ok' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await authApi.setPassword('', 'valid-password', { token: 'test-token' });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(capturedHeaders.Authorization, 'Bearer test-token');
  assert.equal(capturedHeaders['X-Active-Organization'], undefined);
});
