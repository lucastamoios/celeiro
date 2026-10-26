import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPatternCapabilities, initialPatternAction } from './patternAction.ts';

test('ignore patterns hide categorization, planned-entry, and retroactive controls', () => {
  assert.deepEqual(getPatternCapabilities('ignore'), {
    requiresTargets: false,
    supportsPlannedEntries: false,
    supportsRetroactive: false,
  });
});

test('categorization patterns retain targets, planned entries, and retroactive controls', () => {
  assert.deepEqual(getPatternCapabilities('categorize'), {
    requiresTargets: true,
    supportsPlannedEntries: true,
    supportsRetroactive: true,
  });
});

test('an ignored transaction starts the creator with the ignore action', () => {
  assert.equal(initialPatternAction(true), 'ignore');
  assert.equal(initialPatternAction(false), 'categorize');
});
