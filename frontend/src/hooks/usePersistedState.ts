import { useState, useEffect, useCallback } from 'react';

/**
 * A hook that persists state to localStorage.
 * Values are loaded from localStorage on mount and saved on change.
 *
 * @param key - The localStorage key to use
 * @param defaultValue - The default value if nothing is stored
 * @returns [value, setValue] - Same API as useState
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialize state from localStorage or use default
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch (error) {
      console.warn(`Failed to parse localStorage key "${key}":`, error);
    }
    return defaultValue;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Failed to save to localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * A hook that persists an object of filters to localStorage.
 * Useful when you have multiple related filter values.
 *
 * @param key - The localStorage key to use
 * @param defaultFilters - The default filter values
 * @returns { filters, setFilter, setFilters, resetFilters }
 */
export function usePersistedFilters<T extends Record<string, unknown>>(
  key: string,
  defaultFilters: T
) {
  const [filters, setFilters] = usePersistedState<T>(key, defaultFilters);

  // Update a single filter
  const setFilter = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  }, [setFilters]);

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [defaultFilters, setFilters]);

  return { filters, setFilter, setFilters, resetFilters };
}
