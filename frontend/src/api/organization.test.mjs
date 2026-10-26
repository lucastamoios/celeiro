import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let organizationApi;

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
  });
  organizationApi = await server.ssrLoadModule('/src/api/organization.ts');
});

after(async () => {
  await server.close();
});

test('getOrganizationMembers uses the path organization ID in the authorization header', async () => {
  const originalFetch = globalThis.fetch;
  let capturedHeaders;
  globalThis.fetch = async (_url, init) => {
    capturedHeaders = init.headers;
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await organizationApi.getOrganizationMembers(42, { token: 'test-token' });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(capturedHeaders['X-Active-Organization'], '42');
});
