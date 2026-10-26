import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Exercise the actual JSX callback without requiring a browser or a production session.
function deleteHandler(component, confirmResult, events) {
  const source = fs.readFileSync(new URL(component, import.meta.url), 'utf8');
  const file = ts.createSourceFile(component, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  const visit = (node) => {
    if (ts.isJsxAttribute(node) && node.name.getText(file) === 'onClick' && node.initializer && ts.isJsxExpression(node.initializer)) {
      const text = node.initializer.expression?.getText(file);
      if (text?.includes('onDeleteEntry(entry.PlannedEntryID)') && text.includes('confirm(')) callback = text;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.ok(callback, `${component} must keep its confirmed entry deletion callback`);
  const factory = new Function('confirm', 'entry', 'onDeleteEntry', 'close', `return (${callback});`);
  return factory(() => confirmResult, { PlannedEntryID: 42, Description: 'Monthly entry' }, (id) => events.push(['delete', id]), () => events.push(['close']));
}

for (const component of ['CategoryBudgetCard.tsx', 'CategoryTransactionsModal.tsx']) {
  test(`${component}: cancel deletion keeps the menu open and does not delete`, () => {
    const events = [];
    deleteHandler(component, false, events)();
    assert.deepEqual(events, []);
  });
  test(`${component}: confirmed deletion calls once and closes the menu`, () => {
    const events = [];
    deleteHandler(component, true, events)();
    assert.deepEqual(events, [['delete', 42], ['close']]);
  });
  test(`${component}: matched entries cannot be deleted from the menu`, () => {
    const source = fs.readFileSync(new URL(component, import.meta.url), 'utf8');
    assert.match(source, /onDeleteEntry && entry\.Status !== 'matched'/);
  });
}
