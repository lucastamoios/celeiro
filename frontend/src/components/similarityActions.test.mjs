import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('./TransactionList.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('TransactionList.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function handler(name, save) {
  let callback;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name && node.initializer && ts.isCallExpression(node.initializer)) {
      callback = node.initializer.arguments[0].getText(file);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.ok(callback, `missing ${name} callback`);
  const { outputText } = ts.transpileModule(`const callback = ${callback};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  });
  return new Function('handleInlineSave', `${outputText}\nreturn callback;`)(save);
}

for (const name of ['handleAcceptSuggestion', 'handleConfirmAutoClassification']) {
  test(`${name}: save failure is handled without an unhandled click rejection`, async () => {
    const callback = handler(name, async () => { throw new Error('save failed after rollback and notice'); });
    await assert.doesNotReject(callback({ category_id: 4, suggested_category_id: 5 }));
  });
}

test('accepting a suggestion applies description and clears its badge optimistically', async () => {
  const transaction = { category_id: null, suggested_category_id: 5, suggested_description: 'Mercado' };
  let saved;
  await handler('handleAcceptSuggestion', async (tx, patch) => { saved = { tx, patch }; })(transaction);
  assert.equal(saved.tx, transaction);
  assert.deepEqual(saved.patch, { category_id: 5, description: 'Mercado', classified_by: 'manual', suggested_category_id: null, suggested_description: null, suggestion_confidence: null });
});

test('confirming an automatic classification preserves its category and description', async () => {
  let saved;
  await handler('handleConfirmAutoClassification', async (_tx, patch) => { saved = patch; })({ category_id: 4 });
  assert.deepEqual(saved, { category_id: 4, classified_by: 'manual', suggested_category_id: null, suggested_description: null, suggestion_confidence: null });
});
