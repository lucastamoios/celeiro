import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isMonthClosed } from './budgetState.ts';

test('isMonthClosed requires at least one budget and all budgets consolidated', () => {
  assert.equal(isMonthClosed([]), false);
  assert.equal(isMonthClosed([{ IsConsolidated: true }]), true);
  assert.equal(isMonthClosed([{ IsConsolidated: true }, { IsConsolidated: false }]), false);
});
