import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync(new URL('./Dockerfile', import.meta.url), 'utf8');

test('FrontendDockerfile exposes the reCAPTCHA site key to the Vite build', () => {
  assert.match(dockerfile, /^ARG VITE_RECAPTCHA_SITE_KEY$/m);
  assert.match(
    dockerfile,
    /^ENV VITE_RECAPTCHA_SITE_KEY=\$VITE_RECAPTCHA_SITE_KEY$/m,
  );
});
