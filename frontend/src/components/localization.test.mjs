import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = (name) => readFile(new URL(name, import.meta.url), 'utf8');

test('financial UI copy is localized and contextual', async () => {
  const [monthly, category, goal, planned, tags, account, login, loginPage] = await Promise.all([
    source('MonthlyBudgetCard.tsx'),
    source('CategoryBudgetCard.tsx'),
    source('SavingsGoalCard.tsx'),
    source('PlannedEntryCard.tsx'),
    source('TagManager.tsx'),
    source('AccountSettings.tsx'),
    source('LoginForm.tsx'),
    source('LoginPage.tsx'),
  ]);

  assert.doesNotMatch(monthly, /No income for this month|Create an income budget/);
  assert.doesNotMatch(category, /'Critical'|'Warning'|'On Track'/);
  assert.doesNotMatch(goal, /aria-label="(?:Actions|goal icon)"/);
  assert.doesNotMatch(planned, /aria-label="Actions"/);
  assert.doesNotMatch(tags, /transacoes|Voce|comecar|icone|excluida|>Nao</);
  assert.doesNotMatch(account, /confirmação - isso será feito automaticamente/);
  assert.match(login, /authMode === 'register' \? 'Criar conta' : 'Entrar'/);
  assert.doesNotMatch(loginPage, />Entrar<|Acesse sua conta para continuar/);
});
