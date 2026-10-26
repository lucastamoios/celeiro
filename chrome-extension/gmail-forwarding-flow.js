(function exposeGmailForwardingFlow(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.CeleiroGmailForwarding = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGmailForwardingFlow() {
  const IMPORT_DOMAIN = 'laguiar.dev';
  const EMAIL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/i;

  function buildForwardingAddress(emailID) {
    const normalized = String(emailID || '').trim().toLowerCase();
    if (!EMAIL_ID_PATTERN.test(normalized)) {
      throw new Error('Invalid email ID');
    }
    return `${normalized}@${IMPORT_DOMAIN}`;
  }

  async function configureGmailForwarding(gateway, address, options = {}) {
    const maxVerificationChecks = options.maxVerificationChecks ?? 12;
    let state = await gateway.inspect(address);

    if (state === 'enabled') {
      return { status: 'enabled', alreadyEnabled: true };
    }

    if (state === 'missing') {
      await gateway.add(address);
      state = 'pending';
    }

    for (let attempt = 0; (state === 'pending' || state === 'missing') && attempt < maxVerificationChecks; attempt += 1) {
      await gateway.waitForVerification();
      await gateway.reloadSettings();
      state = await gateway.inspect(address);
    }

    if (state === 'pending' || state === 'missing') {
      throw new Error('Gmail forwarding confirmation timed out');
    }

    if (state !== 'disabled') {
      throw new Error(`Unsupported Gmail forwarding state: ${state}`);
    }

    await gateway.enable(address);
    await gateway.save();
    await gateway.reloadSettings();

    state = await gateway.inspect(address);
    if (state !== 'enabled') {
      throw new Error('Gmail did not enable forwarding');
    }

    return { status: 'enabled', alreadyEnabled: false };
  }

  return {
    IMPORT_DOMAIN,
    buildForwardingAddress,
    configureGmailForwarding,
  };
});
