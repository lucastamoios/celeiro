import { useEffect, useState } from 'react';
import { Tags } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { getTagSpending } from '../api/tags';
import type { TagSpending } from '../types/tag';

interface TagSpendingSummaryProps {
  month: number;
  year: number;
  /** Bumped by the parent whenever underlying data is reloaded, to trigger a refetch. */
  refreshKey?: number;
}

function formatCurrencyBRL(amount: string | number) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(isNaN(num) ? 0 : num);
}

export default function TagSpendingSummary({ month, year, refreshKey }: TagSpendingSummaryProps) {
  const { token } = useAuth();
  const { activeOrganization } = useOrganization();
  const organizationId = activeOrganization?.organization_id?.toString() || '1';

  const [spending, setSpending] = useState<TagSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getTagSpending(month, year, { token, organizationId })
      .then((data) => {
        if (!cancelled) setSpending(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao buscar gastos por tag');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, organizationId, month, year, refreshKey]);

  // Hide the section entirely when there is nothing to show (no tags used this month).
  if (!loading && !error && spending.length === 0) {
    return null;
  }

  const totalSpent = spending.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
  const totalPlanned = spending.reduce((sum, t) => sum + (parseFloat(t.planned) || 0), 0);
  const totalBalance = totalPlanned - totalSpent;

  return (
    <div className="mt-6 card">
      <div className="flex items-center gap-2 mb-1">
        <Tags className="w-5 h-5 text-wheat-600" />
        <h2 className="font-display text-lg font-semibold text-stone-900">Planejado e Gasto por Tag</h2>
      </div>
      <p className="text-sm text-stone-500 mb-4">
        Orçamento planejado contra o gasto real de cada tag neste mês.
      </p>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-stone-100 rounded-xl" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-rust-600">{error}</p>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {spending.map((tag) => {
              const spent = parseFloat(tag.total) || 0;
              const planned = parseFloat(tag.planned) || 0;
              const balance = planned - spent;
              const over = spent > planned;
              const pctUsed = planned > 0 ? (spent / planned) * 100 : spent > 0 ? 100 : 0;

              return (
                <div key={tag.tag_id} className="rounded-xl border border-stone-200 p-4">
                  <div className="flex items-center gap-2 mb-3 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color || '#6B7280' }}
                    />
                    <span className="flex-shrink-0">{tag.icon}</span>
                    <span className="font-medium text-stone-900 truncate">{tag.name}</span>
                    {tag.transaction_count > 0 && (
                      <span className="text-xs text-stone-400 flex-shrink-0">
                        ({tag.transaction_count} {tag.transaction_count === 1 ? 'transação' : 'transações'})
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Planejado</span>
                      <span className="tabular-nums text-stone-800">{formatCurrencyBRL(planned)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Gasto</span>
                      <span className="tabular-nums text-stone-800">{formatCurrencyBRL(spent)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-stone-100">
                      <span className="font-medium text-stone-600">Saldo</span>
                      <span className={`font-semibold tabular-nums ${over ? 'text-rust-600' : 'text-sage-700'}`}>
                        {formatCurrencyBRL(balance)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-rust-500' : 'bg-wheat-500'}`}
                      style={{ width: `${Math.min(100, pctUsed)}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${over ? 'text-rust-600' : 'text-stone-400'}`}>
                    {planned > 0
                      ? over
                        ? `${pctUsed.toFixed(0)}% — acima do planejado`
                        : `${pctUsed.toFixed(0)}% usado`
                      : 'Sem planejamento'}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-medium text-stone-700">Total do mês</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Planejado</span>
                <span className="tabular-nums text-stone-800">{formatCurrencyBRL(totalPlanned)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Gasto</span>
                <span className="tabular-nums text-stone-800">{formatCurrencyBRL(totalSpent)}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-stone-200">
                <span className="font-medium text-stone-600">Saldo</span>
                <span className={`font-bold tabular-nums ${totalBalance < 0 ? 'text-rust-600' : 'text-sage-700'}`}>
                  {formatCurrencyBRL(totalBalance)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
