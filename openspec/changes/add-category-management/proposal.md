## Why

Users need to create and maintain their own spending categories to keep budgets and transaction classification aligned with how they actually track money.

## What Changes

- **NEW**: Category management capability (create, view, update, delete categories)
- **NEW**: Validation rules for category identity (name uniqueness within organization)
- **NEW**: API endpoints for category CRUD
- **NEW**: Frontend UI to manage categories

## Impact

- Affected specs: `category-management` (new capability)
- Affected code:
  - Backend: `categories` table, repository, service, handlers/routes
  - Frontend: category list + create/edit/delete flows
