# Frontend Custom Hooks

This document describes the custom React hooks used in the Celeiro frontend application.

**Location:** `frontend/src/hooks/`

## Overview

| Hook | Purpose | Scope |
|------|---------|-------|
| `useSelectedMonth` | Shared month selection across pages | Global (localStorage) |
| `usePersistedState` | Persist state to localStorage | Per-key |
| `usePersistedFilters` | Persist filter objects to localStorage | Per-key |
| `useDropdownClose` | Handle dropdown/menu closing | Component |
| `useModalDismiss` | Handle modal dismissal | Component |

---

## useSelectedMonth

**File:** `useSelectedMonth.ts`

Provides shared month/year selection state that syncs across multiple pages (e.g., Transações and Orçamentos). Changes on one page are immediately reflected when navigating to another.

### Usage

```tsx
import { useSelectedMonth } from '../hooks/useSelectedMonth';

function MyComponent() {
  const {
    selectedMonth,        // Current selected month (1-12)
    selectedYear,         // Current selected year
    goToPreviousMonth,    // Navigate to previous month
    goToNextMonth,        // Navigate to next month
    goToCurrentMonth,     // Reset to today's month
    isCurrentMonth,       // Boolean: is viewing current month?
    currentMonth,         // Today's month (for reference)
    currentYear,          // Today's year (for reference)
    setMonthAndYear,      // Set both at once: (month, year)
  } = useSelectedMonth();

  return (
    <div>
      <button onClick={goToPreviousMonth}>←</button>
      <span>{selectedMonth}/{selectedYear}</span>
      <button onClick={goToNextMonth}>→</button>
    </div>
  );
}
```

### Implementation Details

- **Storage Key:** `celeiro:selected-month`
- **Persistence:** localStorage (survives page refresh)
- **Default:** Current month/year when no stored value exists

### Pages Using This Hook

- `TransactionList.tsx` - Transaction list filtering by month
- `CategoryBudgetDashboard.tsx` - Budget view by month

---

## usePersistedState

**File:** `usePersistedState.ts`

A generic hook that persists any state value to localStorage. Same API as `useState`.

### Usage

```tsx
import { usePersistedState } from '../hooks/usePersistedState';

function MyComponent() {
  const [theme, setTheme] = usePersistedState('app:theme', 'light');

  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </button>
  );
}
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | localStorage key |
| `defaultValue` | `T` | Default value if nothing stored |

### Returns

`[T, React.Dispatch<React.SetStateAction<T>>]` - Same as `useState`

---

## usePersistedFilters

**File:** `usePersistedState.ts` (same file)

A specialized version of `usePersistedState` for filter objects. Provides helpers for updating individual filter keys.

### Usage

```tsx
import { usePersistedFilters } from '../hooks/usePersistedState';

const DEFAULT_FILTERS = {
  hideIgnored: false,
  onlyUncategorized: false,
};

function MyComponent() {
  const { filters, setFilter, resetFilters } = usePersistedFilters(
    'my-filters',
    DEFAULT_FILTERS
  );

  return (
    <>
      <input
        type="checkbox"
        checked={filters.hideIgnored}
        onChange={(e) => setFilter('hideIgnored', e.target.checked)}
      />
      <button onClick={resetFilters}>Reset</button>
    </>
  );
}
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `filters` | `T` | Current filter values |
| `setFilter` | `(key, value) => void` | Update single filter |
| `setFilters` | `(filters) => void` | Replace all filters |
| `resetFilters` | `() => void` | Reset to defaults |

---

## useDropdownClose

**File:** `useDropdownClose.ts`

Handles dropdown/menu closing behavior: closes when clicking outside or pressing Escape.

### Usage

```tsx
import { useDropdownClose } from '../hooks/useDropdownClose';

function MyDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useDropdownClose(isOpen, () => setIsOpen(false));

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>Menu</button>
      {isOpen && (
        <div ref={dropdownRef} className="absolute top-full left-0">
          <button>Option 1</button>
          <button>Option 2</button>
        </div>
      )}
    </div>
  );
}
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `isOpen` | `boolean` | Whether dropdown is currently open |
| `onClose` | `() => void` | Callback to close dropdown |

### Returns

`RefObject<T>` - Attach to the dropdown container element

### Behavior

- Closes on click outside the referenced element
- Closes on Escape key press
- Ignores the initial click that opened the dropdown

---

## useModalDismiss

**File:** `useModalDismiss.ts`

Handles modal dismissal with proper click detection. Prevents accidental closes when users start a click inside the modal but release outside (common with dropdowns inside modals).

### Usage

```tsx
import { useModalDismiss } from '../hooks/useModalDismiss';

function MyModal({ onClose }) {
  const { handleBackdropClick, handleBackdropMouseDown } = useModalDismiss(onClose);

  return (
    <div
      className="fixed inset-0 bg-black/50"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="bg-white p-4">
        Modal content...
      </div>
    </div>
  );
}
```

### Parameters

| Param | Type | Description |
|-------|------|-------------|
| `onClose` | `() => void` | Callback to close modal |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `handleBackdropClick` | `(e: MouseEvent) => void` | Attach to backdrop `onClick` |
| `handleBackdropMouseDown` | `(e: MouseEvent) => void` | Attach to backdrop `onMouseDown` |

### Behavior

- Closes on Escape key press
- Only closes on backdrop click if **both** mousedown and mouseup occurred on the backdrop
- Prevents accidental closes from drag interactions

---

## Best Practices

### When to Create a New Hook

1. **Reusable logic** - If 2+ components need the same stateful logic
2. **Complex side effects** - Event listeners, subscriptions, timers
3. **Cross-page state** - Use `usePersistedState` pattern for shared state

### Naming Conventions

- Prefix with `use` (React requirement)
- Use descriptive names: `useSelectedMonth`, not `useMonth`
- File name matches hook name: `useSelectedMonth.ts`

### Testing Hooks

```tsx
// Use @testing-library/react-hooks
import { renderHook, act } from '@testing-library/react-hooks';
import { useSelectedMonth } from './useSelectedMonth';

test('navigates to next month', () => {
  const { result } = renderHook(() => useSelectedMonth());

  act(() => {
    result.current.goToNextMonth();
  });

  expect(result.current.selectedMonth).toBe(/* expected */);
});
```
