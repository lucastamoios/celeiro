import { useState } from 'react';
import type { MatchSuggestion } from '../types/budget';
import {
  formatMatchScore,
  getMatchConfidenceColor,
  MATCH_THRESHOLDS,
} from '../types/budget';

interface MatchSuggestionsProps {
  suggestions: MatchSuggestion[];
  onApplyPattern: (patternId: number) => void;
  isLoading?: boolean;
}

export default function MatchSuggestions({
  suggestions,
  onApplyPattern,
  isLoading = false,
}: MatchSuggestionsProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(parseFloat(amount));
  };

  const toggleExpand = (patternId: number) => {
    setExpandedId(expandedId === patternId ? null : patternId);
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Nenhuma sugestão encontrada
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Não encontramos padrões salvos que correspondam a esta transação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Sugestões de Padrões
        </h3>
        <span className="text-sm text-gray-500">
          {suggestions.length} {suggestions.length === 1 ? 'padrão encontrado' : 'padrões encontrados'}
        </span>
      </div>

      {suggestions.map((suggestion) => {
        const { Pattern, MatchScore } = suggestion;
        const isExpanded = expandedId === Pattern.PlannedEntryID;

        return (
          <div
            key={Pattern.PlannedEntryID}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => toggleExpand(Pattern.PlannedEntryID)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Confidence Badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMatchConfidenceColor(
                        MatchScore.Confidence
                      )}`}
                    >
                      {MatchScore.Confidence === 'HIGH' && '🎯 '}
                      {MatchScore.Confidence === 'MEDIUM' && '⚠️ '}
                      {MatchScore.Confidence === 'LOW' && '💡 '}
                      {MatchScore.Confidence}
                    </span>

                    {/* Total Score */}
                    <span className="text-sm font-semibold text-gray-700">
                      {formatMatchScore(MatchScore.TotalScore)} match
                    </span>

                    {/* Recurrent indicator */}
                    {Pattern.IsRecurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        🔁 Recorrente
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-gray-900 truncate">
                    {Pattern.Description}
                  </p>

                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatCurrency(Pattern.Amount)}</span>
                    {Pattern.ExpectedDay && (
                      <span>• Dia {Pattern.ExpectedDay} do mês</span>
                    )}
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyPattern(Pattern.PlannedEntryID);
                  }}
                  disabled={isLoading}
                  className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-700 mb-3">
                  Detalhes da Correspondência
                </h4>

                {/* Score Breakdown */}
                <div className="space-y-2">
                  {/* Category Score */}
                  <ScoreBar
                    label="Categoria"
                    score={MatchScore.CategoryScore}
                    weight={0.4}
                    description={
                      MatchScore.CategoryScore === 1
                        ? 'Categoria idêntica'
                        : 'Categoria diferente'
                    }
                  />

                  {/* Amount Score */}
                  <ScoreBar
                    label="Valor"
                    score={MatchScore.AmountScore}
                    weight={0.3}
                    description={
                      MatchScore.AmountScore >= 0.95
                        ? 'Valores muito próximos'
                        : MatchScore.AmountScore >= 0.8
                        ? 'Valores próximos'
                        : 'Valores diferentes'
                    }
                  />

                  {/* Description Score */}
                  <ScoreBar
                    label="Descrição"
                    score={MatchScore.DescriptionScore}
                    weight={0.2}
                    description={
                      MatchScore.DescriptionScore >= 0.9
                        ? 'Descrições muito similares'
                        : MatchScore.DescriptionScore >= 0.7
                        ? 'Descrições similares'
                        : 'Descrições parcialmente similares'
                    }
                  />

                  {/* Date Score */}
                  <ScoreBar
                    label="Data"
                    score={MatchScore.DateScore}
                    weight={0.1}
                    description={
                      MatchScore.DateScore === 1
                        ? 'Mesmo dia do mês'
                        : MatchScore.DateScore >= 0.8
                        ? 'Dias próximos'
                        : 'Sem dia esperado'
                    }
                  />
                </div>

                {/* Threshold Legend */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">
                    Legenda de confiança:
                  </p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-600">
                      🎯 Alta ≥ {MATCH_THRESHOLDS.HIGH * 100}%
                    </span>
                    <span className="text-yellow-600">
                      ⚠️ Média ≥ {MATCH_THRESHOLDS.MEDIUM * 100}%
                    </span>
                    <span className="text-gray-600">
                      💡 Baixa ≥ {MATCH_THRESHOLDS.LOW * 100}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper component for score visualization
interface ScoreBarProps {
  label: string;
  score: number;
  weight: number;
  description: string;
}

function ScoreBar({ label, score, weight, description }: ScoreBarProps) {
  const percentage = score * 100;
  const getColor = () => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    if (score >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-gray-500">
            (peso {(weight * 100).toFixed(0)}%)
          </span>
        </div>
        <span className="font-semibold text-gray-900">
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
