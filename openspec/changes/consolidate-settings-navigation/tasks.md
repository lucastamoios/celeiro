# Tasks: Consolidate Settings Navigation

## Phase 1: Create Settings Infrastructure

- [ ] **1.1** Create `SettingsPage.tsx` component with tab structure
  - Tab bar with 4 tabs: Categorias, Padrões, Tags, Conta
  - Tab state management
  - Tab content area
  - Responsive layout

- [ ] **1.2** Create `AccountSettings.tsx` component
  - Display current user email (from auth context)
  - Logout button with confirmation
  - Version info footer

- [ ] **1.3** Update View type in App.tsx
  - Add 'settings' to View type union
  - Remove 'patterns', 'categories', 'tags' from View type (optional, can keep for URL routing)

## Phase 2: Update Navigation

- [ ] **2.1** Update Sidebar navigation items
  - Remove Padrões, Categorias, Tags nav items
  - Add Configurações nav item with ⚙️ icon
  - Verify correct highlighting when settings is active

- [ ] **2.2** Wire up Settings page routing
  - Add 'settings' case to main content switch
  - Render SettingsPage component

## Phase 3: Integrate Existing Components

- [ ] **3.1** Integrate CategoryManager into Settings > Categorias tab
  - Move CategoryManager rendering to SettingsPage
  - Ensure all props are passed correctly

- [ ] **3.2** Integrate PatternManager into Settings > Padrões tab
  - Move PatternManager rendering to SettingsPage
  - Ensure all props are passed correctly

- [ ] **3.3** Integrate TagManager into Settings > Tags tab
  - Move TagManager rendering to SettingsPage
  - Ensure all props are passed correctly

- [ ] **3.4** Integrate AccountSettings into Settings > Conta tab
  - Wire up logout functionality
  - Test logout flow

## Phase 4: CategoryManager Budget Cleanup

- [ ] **4.1** Remove budget editing from CategoryManager
  - Remove PlannedAmount input field
  - Remove budget-related state and handlers
  - Keep only: name, icon, color, category type

- [ ] **4.2** Verify Orçamentos page has full budget editing
  - Ensure budget-per-category creation works
  - Test budget item CRUD operations

## Phase 5: Testing & Polish

- [ ] **5.1** Test all navigation paths
  - Dashboard → Settings → each tab
  - Direct URL access to settings
  - Browser back/forward buttons

- [ ] **5.2** Test all functionality in new location
  - Create/edit/delete categories
  - Create/edit/delete patterns
  - Create/edit/delete tags
  - Logout flow

- [ ] **5.3** Visual polish
  - Consistent spacing and styling
  - Active tab indication
  - Hover states
  - Mobile responsiveness

## Dependencies

- Phase 1 must complete before Phase 3
- Phase 2 can run in parallel with Phase 1
- Phase 4 can run in parallel with Phase 3
- Phase 5 requires all previous phases

## Estimated Effort

- Phase 1: ~2 hours
- Phase 2: ~30 minutes
- Phase 3: ~1 hour
- Phase 4: ~30 minutes
- Phase 5: ~1 hour

**Total: ~5 hours**
