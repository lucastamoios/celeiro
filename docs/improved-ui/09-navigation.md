# Navigation & Information Architecture

> Guiding users through confident financial management

## Current Problems

1. **Flat navigation** - All items equally prominent
2. **No context awareness** - Navigation doesn't reflect current state
3. **Missing quick actions** - Common tasks require navigation
4. **No status indicators** - No visual cues about app state

## Design Goals

1. **Clear location** - User always knows where they are
2. **Efficient navigation** - Common tasks easily accessible
3. **Status at a glance** - Key metrics visible from any page
4. **Warm, branded feel** - Reflects Celeiro's identity

---

## Desktop Navigation

### Top Navigation Bar

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│   🌾 Celeiro              [Dashboard] [Transações] [Orçamentos] [Metas]     [👤 ▼] │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Enhanced Navigation

```tsx
function NavigationBar({ currentPage, user, monthStatus }) {
  return (
    <nav className="
      sticky top-0 z-40
      bg-white border-b border-stone-200
      shadow-warm-sm
    ">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <span className="text-h3 font-bold text-stone-800">Celeiro</span>
          </a>

          {/* Main navigation */}
          <div className="flex items-center gap-1">
            <NavLink href="/dashboard" current={currentPage === 'dashboard'}>
              Dashboard
            </NavLink>
            <NavLink href="/transactions" current={currentPage === 'transactions'}>
              Transações
              {/* Uncategorized badge */}
              {monthStatus.uncategorizedCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-terra-500 text-white text-tiny rounded-full">
                  {monthStatus.uncategorizedCount}
                </span>
              )}
            </NavLink>
            <NavLink href="/budgets" current={currentPage === 'budgets'}>
              Orçamentos
              {/* Budget status indicator */}
              {monthStatus.budgetStatus === 'over' && (
                <span className="ml-2 w-2 h-2 bg-rust-500 rounded-full" />
              )}
            </NavLink>
            <NavLink href="/goals" current={currentPage === 'goals'}>
              Metas
            </NavLink>
          </div>

          {/* Right side: user menu */}
          <div className="flex items-center gap-4">
            {/* Quick status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${
                monthStatus.budgetStatus === 'ok' ? 'bg-sage-500' :
                monthStatus.budgetStatus === 'warning' ? 'bg-terra-500' : 'bg-rust-500'
              }`} />
              <span className="text-body-sm text-stone-600">
                {monthStatus.budgetStatus === 'ok' ? 'No orçamento' :
                 monthStatus.budgetStatus === 'warning' ? 'Atenção' : 'Acima do orçamento'}
              </span>
            </div>

            {/* User dropdown */}
            <UserMenu user={user} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, current, children }) {
  return (
    <a
      href={href}
      className={`
        flex items-center px-4 py-2 rounded-lg text-body font-medium
        transition-colors
        ${current
          ? 'bg-wheat-50 text-wheat-700'
          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
        }
      `}
    >
      {children}
    </a>
  );
}
```

### User Menu Dropdown

```tsx
function UserMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2
          hover:bg-stone-50 rounded-lg
          transition-colors
        "
      >
        <div className="w-8 h-8 bg-wheat-100 rounded-full flex items-center justify-center">
          <span className="text-body font-medium text-wheat-700">
            {user.name?.charAt(0) || '?'}
          </span>
        </div>
        <ChevronDownIcon className="h-4 w-4 text-stone-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="
            absolute right-0 mt-2 w-56 py-2
            bg-white rounded-xl border border-stone-200 shadow-warm-lg
            z-50
          ">
            {/* User info */}
            <div className="px-4 py-3 border-b border-stone-100">
              <p className="text-body font-medium text-stone-900">{user.name}</p>
              <p className="text-body-sm text-stone-500">{user.email}</p>
            </div>

            {/* Menu items */}
            <div className="py-2">
              <MenuLink href="/categories" icon="🏷️">
                Categorias
              </MenuLink>
              <MenuLink href="/rules" icon="⚡">
                Regras de classificação
              </MenuLink>
              <MenuLink href="/accounts" icon="🏦">
                Contas bancárias
              </MenuLink>
            </div>

            <div className="border-t border-stone-100 pt-2">
              <MenuLink href="/settings" icon="⚙️">
                Configurações
              </MenuLink>
              <button
                onClick={() => logout()}
                className="
                  w-full flex items-center gap-3 px-4 py-2
                  text-body text-rust-600 hover:bg-rust-50
                  transition-colors
                "
              >
                <span>🚪</span>
                Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Page Layout Template

```tsx
function PageLayout({ children, title, actions, breadcrumb }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <NavigationBar />

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Breadcrumb (optional) */}
        {breadcrumb && (
          <nav className="mb-4 flex items-center gap-2 text-body-sm text-stone-500">
            {breadcrumb.map((item, index) => (
              <React.Fragment key={item.href}>
                {index > 0 && <ChevronRightIcon className="h-4 w-4" />}
                <a
                  href={item.href}
                  className={index === breadcrumb.length - 1
                    ? 'text-stone-700'
                    : 'hover:text-stone-700'
                  }
                >
                  {item.label}
                </a>
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-h1 text-stone-900">{title}</h1>
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>

        {/* Page content */}
        {children}
      </main>
    </div>
  );
}
```

---

## Information Architecture

### Site Map

