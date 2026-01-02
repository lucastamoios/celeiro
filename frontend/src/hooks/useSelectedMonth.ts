import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';

// Get current date for defaults
const now = new Date();
const DEFAULT_MONTH = now.getMonth() + 1; // 1-12
const DEFAULT_YEAR = now.getFullYear();

// Shared localStorage key for selected month across all pages
const SELECTED_MONTH_KEY = 'celeiro:selected-month';

interface SelectedMonthState {
  month: number;
  year: number;
}

/**
 * A hook that provides shared month selection state across pages.
 * The selected month is persisted to localStorage and shared between
 * TransactionList, CategoryBudgetDashboard, and other pages that need
 * consistent month navigation.
 *
 * @returns { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear, goToCurrentMonth, goToPreviousMonth, goToNextMonth, isCurrentMonth }
 */
export function useSelectedMonth() {
  const [state, setState] = usePersistedState<SelectedMonthState>(
    SELECTED_MONTH_KEY,
    { month: DEFAULT_MONTH, year: DEFAULT_YEAR }
  );

  const setSelectedMonth = useCallback((month: number) => {
    setState(prev => ({ ...prev, month }));
  }, [setState]);

  const setSelectedYear = useCallback((year: number) => {
    setState(prev => ({ ...prev, year }));
  }, [setState]);

  const setMonthAndYear = useCallback((month: number, year: number) => {
    setState({ month, year });
  }, [setState]);

  const goToCurrentMonth = useCallback(() => {
    setState({ month: DEFAULT_MONTH, year: DEFAULT_YEAR });
  }, [setState]);

  const goToPreviousMonth = useCallback(() => {
    setState(prev => {
      if (prev.month === 1) {
        return { month: 12, year: prev.year - 1 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  }, [setState]);

  const goToNextMonth = useCallback(() => {
    setState(prev => {
      if (prev.month === 12) {
        return { month: 1, year: prev.year + 1 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  }, [setState]);

  const isCurrentMonth = state.month === DEFAULT_MONTH && state.year === DEFAULT_YEAR;

  return {
    selectedMonth: state.month,
    selectedYear: state.year,
    setSelectedMonth,
    setSelectedYear,
    setMonthAndYear,
    goToCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    isCurrentMonth,
    // Also expose the current date defaults for reference
    currentMonth: DEFAULT_MONTH,
    currentYear: DEFAULT_YEAR,
  };
}
