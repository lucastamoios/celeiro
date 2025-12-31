# Design: Consolidate Settings Navigation

## Architecture Overview

This change affects only the frontend layer. No backend changes are required.

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌──────────────┐                                                │
│  │   Sidebar    │                                                │
│  │  - Dashboard │  ┌──────────────────────────────────────────┐  │
│  │  - Trans.    │  │            Main Content Area              │  │
│  │  - Orçam.    │  │                                          │  │
│  │  - Metas     │  │  Based on currentView:                   │  │
│  │  - Config⚙️  │  │  - 'settings' → SettingsPage             │  │
│  └──────────────┘  │  - 'dashboard' → Dashboard               │  │
│                    │  - ... (existing views)                   │  │
│                    └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Structure

### New Components

```
src/
  components/
    SettingsPage.tsx          # Main settings container with tabs
    AccountSettings.tsx       # User email + logout button
```

### Moved Components (No Changes Needed)

These components will be rendered inside `SettingsPage` tabs:
- `CategoryManager.tsx` → Settings > Categorias tab
- `PatternManager.tsx` → Settings > Padrões tab
- `TagManager.tsx` → Settings > Tags tab

### Modified Components

- `App.tsx` - Add 'settings' view, update sidebar navigation
- `CategoryManager.tsx` - Remove budget editing UI (optional fields for PlannedAmount)

## Navigation State

### Current View Type

```typescript
// Current
type View = 'dashboard' | 'transactions' | 'budgets' | 'patterns' | 'categories' | 'tags' | 'uncategorized' | 'goals';

// Proposed
type View = 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'settings' | 'uncategorized';
```

Note: 'patterns', 'categories', 'tags' are removed as top-level views since they become tabs within 'settings'.

### Settings Tab State

```typescript
type SettingsTab = 'categorias' | 'padroes' | 'tags' | 'conta';

// Inside SettingsPage
const [activeTab, setActiveTab] = useState<SettingsTab>('categorias');
```

## UI Design

### Sidebar (5 items)

```
┌─────────────────┐
│  📊 Dashboard   │
│  💰 Transações  │
│  📋 Orçamentos  │
│  🎯 Metas       │
│  ⚙️ Configurações│
└─────────────────┘
```

### Settings Page Layout

```
┌────────────────────────────────────────────────┐
│  Configurações                                  │
├────────────────────────────────────────────────┤
│  [Categorias] [Padrões] [Tags] [Conta]         │  ← Tab bar
├────────────────────────────────────────────────┤
│                                                 │
│  Tab content area:                              │
│  - Categorias: CategoryManager                  │
│  - Padrões: PatternManager                      │
│  - Tags: TagManager                             │
│  - Conta: AccountSettings                       │
│                                                 │
└────────────────────────────────────────────────┘
```

### Account Tab (Conta)

```
┌────────────────────────────────────────────────┐
│  Sua Conta                                      │
├────────────────────────────────────────────────┤
│                                                 │
│  📧 Email: usuario@exemplo.com                  │
│                                                 │
│  ┌──────────────────┐                          │
│  │   🚪 Sair        │  ← Logout button          │
│  └──────────────────┘                          │
│                                                 │
│  ─────────────────────────────────             │
│  Versão: 1.0.0                                 │
│                                                 │
└────────────────────────────────────────────────┘
```

## CategoryManager Changes

### Fields to Keep

- Name (text input)
- Icon (emoji picker)
- Color (color picker)
- Category Type (expense/income dropdown)

### Fields to Remove

- Planned Amount / Budget fields
- Any budget-related editing

Budget editing will only be available in the Orçamentos page, ensuring a single source of truth.

## Trade-offs

### Pros

1. **Simpler navigation**: 5 items vs 7 items
2. **Clear information architecture**: operational vs configuration
3. **Familiar pattern**: most finance apps work this way
4. **Single source of truth**: budgets only in Orçamentos

### Cons

1. **Extra click for configuration**: Users need 2 clicks to reach Categorias (vs 1 currently)
2. **Migration effort**: Some users may need to re-learn where things are
3. **Settings page complexity**: Need to manage tab state

### Mitigation

- The extra click is acceptable because configuration is infrequent
- Clear visual hierarchy and familiar patterns reduce learning curve
- Tab state is simple React state management

## Dependencies

None. This is a purely frontend change that doesn't require:
- Backend API changes
- Database migrations
- New authentication flows (logout uses existing endpoint)

## Accessibility Considerations

- Tab navigation should be keyboard accessible
- Gear icon should have appropriate aria-label
- Active tab should be visually distinct (not just color-based)
