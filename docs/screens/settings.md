# Settings Screen

**File:** `frontend/src/components/SettingsPage.tsx`

## Purpose

Central configuration hub with five tabs for managing account, categories, patterns, tags, and organization.

## Tab Structure

| Tab ID | Label | Component |
|--------|-------|-----------|
| `conta` | Sua Conta | `AccountSettings.tsx` |
| `categorias` | Categorias | `CategoryManager.tsx` |
| `padroes` | Padrões | `PatternManager.tsx` |
| `tags` | Tags | `TagManager.tsx` |
| `organizacao` | Organização | `OrganizationSettings.tsx` |

## Tab Navigation

- Tabs displayed as horizontal buttons with icons
- Active tab has wheat-colored underline
- `initialTab` prop allows deep linking from avatar menu

---

## Account Settings Tab

**File:** `frontend/src/components/AccountSettings.tsx`

### What the User Sees

- User email display
- Password management section
- Email import address (copy to clipboard)
- Logout button

### Password Management

Two states:

**No password set:**
- "Definir Senha" form
- New password (min 8 chars)
- Confirm password
- "Salvar Senha" button

**Password exists:**
- "Alterar Senha" form
- Current password
- New password
- Confirm password
- "Alterar Senha" button
- Toggle to show/hide passwords

### Email Import

- Shows organization's import email address
- "Copiar" button copies to clipboard
- Used for forwarding OFX attachments

### Logout

- "Sair" button with confirmation
- Calls `logout()` from `AuthContext`

---

## Categories Tab

**File:** `frontend/src/components/CategoryManager.tsx`

### What the User Sees

- "+ Nova Categoria" button
- Grid of category cards with icon, name, color
- Edit/Delete actions per category

### Create/Edit Category Modal

Fields:
- **Nome** (required)
- **Ícone**: 40+ emoji grid picker
- **Cor**: 30+ color swatches

### Business Rules

- Categories used for transaction classification
- Deleting a category removes it from linked transactions
- Each category has type: `expense` or `income`

---

## Patterns Tab

**File:** `frontend/src/components/PatternManager.tsx`

### What the User Sees

- "+ Novo Padrão" button
- List of patterns with:
  - Description pattern (regex)
  - Target category
  - Active/Inactive toggle
  - Edit/Delete actions

### Pattern Features

- Match by description (regex)
- Match by date/weekday
- Match by amount range
- Set target description and category
- Link to planned entry
- Apply retroactively to past transactions

### Related Component

Uses `PatternCreator.tsx` for pattern form.

---

## Tags Tab

**File:** `frontend/src/components/TagManager.tsx`

### What the User Sees

- "+ Nova Tag" button
- Grid of tag cards with icon, name, color
- Edit/Delete actions per tag

### Tag Features

- Icon selection (20+ options)
- Color customization
- Applied to individual transactions via TransactionEditModal

---

## Organization Tab

**File:** `frontend/src/components/OrganizationSettings.tsx`

### What the User Sees

- Organization name (editable by admin)
- Members list with roles
- Pending invitations list
- "+ Convidar Membro" button

### Member Roles

| Role | Capabilities |
|------|--------------|
| `admin` | Full access, manage members, edit org |
| `manager` | Manage transactions and budgets |
| `user` | View and basic operations |

### Invite Flow

1. Click "+ Convidar Membro"
2. Enter email and select role
3. Invitation sent via email
4. Shows in "Convites Pendentes" until accepted/cancelled

### Related Component

Uses `InviteMemberModal.tsx` for invitation form.

---

## Click Behaviors Summary

| Tab | Element | Action |
|-----|---------|--------|
| Conta | "Sair" | Logout with confirmation |
| Conta | "Copiar" | Copy email to clipboard |
| Categorias | Category card | Opens edit modal |
| Categorias | Delete icon | Deletes category |
| Padrões | Pattern row | Opens edit modal |
| Padrões | Toggle switch | Enables/disables pattern |
| Tags | Tag card | Opens edit modal |
| Organização | Member row | View only |
| Organização | "Cancelar" on invite | Cancels pending invite |

## Data Sources

| Tab | API Endpoints |
|-----|---------------|
| Conta | User data from context, password change API |
| Categorias | `GET/POST/PATCH/DELETE /financial/categories` |
| Padrões | Patterns API (`/financial/patterns`) |
| Tags | `GET/POST/PATCH/DELETE /financial/tags` |
| Organização | Organization and invitations API |
