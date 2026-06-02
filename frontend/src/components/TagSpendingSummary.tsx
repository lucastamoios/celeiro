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

  const total = spending.reduce((sum, t) => sum + (parseFloat(t.total) || 0), 0);
  const maxTotal = spending.reduce((max, t) => Math.max(max, parseFloat(t.total) || 0), 0);

  return (
    <div className="mt-6 card">
      <div className="flex items-center gap-2 mb-1">
        <Tags className="w-5 h-5 text-wheat-600" />
        <h2 className="font-display text-lg font-semibold text-stone-900">Gastos por Tag</h2>
      </div>
      <p className="text-sm text-stone-500 mb-4">
        Soma das despesas marcadas com cada tag neste mês.
      </p>

      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-stone-100 rounded-lg" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-rust-600">{error}</p>
      )}

      {!loading && !error && (
        <>
          <div className="space-y-3">
            {spending.map((tag) => {
              const value = parseFloat(tag.total) || 0;
              const widthPct = maxTotal > 0 ? Math.max(2, (value / maxTotal) * 100) : 0;
              return (
                <div key={tag.tag_id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                      />
                      <span className="flex-shrink-0">{tag.icon}</span>
                      <span className="font-medium text-stone-800 truncate">{tag.name}</span>
                      <span className="text-xs text-stone-400 flex-shrink-0">
                        ({tag.transaction_count} {tag.transaction_count === 1 ? 'transação' : 'transações'})
                      </span>
                    </div>
                    <span className="font-semibold text-stone-900 tabular-nums flex-shrink-0">
                      {formatCurrencyBRL(tag.total)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${widthPct}%`, backgroundColor: tag.color || '#C6943A' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-200">
            <span className="text-sm font-medium text-stone-600">Total marcado</span>
            <span className="font-bold text-stone-900 tabular-nums">{formatCurrencyBRL(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}
