const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildForwardingAddress,
  configureGmailForwarding,
} = require('./gmail-forwarding-flow.js');

test('GmailForwardingFlow_buildForwardingAddress_usesOnlyCeleiroEmailID', () => {
  assert.equal(buildForwardingAddress('User_123-abc'), 'user_123-abc@laguiar.dev');
});

test('GmailForwardingFlow_buildForwardingAddress_rejectsAddressInjection', () => {
  assert.throws(() => buildForwardingAddress('victim@example.com'), /invalid email id/i);
  assert.throws(() => buildForwardingAddress('../victim'), /invalid email id/i);
  assert.throws(() => buildForwardingAddress(''), /invalid email id/i);
});

test('GmailForwardingFlow_configureGmailForwarding_addsVerifiesAndEnablesAddress', async () => {
  const calls = [];
  const states = ['missing', 'pending', 'disabled', 'enabled'];
  const gateway = {
    inspect: async () => states.shift(),
    add: async (address) => calls.push(['add', address]),
    waitForVerification: async () => calls.push(['wait']),
    reloadSettings: async () => calls.push(['reload']),
    enable: async (address) => calls.push(['enable', address]),
    save: async () => calls.push(['save']),
  };

  const result = await configureGmailForwarding(
    gateway,
    'user_123@laguiar.dev',
    { maxVerificationChecks: 3 },
  );

  assert.deepEqual(result, { status: 'enabled', alreadyEnabled: false });
  assert.deepEqual(calls, [
    ['add', 'user_123@laguiar.dev'],
    ['wait'],
    ['reload'],
    ['wait'],
    ['reload'],
    ['enable', 'user_123@laguiar.dev'],
    ['save'],
    ['reload'],
  ]);
});

test('GmailForwardingFlow_configureGmailForwarding_doesNotChangeAlreadyEnabledSetup', async () => {
  const gateway = {
    inspect: async () => 'enabled',
    add: async () => assert.fail('must not add'),
    waitForVerification: async () => assert.fail('must not wait'),
    reloadSettings: async () => assert.fail('must not reload'),
    enable: async () => assert.fail('must not enable'),
    save: async () => assert.fail('must not save'),
  };

  assert.deepEqual(
    await configureGmailForwarding(gateway, 'user_123@laguiar.dev'),
    { status: 'enabled', alreadyEnabled: true },
  );
});

test('GmailForwardingFlow_configureGmailForwarding_rejectsUnconfirmedAddress', async () => {
  const gateway = {
    inspect: async () => 'pending',
    waitForVerification: async () => {},
    reloadSettings: async () => {},
  };

  await assert.rejects(
    configureGmailForwarding(gateway, 'user_123@laguiar.dev', { maxVerificationChecks: 2 }),
    /confirmation timed out/i,
  );
});
