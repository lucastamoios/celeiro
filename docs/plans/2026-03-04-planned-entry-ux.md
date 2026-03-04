# Planned Entry UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the complex `PlannedEntryForm` (for creates) with a focused 3-field form that inlines pattern creation, adds an autocomplete from transaction descriptions, and fixes the bidirectional pattern↔entry relationship bug.

**Architecture:** New `NewPlannedEntryForm.tsx` component handles the full 3-step API sequence (create entry → create pattern → link both). The `TransactionPlannedEntryLinkModal` gets a "Criar nova" button that opens this form inline and auto-links after creation. `CategoryBudgetDashboard` replaces the create flow only — edit still uses the existing `PlannedEntryForm`.

**Tech Stack:** React 19 + TypeScript. No new backend endpoints needed — `allTransactions` is already loaded in the dashboard, and the pattern creation uses the existing `POST /financial/patterns` endpoint.

**Design doc:** `docs/plans/2026-03-04-planned-entry-ux-design.md`

---

### Task 1: Create `NewPlannedEntryForm.tsx`

**Files:**
- Create: `frontend/src/components/NewPlannedEntryForm.tsx`

**What to build:** A focused form with three always-visible fields (description, category, match text), an optional collapsible section, and a `PatternCreator` escape hatch. Handles the 3-step API sequence internally: create planned entry → create pattern with `linked_planned_entry_id` → update planned entry with `pattern_id`.

**Step 1: Create the file with this full implementation**

