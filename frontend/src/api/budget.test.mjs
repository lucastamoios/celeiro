import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let budgetApi;

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
  });
  budgetApi = await server.ssrLoadModule('/src/api/budget.ts');
});

after(async () => {
  await server.close();
});

test('getPlannedEntries normalizes a null collection to an empty array', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    const entries = await budgetApi.getPlannedEntries(
      { is_active: true },
      { token: 'test-token', organizationId: '42' },
    );
    assert.deepEqual(entries, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
