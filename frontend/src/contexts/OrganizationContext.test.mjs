import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let sessionAuthorization;

before(async () => {
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, hmr: false },
  });
  sessionAuthorization = await server.ssrLoadModule('/src/contexts/sessionAuthorization.ts');
});

after(async () => {
  await server.close();
});

// Regression test: a forbidden session bootstrap left the authenticated UI loading forever.
// Direct cause: HTTP 403 was handled as a generic fetch error instead of ending the session.
// Root cause: session authorization failures had no shared classification policy.
test('OrganizationContext_sessionBootstrap_logsOutAfterForbiddenResponse', () => {
  assert.equal(sessionAuthorization.isSessionAuthorizationFailure(403), true);
});

test('OrganizationContext_sessionBootstrap_logsOutAfterUnauthorizedResponse', () => {
  assert.equal(sessionAuthorization.isSessionAuthorizationFailure(401), true);
});

test('OrganizationContext_sessionBootstrap_keepsOtherFailuresVisible', () => {
  assert.equal(sessionAuthorization.isSessionAuthorizationFailure(500), false);
});

// Regression test: a hard-coded organization ID made valid users receive 403 after login.
// Direct cause: the session bootstrap sent X-Active-Organization before discovering memberships.
// Root cause: account-scoped session discovery was incorrectly coupled to organization scope.
test('OrganizationContext_sessionBootstrap_doesNotPreselectOrganization', () => {
  assert.deepEqual(
    sessionAuthorization.buildSessionBootstrapHeaders?.('test-token'),
    { Authorization: 'Bearer test-token' },
  );
});