```tsx
import { useState } from 'react';
import type { Category } from '../types/category';
import type { PlannedEntry } from '../types/budget';
import type { SavingsGoal } from '../types/savingsGoals';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { financialUrl } from '../config/api';
import { createPlannedEntry, updatePlannedEntry } from '../api/budget';
import PatternCreator, { type AdvancedPattern } from './PatternCreator';
import TagSelector from './TagSelector';

// Matches Go's regexp.QuoteMeta — escapes special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface NewPlannedEntryFormProps {
  categories: Category[];
  savingsGoals?: SavingsGoal[];
  /** Raw original_description values from existing transactions, for autocomplete */
  transactionDescriptions?: string[];
  onSuccess: (entry: PlannedEntry) => void;
  onCancel: () => void;
  /** Pre-fill from context (e.g. from a transaction) */
  initialDescription?: string;
  initialCategoryId?: number;
  /** Raw bank text to match — defaults to initialDescription */
  initialMatchText?: string;
  initialAmount?: string;
  /** Recurrent defaults true from transaction context, false from budget page */
  initialIsRecurrent?: boolean;
}

export default function NewPlannedEntryForm({
  categories,
  savingsGoals = [],
  transactionDescriptions = [],
  onSuccess,
  onCancel,
  initialDescription = '',
  initialCategoryId,
  initialMatchText,
  initialAmount = '',
  initialIsRecurrent = false,
}: NewPlannedEntryFormProps) {
  const { token } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization_id?.toString() || '1';

  // Core fields
  const [description, setDescription] = useState(initialDescription);
  const [matchText, setMatchText] = useState(initialMatchText ?? initialDescription);
  // When true, matchText won't auto-sync from description
  const [matchTextEdited, setMatchTextEdited] = useState(
    !!initialMatchText && initialMatchText !== initialDescription
  );
  const [categoryId, setCategoryId] = useState(initialCategoryId?.toString() ?? '');
  const [isRecurrent, setIsRecurrent] = useState(initialIsRecurrent);

  // Optional section
  const [showOptional, setShowOptional] = useState(false);
  const [amount, setAmount] = useState(initialAmount);
  const [expectedDay, setExpectedDay] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [savingsGoalId, setSavingsGoalId] = useState('');

  // Advanced pattern (from PatternCreator escape hatch)
  const [advancedPattern, setAdvancedPattern] = useState<AdvancedPattern | null>(null);
  const [showPatternCreator, setShowPatternCreator] = useState(false);

  // Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync matchText from description unless the user has manually edited it
  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (!matchTextEdited) setMatchText(value);
  };

  const handleMatchTextChange = (value: string) => {
    setMatchText(value);
    setMatchTextEdited(true);
    // Clear advanced pattern since the user is overriding it
    setAdvancedPattern(null);
  };

  // Filter suggestions by matchText (case-insensitive, max 8)
  const suggestions = transactionDescriptions
    .filter(d => d && matchText.length >= 2 && d.toLowerCase().includes(matchText.toLowerCase()))
    .slice(0, 8);

  const handleSuggestionSelect = (suggestion: string) => {
    setMatchText(suggestion);
    setMatchTextEdited(true);
    setAdvancedPattern(null);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !categoryId || !token) return;

    setSaving(true);
    setError(null);

    try {
      // Step 1: Create planned entry (no pattern_id yet)
      const parsedAmount = parseFloat(amount || '0');
      const parsedDay = expectedDay ? parseInt(expectedDay) : undefined;

      const entry = await createPlannedEntry(
        {
          description: description.trim(),
          category_id: parseInt(categoryId),
          amount: parsedAmount,
          amount_min: parsedAmount,
          amount_max: parsedAmount,
          is_recurrent: isRecurrent,
          entry_type: 'expense',
          expected_day_start: parsedDay,
          expected_day_end: parsedDay,
          savings_goal_id: savingsGoalId ? parseInt(savingsGoalId) : undefined,
          tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        },
        { token, organizationId }
      );

      // Step 2: Create pattern (simple contains or advanced from escape hatch)
      const patternToCreate: AdvancedPattern | null =
        advancedPattern ??
        (matchText.trim()
          ? {
              description_pattern: `.*${escapeRegex(matchText.trim())}.*`,
              target_description: description.trim(),
              target_category_id: parseInt(categoryId),
            }
          : null);

      if (patternToCreate) {
        const patternResponse = await fetch(financialUrl('patterns'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Active-Organization': organizationId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...patternToCreate,
            // Sets the reverse pointer so pattern knows its planned entry
            linked_planned_entry_id: entry.PlannedEntryID,
            apply_retroactively: true,
          }),
        });

        if (patternResponse.ok) {
          const patternData = await patternResponse.json();
          const patternId = patternData.data?.pattern_id;

          // Step 3: Update planned entry with the new pattern_id
          if (patternId) {
            await updatePlannedEntry(
              entry.PlannedEntryID,
              { pattern_id: patternId },
              { token, organizationId }
            );
          }
        }
      }

      onSuccess(entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar entrada planejada');
    } finally {
      setSaving(false);
    }
  };

  const categoriesMap = new Map(categories.map(c => [c.category_id, c]));

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-rust-50 border border-rust-200 rounded-lg p-3 text-sm text-rust-800">
            ⚠️ {error}
          </div>
        )}

        {/* Description */}
        <div className="relative">
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Descrição *
          </label>
          <input
            type="text"
            value={description}
            onChange={e => handleDescriptionChange(e.target.value)}
            placeholder="Ex: Netflix, Aluguel, Salário..."
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Categoria *
          </label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map(c => (
              <option key={c.category_id} value={c.category_id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Match text */}
        <div className="relative">
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Identificar transações que contenham
          </label>
          <input
            type="text"
            value={advancedPattern ? '(padrão avançado configurado)' : matchText}
            onChange={e => !advancedPattern && handleMatchTextChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            readOnly={!!advancedPattern}
            placeholder="Texto do banco para auto-match..."
            className={`w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 ${
              advancedPattern ? 'bg-stone-100 text-stone-500 cursor-default' : ''
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-stone-500">
              {advancedPattern
                ? 'Padrão avançado — '
                : 'Transações contendo este texto serão auto-categorizadas — '}
              <button
                type="button"
                onClick={() => setShowPatternCreator(true)}
                className="text-wheat-600 hover:text-wheat-700 font-medium underline"
              >
                {advancedPattern ? 'editar padrão avançado' : 'Usar regex →'}
              </button>
              {advancedPattern && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => { setAdvancedPattern(null); setMatchTextEdited(false); }}
                    className="text-stone-400 hover:text-stone-600 underline"
                  >
                    remover
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSuggestionSelect(s)}
                  className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-wheat-50 truncate"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Optional section */}
        <div className="pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showOptional ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showOptional ? 'Ocultar opções' : '＋ Mais opções'} (valor, dia, recorrente, tags...)
          </button>

          {showOptional && (
            <div className="mt-3 space-y-3">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-stone-500 text-sm">R$</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={e => {
                      if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value))
                        setAmount(e.target.value);
                    }}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 text-sm"
                  />
                </div>
              </div>

              {/* Expected day */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Dia esperado</label>
                <input
                  type="text"
                  value={expectedDay}
                  onChange={e => {
                    if (e.target.value === '' || /^\d+$/.test(e.target.value))
                      setExpectedDay(e.target.value);
                  }}
                  placeholder="Ex: 15"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 text-sm"
                />
              </div>

              {/* Recurrent */}
              <label className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100">
                <input
                  type="checkbox"
                  checked={isRecurrent}
                  onChange={e => setIsRecurrent(e.target.checked)}
                  className="h-4 w-4 text-wheat-600 focus:ring-wheat-500 border-stone-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-stone-700">Entrada recorrente</span>
                  <p className="text-xs text-stone-500">Aparece automaticamente todo mês</p>
                </div>
              </label>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tags</label>
                <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
              </div>

              {/* Savings goal */}
              {savingsGoals.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Meta de poupança</label>
                  <select
                    value={savingsGoalId}
                    onChange={e => setSavingsGoalId(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-wheat-500 focus:border-wheat-500 text-sm"
                  >
                    <option value="">Nenhuma meta</option>
                    {savingsGoals.filter(g => g.is_active && !g.is_completed).map(g => (
                      <option key={g.savings_goal_id} value={g.savings_goal_id}>
                        {g.icon || '🎯'} {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !description.trim() || !categoryId}
            className="px-4 py-2 text-white bg-gradient-to-r from-wheat-500 to-wheat-600 rounded-lg hover:from-wheat-600 hover:to-wheat-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
          >
            {saving ? 'Criando...' : 'Criar Entrada'}
          </button>
        </div>
      </form>

      {/* Advanced pattern escape hatch */}
      {showPatternCreator && (
        <PatternCreator
          categories={categoriesMap}
          onClose={() => setShowPatternCreator(false)}
          onSave={async (pattern) => {
            // Store config — actual API call happens in handleSubmit
            setAdvancedPattern(pattern);
            setShowPatternCreator(false);
          }}
          initialSourceText={matchText}
          initialTargetDescription={description}
          initialTargetCategoryId={categoryId ? parseInt(categoryId) : undefined}
        />
      )}
    </>
  );
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `NewPlannedEntryForm.tsx`.

**Step 3: Commit**

```bash
git add frontend/src/components/NewPlannedEntryForm.tsx
git commit -m "feat: add NewPlannedEntryForm with inline pattern and autocomplete"
```

---

### Task 2: Update `TransactionPlannedEntryLinkModal.tsx` — add "Criar nova" flow

**Files:**
- Modify: `frontend/src/components/TransactionPlannedEntryLinkModal.tsx`

The modal currently shows an empty-state message when no entries exist. We add a "Criar nova entrada planejada" button. When clicked, the modal content switches to `NewPlannedEntryForm` pre-filled from the transaction. On success, auto-link the new entry to the transaction, then call `onLink()`.

**Step 1: Add imports at the top of the file**

After the existing imports, add:

```typescript
import NewPlannedEntryForm from './NewPlannedEntryForm';
import type { PlannedEntry } from '../types/budget';
```

Also add `matchPlannedEntry` to the existing import from `'../api/budget'`:
```typescript
import { getPlannedEntriesForMonth, matchPlannedEntry } from '../api/budget';
```
(It's already imported — verify it's there. If not, add it.)

**Step 2: Add `showCreateForm` state after the existing state declarations**

```typescript
const [showCreateForm, setShowCreateForm] = useState(false);
```

**Step 3: Add `handleCreateSuccess` after `handleLink`**

```typescript
const handleCreateSuccess = async (entry: PlannedEntry) => {
  if (!token) return;
  try {
    await matchPlannedEntry(
      entry.PlannedEntryID,
      {
        transaction_id: transaction.transaction_id,
        month: txMonth,
        year: txYear,
      },
      { token, organizationId }
    );
    onLink();
  } catch (err) {
    // Entry was created — still close and refresh even if linking fails
    console.error('Failed to auto-link new entry:', err);
    onLink();
  }
};
```

**Step 4: Replace the empty-state JSX**

Find and replace the empty-state block (inside `{sortedEntries.length === 0 ? (...)}`):

```tsx
// BEFORE:
<div className="text-center py-8">
  <p className="text-stone-500 mb-2">Nenhuma entrada planejada disponível</p>
  <p className="text-sm text-stone-400">
    {entries.length > 0
      ? 'Todas as entradas já estão vinculadas ou foram filtradas'
      : `Nenhuma entrada planejada para ...`}
  </p>
</div>

// AFTER:
<div className="text-center py-8">
  <p className="text-stone-500 mb-2">Nenhuma entrada planejada disponível</p>
  <p className="text-sm text-stone-400 mb-4">
    {entries.length > 0
      ? 'Todas as entradas já estão vinculadas ou foram filtradas'
      : `Nenhuma entrada planejada para ${parseTransactionDate(transaction.transaction_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
  </p>
  <button
    onClick={() => setShowCreateForm(true)}
    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-wheat-500 to-wheat-600 rounded-lg hover:from-wheat-600 hover:to-wheat-700 transition-all"
  >
    ＋ Criar nova entrada planejada
  </button>
</div>
```

**Step 5: Add "Criar nova" as a secondary option in the footer**

Find the footer div and replace:

```tsx
// BEFORE:
<div className="px-6 py-4 border-t border-stone-200 flex justify-end">
  <button
    onClick={onClose}
    className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
  >
    Cancelar
  </button>
</div>

// AFTER:
<div className="px-6 py-4 border-t border-stone-200 flex items-center justify-between">
  <button
    onClick={() => setShowCreateForm(true)}
    className="px-3 py-1.5 text-sm font-medium text-wheat-700 border border-wheat-300 rounded-lg hover:bg-wheat-50 transition-colors"
  >
    ＋ Nova entrada
  </button>
  <button
    onClick={onClose}
    className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
  >
    Cancelar
  </button>
</div>
```

**Step 6: Conditionally render the create form**

Wrap the existing content area and conditionally show the form. After the `{/* Content */}` div's closing `</div>`, add — OR replace the content div to check `showCreateForm`:

Find the outer structure of the modal:
```tsx
{/* Content */}
<div className="flex-1 overflow-y-auto px-6 py-4">
  {/* existing content... */}
</div>
```

Replace with:
```tsx
{/* Content */}
<div className="flex-1 overflow-y-auto px-6 py-4">
  {showCreateForm ? (
    <NewPlannedEntryForm
      categories={Array.from(categories.values())}
      onSuccess={handleCreateSuccess}
      onCancel={() => setShowCreateForm(false)}
      initialDescription={transaction.description}
      initialCategoryId={transaction.category_id ?? undefined}
      initialMatchText={transaction.original_description || transaction.description}
      initialAmount={String(Math.abs(transaction.amount))}
      initialIsRecurrent={true}
    />
  ) : (
    /* the existing loading / error / list JSX unchanged */
    <>
      {loading ? (
        /* ...skeleton... */
      ) : error ? (
        /* ...error... */
      ) : sortedEntries.length === 0 ? (
        /* ...empty state with "Criar nova" button (from Step 4)... */
      ) : (
        /* ...entry list... */
      )}
    </>
  )}
</div>
```

**Step 7: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `TransactionPlannedEntryLinkModal.tsx`.

**Step 8: Commit**

```bash
git add frontend/src/components/TransactionPlannedEntryLinkModal.tsx
git commit -m "feat: add 'Criar nova' flow to TransactionPlannedEntryLinkModal"
```

---

### Task 3: Update `CategoryBudgetDashboard.tsx` — use `NewPlannedEntryForm` for create

**Files:**
- Modify: `frontend/src/components/CategoryBudgetDashboard.tsx`

Replace the `PlannedEntryForm` used for **creating** entries with `NewPlannedEntryForm`. The edit usage (`editingPlannedEntryFromBudget`) stays as `PlannedEntryForm` — that's out of scope.

**Step 1: Add import**

After `import PlannedEntryForm from './PlannedEntryForm';`, add:
```typescript
import NewPlannedEntryForm from './NewPlannedEntryForm';
```

**Step 2: Replace the create modal's `<PlannedEntryForm>` usage**

Find this block (around line 1632):

```tsx
<PlannedEntryForm
  categories={categories}
  savingsGoals={savingsGoals}
  onSubmit={editingEntry ? handleUpdatePlannedEntry : handleCreatePlannedEntry}
  onCancel={() => {
    setShowCreateEntryModal(false);
    setEditingEntry(null);
    setSelectedEntryMonth(null);
    setPreselectedCategoryForEntry(null);
  }}
  ...
```

This modal handles both create AND edit via `editingEntry`. Since we're only changing create, split the render:

```tsx
{editingEntry ? (
  <PlannedEntryForm
    categories={categories}
    savingsGoals={savingsGoals}
    onSubmit={handleUpdatePlannedEntry}
    onCancel={() => {
      setShowCreateEntryModal(false);
      setEditingEntry(null);
      setSelectedEntryMonth(null);
      setPreselectedCategoryForEntry(null);
    }}
    initialEntry={editingEntry}
    isLoading={isSubmitting}
  />
) : (
  <NewPlannedEntryForm
    categories={categories}
    savingsGoals={savingsGoals}
    transactionDescriptions={
      allTransactions
        .map(t => t.original_description)
        .filter((d): d is string => !!d)
    }
    onSuccess={async () => {
      setShowCreateEntryModal(false);
      setPreselectedCategoryForEntry(null);
      await fetchAllData();
      setSuccessMessage('Entrada planejada criada com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }}
    onCancel={() => {
      setShowCreateEntryModal(false);
      setPreselectedCategoryForEntry(null);
    }}
    initialCategoryId={preselectedCategoryForEntry ?? undefined}
    initialIsRecurrent={false}
  />
)}
```

Note: Check that `initialEntry` prop is passed correctly to the edit `PlannedEntryForm` — look at the existing code to see exactly which props are passed and preserve them all for the edit path.

**Step 3: Check TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/src/components/CategoryBudgetDashboard.tsx
git commit -m "feat: use NewPlannedEntryForm for planned entry creation in budget dashboard"
```

---

### Task 4: Verify build, push, deploy

**Step 1: Full TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

**Step 2: Smoke-test the flows mentally**

Confirm these scenarios are covered:
- [ ] Create entry from budget page → form opens blank, autocomplete works if allTransactions is populated
- [ ] Create entry from transaction link modal (empty list) → "Criar nova" appears → form pre-filled → on save, auto-linked to transaction
- [ ] Create entry from transaction link modal (entries exist) → "＋ Nova entrada" button in footer → same flow
- [ ] Edit entry from budget page → still uses old `PlannedEntryForm` (unchanged)
- [ ] Pattern created → both `linked_planned_entry_id` on pattern AND `pattern_id` on entry are set

**Step 3: Push**

```bash
git push origin master
```

**Step 4: Watch deploy**

```bash
gh run list --limit 3 --repo lucastamoios/celeiro
```

Wait for the run to succeed.
