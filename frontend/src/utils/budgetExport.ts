import type { CategoryBudget, PlannedEntryWithStatus } from '../types/budget';
import type { Category } from '../types/category';

interface ExportOptions {
  month: number;
  year: number;
  budgets: CategoryBudget[];
  plannedEntries: PlannedEntryWithStatus[];
  categories: Category[];
  actualSpending: Record<number, string>;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'matched': return 'Pago';
    case 'scheduled': return 'Agendado';
    case 'pending': return 'Pendente';
    case 'missed': return 'Atrasado';
    case 'dismissed': return 'Dispensado';
    default: return status;
  }
}

export function generateBudgetExportText(options: ExportOptions): string {
  const { month, year, budgets, plannedEntries, categories, actualSpending } = options;

  const categoryMap = new Map(categories.map(c => [c.category_id, c]));
  const incomeCategoryIds = new Set(
    categories.filter(c => c.category_type === 'income').map(c => c.category_id)
  );

  // Separate expense and income budgets
  const expenseBudgets = budgets.filter(b => !incomeCategoryIds.has(b.CategoryID));
  const incomeBudgets = budgets.filter(b => incomeCategoryIds.has(b.CategoryID));

  // Calculate totals
  const totalPlannedExpenses = expenseBudgets.reduce(
    (sum, b) => sum + parseFloat(b.PlannedAmount || '0'), 0
  );
  const totalActualExpenses = expenseBudgets.reduce(
    (sum, b) => sum + parseFloat(actualSpending[b.CategoryID] || '0'), 0
  );
  const totalPlannedIncome = incomeBudgets.reduce(
    (sum, b) => sum + parseFloat(b.PlannedAmount || '0'), 0
  );
  const totalActualIncome = incomeBudgets.reduce(
    (sum, b) => sum + parseFloat(actualSpending[b.CategoryID] || '0'), 0
  );

  // Group planned entries by category
  const entriesByCategory = new Map<number, PlannedEntryWithStatus[]>();
  for (const entry of plannedEntries) {
    const existing = entriesByCategory.get(entry.CategoryID) || [];
    existing.push(entry);
    entriesByCategory.set(entry.CategoryID, existing);
  }

  // Build export text
  const lines: string[] = [];

  lines.push(`# Orçamento ${monthNames[month - 1]} ${year}`);
  lines.push('');

  // Summary section
  lines.push('## Resumo');
  lines.push('');
  lines.push(`- **Receita planejada:** ${formatCurrency(totalPlannedIncome)}`);
  lines.push(`- **Receita realizada:** ${formatCurrency(totalActualIncome)}`);
  lines.push(`- **Despesas planejadas:** ${formatCurrency(totalPlannedExpenses)}`);
  lines.push(`- **Despesas realizadas:** ${formatCurrency(totalActualExpenses)}`);
  lines.push(`- **Saldo planejado:** ${formatCurrency(totalPlannedIncome - totalPlannedExpenses)}`);
  lines.push(`- **Saldo realizado:** ${formatCurrency(totalActualIncome - totalActualExpenses)}`);
  lines.push('');

  // Income categories
  if (incomeBudgets.length > 0) {
    lines.push('## Receitas');
    lines.push('');
    for (const budget of incomeBudgets) {
      const category = categoryMap.get(budget.CategoryID);
      const categoryName = category?.name || 'Sem nome';
      const planned = parseFloat(budget.PlannedAmount || '0');
      const actual = parseFloat(actualSpending[budget.CategoryID] || '0');
      const variance = actual - planned;
      const variancePercent = planned > 0 ? ((variance / planned) * 100).toFixed(1) : '0';

      lines.push(`### ${categoryName}`);
      lines.push(`- Planejado: ${formatCurrency(planned)}`);
      lines.push(`- Realizado: ${formatCurrency(actual)}`);
      lines.push(`- Variação: ${formatCurrency(variance)} (${variance >= 0 ? '+' : ''}${variancePercent}%)`);

      // List planned entries for this category
      const categoryEntries = entriesByCategory.get(budget.CategoryID) || [];
      if (categoryEntries.length > 0) {
        lines.push('- Entradas planejadas:');
        for (const entry of categoryEntries) {
          const amount = entry.Status === 'matched' && entry.MatchedAmount
            ? parseFloat(entry.MatchedAmount)
            : parseFloat(entry.Amount);
          lines.push(`  - ${entry.Description}: ${formatCurrency(amount)} [${getStatusLabel(entry.Status)}]`);
        }
      }
      lines.push('');
    }
  }

  // Expense categories
  if (expenseBudgets.length > 0) {
    lines.push('## Despesas');
    lines.push('');

    // Sort by actual spending (highest first)
    const sortedBudgets = [...expenseBudgets].sort((a, b) => {
      const aActual = parseFloat(actualSpending[a.CategoryID] || '0');
      const bActual = parseFloat(actualSpending[b.CategoryID] || '0');
      return bActual - aActual;
    });

    for (const budget of sortedBudgets) {
      const category = categoryMap.get(budget.CategoryID);
      const categoryName = category?.name || 'Sem nome';
      const planned = parseFloat(budget.PlannedAmount || '0');
      const actual = parseFloat(actualSpending[budget.CategoryID] || '0');
      const variance = actual - planned;
      const variancePercent = planned > 0 ? ((variance / planned) * 100).toFixed(1) : '0';
      const status = variance > 0 ? '⚠️ Acima' : variance < 0 ? '✅ Abaixo' : '✅ No limite';

      lines.push(`### ${categoryName} ${status}`);
      lines.push(`- Planejado: ${formatCurrency(planned)}`);
      lines.push(`- Realizado: ${formatCurrency(actual)}`);
      lines.push(`- Variação: ${formatCurrency(variance)} (${variance >= 0 ? '+' : ''}${variancePercent}%)`);

      // List planned entries for this category
      const categoryEntries = entriesByCategory.get(budget.CategoryID) || [];
      if (categoryEntries.length > 0) {
        lines.push('- Entradas planejadas:');
        for (const entry of categoryEntries) {
          const amount = entry.Status === 'matched' && entry.MatchedAmount
            ? parseFloat(entry.MatchedAmount)
            : parseFloat(entry.Amount);
          lines.push(`  - ${entry.Description}: ${formatCurrency(amount)} [${getStatusLabel(entry.Status)}]`);
        }
      }
      lines.push('');
    }
  }

  // Pending/scheduled entries (not yet matched)
  const pendingEntries = plannedEntries.filter(e =>
    e.Status === 'pending' || e.Status === 'scheduled'
  );

  if (pendingEntries.length > 0) {
    lines.push('## Entradas Pendentes');
    lines.push('');
    for (const entry of pendingEntries) {
      const category = categoryMap.get(entry.CategoryID);
      const categoryName = category?.name || 'Sem categoria';
      const amount = parseFloat(entry.Amount);
      const dayInfo = entry.ExpectedDayStart && entry.ExpectedDayEnd
        ? `dias ${entry.ExpectedDayStart}-${entry.ExpectedDayEnd}`
        : entry.ExpectedDay
        ? `dia ${entry.ExpectedDay}`
        : '';

      lines.push(`- **${entry.Description}** (${categoryName}): ${formatCurrency(amount)}${dayInfo ? ` - Esperado: ${dayInfo}` : ''} [${getStatusLabel(entry.Status)}]`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
