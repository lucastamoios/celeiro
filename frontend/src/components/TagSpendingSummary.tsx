import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Tags } from 'lucide-react';
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

  const plannedTags = spending.filter((tag) => (parseFloat(tag.planned) || 0) > 0);
  const totalPlanned = plannedTags.reduce((sum, t) => sum + (parseFloat(t.planned) || 0), 0);

  // Hide the section entirely when there is nothing planned to set aside.
  if (!loading && !error && plannedTags.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Tags className="w-5 h-5 text-wheat-600" />
          <h2 className="font-display text-lg font-semibold text-stone-900">Planejado por Tag</h2>
        </div>
        {!loading && !error && (
          <div className="text-sm text-stone-500">
            Total planejado: <span className="font-semibold text-stone-900 tabular-nums">{formatCurrencyBRL(totalPlanned)}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-stone-500 mb-4">
        Valores que precisam ficar separados para configurar as contas do mês.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plannedTags.map((tag) => {
            const planned = parseFloat(tag.planned) || 0;
            const entries = tag.planned_entries || [];

            return (
              <div key={tag.tag_id} className="rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color || '#6B7280' }}
                    />
                    <span className="flex-shrink-0">{tag.icon}</span>
                    <span className="font-medium text-stone-900 truncate">{tag.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-stone-900 tabular-nums flex-shrink-0">
                    {formatCurrencyBRL(planned)}
                  </span>
                </div>

                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.planned_entry_id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {entry.paid ? (
                          <CheckCircle2 className="w-4 h-4 text-sage-600 flex-shrink-0" aria-label="Pago" />
                        ) : (
                          <Circle className="w-4 h-4 text-stone-300 flex-shrink-0" aria-label="Nao pago" />
                        )}
                        <span className="text-stone-700 truncate">{entry.description}</span>
                      </div>
                      <span className="tabular-nums text-stone-700 flex-shrink-0">
                        {formatCurrencyBRL(entry.amount)}
                      </span>
                    </div>
                  ))}
                  {entries.length === 0 && (
                    <span className="text-sm text-stone-400">
                      Nenhum item planejado encontrado.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
