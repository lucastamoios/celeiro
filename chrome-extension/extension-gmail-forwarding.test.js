const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const extensionDir = __dirname;

test('BrowserExtension_manifest_allowsGmailForwardingAutomation', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, 'manifest.json'), 'utf8'));

  assert.ok(manifest.host_permissions.includes('https://mail.google.com/*'));
  assert.ok(manifest.permissions.includes('tabs'));
});

test('BrowserExtension_popup_exposesGmailForwardingAction', () => {
  const popup = fs.readFileSync(path.join(extensionDir, 'popup.html'), 'utf8');
  const script = fs.readFileSync(path.join(extensionDir, 'popup.js'), 'utf8');

  assert.match(popup, /id="gmailForwardingBtn"/);
  assert.match(popup, /id="forwardingEmail"/);
  assert.match(script, /startGmailForwarding/);
  assert.match(script, /email_id/);
});
