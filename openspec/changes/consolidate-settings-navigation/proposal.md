# Consolidate Settings Navigation

## Summary

Restructure the frontend navigation to improve UX by moving configuration-related pages (Padrões, Categorias, Tags) to a new "Configurações" (Settings) page, keeping only operational/daily-use pages in the main navigation.

## Problem Statement

The current navigation has 7 items in the sidebar:
- Dashboard
- Transações
- Orçamentos
- Padrões
- Categorias
- Tags
- Metas

This creates cognitive overload and mixes two different types of pages:
1. **Operational pages** (used daily): Dashboard, Transações, Orçamentos, Metas
2. **Configuration pages** (set up once, rarely changed): Padrões, Categorias, Tags

Additionally:
- There's no account management or logout functionality visible in the UI
- Budget editing is split between CategoryManager and Orçamentos page, creating confusion

## Proposed Solution

### 1. Create new Settings page (`/configuracoes`)
- New route and page component
- Contains tabs for: Categorias, Padrões, Tags, Conta
- Gear icon (⚙️) in main navigation

### 2. Move existing components to Settings
- Move CategoryManager to Settings > Categorias tab
- Move PatternManager to Settings > Padrões tab
- Move TagManager to Settings > Tags tab
- **Remove budget editing from CategoryManager** (keep only: name, icon, color, type)

### 3. Add Account/Profile section
- New "Conta" tab in Settings
- Show current user email
- Logout button
- Future extensibility: notification preferences, theme settings

### 4. Update main navigation
New sidebar structure (5 items, down from 7):
- Dashboard
- Transações
- Orçamentos
- Metas
- Configurações (new, with gear icon)

## Benefits

1. **Reduced cognitive load**: 7 → 5 items (28% reduction)
2. **Clear mental model**: "use daily" vs "configure once"
3. **Industry alignment**: Follows patterns from YNAB, Mobills, Organizze
4. **Single source of truth**: Budget management only in Orçamentos page
5. **Account visibility**: Users can see their email and logout easily

## Success Criteria

- [ ] Users can access all existing functionality (no features lost)
- [ ] Navigation has 5 or fewer items
- [ ] Configuration tasks are grouped logically in Settings
- [ ] Account/Logout is accessible in 2 clicks or less
- [ ] Budget editing is only possible in Orçamentos page

## Out of Scope

- User invitation/team management (organization members)
- Theme customization (dark mode)
- Notification preferences
- Advanced account settings (password change, 2FA)
