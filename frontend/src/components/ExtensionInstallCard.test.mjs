import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cardSource = fs.readFileSync(new URL('./ExtensionInstallCard.tsx', import.meta.url), 'utf8');
const settingsSource = fs.readFileSync(new URL('./AccountSettings.tsx', import.meta.url), 'utf8');

test('ExtensionInstallCard_render_showsFutureInstallButton', () => {
  assert.match(cardSource, /data-testid="extension-install-button"/);
  assert.match(cardSource, /Instalar extensão/);
  assert.match(cardSource, /disabled/);
  assert.match(cardSource, /Em breve/);
});

test('ExtensionInstallCard_render_keepsManualInstructionsCollapsed', () => {
  assert.match(cardSource, /<details/);
  assert.doesNotMatch(cardSource, /<details[^>]*\sopen(?:=|\s|>)/);
  assert.match(cardSource, /Instalação manual/);
  assert.match(cardSource, /chrome:\/\/extensions/);
  assert.match(cardSource, /about:debugging/);
});

test('AccountSettings_render_includesExtensionInstallCard', () => {
  assert.match(settingsSource, /import ExtensionInstallCard/);
  assert.match(settingsSource, /<ExtensionInstallCard\s*\/>/);
});