```
🌾 Celeiro
│
├── 📊 Dashboard (/)
│   └── Monthly overview
│
├── 💳 Transações (/transactions)
│   ├── List view (default)
│   ├── Import OFX modal
│   ├── Create transaction modal
│   └── Edit transaction modal
│
├── 📈 Orçamentos (/budgets)
│   ├── Month view (default)
│   ├── Category budget modal
│   └── Planned entries section
│
├── 🎯 Metas (/goals)
│   ├── Grid view (default)
│   ├── Create goal modal
│   └── Contribution modal
│
├── 🏷️ Categorias (/categories)
│   ├── User categories
│   ├── System categories
│   └── Create/edit category modal
│
├── ⚡ Regras (/rules)
│   └── Classification rules
│
├── 🏦 Contas (/accounts)
│   ├── Account list
│   └── Create/edit account modal
│
└── ⚙️ Configurações (/settings)
    ├── Profile
    ├── Preferences
    └── Data export
```

### Navigation Priorities

| Priority | Items | Rationale |
|----------|-------|-----------|
| Primary | Dashboard, Transactions, Budgets, Goals | Core daily/weekly tasks |
| Secondary | Categories, Rules, Accounts | Setup and configuration |
| Tertiary | Settings, Logout | Infrequent actions |

---

## Quick Actions

### Global Add Button (Optional Enhancement)

A floating action button for quick access to common actions:

```tsx
function QuickActionsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-30">
      {/* Action menu */}
      {isOpen && (
        <div className="
          absolute bottom-16 right-0 w-48
          bg-white rounded-xl border border-stone-200 shadow-warm-lg
          py-2 mb-2
        ">
          <QuickAction icon="💳" label="Nova transação" href="/transactions/new" />
          <QuickAction icon="📥" label="Importar OFX" onClick={openImportModal} />
          <QuickAction icon="🎯" label="Nova meta" href="/goals/new" />
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full
          bg-wheat-500 hover:bg-wheat-600
          text-white shadow-warm-lg
          flex items-center justify-center
          transition-all duration-200
          ${isOpen ? 'rotate-45' : ''}
        `}
      >
        <PlusIcon className="h-6 w-6" />
      </button>
    </div>
  );
}
```

---

## Keyboard Navigation

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `g then d` | Go to Dashboard |
| `g then t` | Go to Transactions |
| `g then b` | Go to Budgets |
| `g then m` | Go to Goals (Metas) |
| `n` | New (context-aware: transaction/goal) |
| `?` | Show keyboard shortcuts |
| `/` | Focus search |
| `Esc` | Close modal/cancel |

```tsx
function useKeyboardNavigation() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Two-key combinations (g then ...)
      if (pendingKey === 'g') {
        switch (e.key) {
          case 'd': navigate('/dashboard'); break;
          case 't': navigate('/transactions'); break;
          case 'b': navigate('/budgets'); break;
          case 'm': navigate('/goals'); break;
        }
        setPendingKey(null);
        return;
      }

      // Single key commands
      switch (e.key) {
        case 'g':
          setPendingKey('g');
          setTimeout(() => setPendingKey(null), 1000);
          break;
        case '?':
          openKeyboardHelp();
          break;
        case '/':
          e.preventDefault();
          focusSearch();
          break;
        case 'Escape':
          closeModal();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingKey]);
}
```

---

## Mobile Considerations (Future)

While desktop-first, keep mobile in mind:

### Bottom Navigation (Mobile)

```tsx
function MobileBottomNav({ currentPage }) {
  return (
    <nav className="
      fixed bottom-0 left-0 right-0 z-40
      bg-white border-t border-stone-200
      safe-area-pb
      md:hidden
    ">
      <div className="flex justify-around py-2">
        <MobileNavItem
          icon="📊"
          label="Dashboard"
          href="/dashboard"
          active={currentPage === 'dashboard'}
        />
        <MobileNavItem
          icon="💳"
          label="Transações"
          href="/transactions"
          active={currentPage === 'transactions'}
        />
        <MobileNavItem
          icon="📈"
          label="Orçamentos"
          href="/budgets"
          active={currentPage === 'budgets'}
        />
        <MobileNavItem
          icon="🎯"
          label="Metas"
          href="/goals"
          active={currentPage === 'goals'}
        />
        <MobileNavItem
          icon="☰"
          label="Mais"
          onClick={openMobileMenu}
          active={false}
        />
      </div>
    </nav>
  );
}
```

---

## Loading States

### Page Loading Skeleton

```tsx
function PageLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-stone-200 rounded mb-8" />

      {/* Content skeleton */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-stone-200 rounded-xl" />
        ))}
      </div>

      <div className="h-64 bg-stone-200 rounded-xl" />
    </div>
  );
}
```

### Navigation Loading Indicator

```tsx
function NavigationProgress({ isLoading }) {
  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-wheat-100">
      <div className="
        h-full bg-wheat-500
        animate-progress
      " />
    </div>
  );
}
```

---

## Error States

### Page Error

```tsx
function PageError({ error, onRetry }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-16 h-16 rounded-full bg-rust-100 flex items-center justify-center mb-6">
        <ExclamationIcon className="h-8 w-8 text-rust-500" />
      </div>
      <h2 className="text-h3 text-stone-800 mb-2">
        Algo deu errado
      </h2>
      <p className="text-body text-stone-500 max-w-sm mx-auto mb-6">
        {error.message || 'Não foi possível carregar esta página.'}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2.5 bg-wheat-500 text-white rounded-lg hover:bg-wheat-600"
      >
        Tentar novamente
      </button>
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Create `NavigationBar` component
- [ ] Create `UserMenu` dropdown
- [ ] Create `PageLayout` template
- [ ] Add status indicators to nav items
- [ ] Implement keyboard shortcuts
- [ ] Create `QuickActionsButton` (optional)
- [ ] Add loading progress indicator
- [ ] Create error states
- [ ] Add breadcrumb component
- [ ] Mobile navigation (future)
