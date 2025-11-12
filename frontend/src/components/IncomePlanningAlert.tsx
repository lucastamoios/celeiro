import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { IncomePlanningReport } from '../types/budget';
import { getIncomePlanning } from '../api/budget';

interface IncomePlanningAlertProps {
  month: number;
  year: number;
}

export default function IncomePlanningAlert({ month, year }: IncomePlanningAlertProps) {
  const { token } = useAuth();
  const [report, setReport] = useState<IncomePlanningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchReport();
  }, [token, month, year]);

  const fetchReport = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getIncomePlanning(month, year, { token, organizationId: '1' });
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch income planning report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | undefined) => {
    const numValue = parseFloat(amount || '0');
    if (isNaN(numValue)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const getMonthName = (monthNum: number) => {
    const date = new Date(2024, monthNum - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">⚠️ {error}</p>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  // Safety check for required fields - early return if data is incomplete
  if (!report || typeof report !== 'object') {
    return null;
  }

  // Helper to safely convert to number
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Don't show alert if status is OK
  if (report.status === 'OK') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            ✅
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-green-900 mb-1">
              Orçamento bem alocado
            </h4>
            <p className="text-sm text-green-700">
              {report.message || 'Seu orçamento está bem distribuído'}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-4 text-xs text-green-600">
              <div>
                <span className="font-medium">Renda: </span>
                {formatCurrency(report.totalIncome || '0')}
              </div>
              <div>
                <span className="font-medium">Planejado: </span>
                {formatCurrency(report.totalPlanned || '0')}
              </div>
              <div>
                <span className="font-medium">Não alocado: </span>
                {formatCurrency(report.unallocated || '0')} ({safeNumber(report.unallocatedPercent).toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show warning alert
  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          ⚠️
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-yellow-900 mb-1">
            Atenção: Renda não totalmente alocada
          </h4>
          <p className="text-sm text-yellow-700 mb-2">
            {report.message || 'Há renda não alocada no seu orçamento'}
          </p>

          {/* Details Grid */}
          <div className="bg-white rounded-md p-3 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Renda Total ({getMonthName(month)} {year}):</span>
              <span className="font-semibold text-gray-900">{formatCurrency(report.totalIncome || '0')}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Planejado:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(report.totalPlanned || '0')}</span>
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Não Alocado:</span>
              <span className="font-semibold text-yellow-700">
                {formatCurrency(report.unallocated || '0')} ({safeNumber(report.unallocatedPercent).toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Action hint */}
          <p className="mt-3 text-xs text-yellow-600">
            💡 Dica: Aloque pelo menos 99.75% da sua renda em categorias para manter um orçamento de base zero efetivo.
          </p>
        </div>
      </div>
    </div>
  );
}
