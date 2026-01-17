## 1. Database Schema

- [x] 1.1 ~~Create migration for `categories` table~~ (already exists)
- [ ] 1.2 Verify indexes and uniqueness constraints (org_id + name)

## 2. Backend - Domain Layer

- [x] 2.1 ~~Add Category model/DTO~~ (already exists)
- [ ] 2.2 Add validation rules for user-created categories (required fields, uniqueness errors)

## 3. Backend - Repository Layer

- [x] 3.1 ~~Add `FetchCategories`~~ (already exists)
- [x] 3.2 ~~Add `FetchCategoryByID`~~ (already exists)
- [x] 3.3 ~~Add `InsertCategory`~~ (already exists)
- [x] 3.4 ~~Add `ModifyCategory`~~ (already exists)
- [x] 3.5 ~~Add `RemoveCategory`~~ (already exists)

## 4. Backend - Service + HTTP

- [x] 4.1 ~~Add service methods for category CRUD~~ (already exists: CreateCategory, UpdateCategory, DeleteCategory)
- [ ] 4.2 Add HTTP handlers under `/financial/categories` (GET, POST, PATCH, DELETE)
- [ ] 4.3 Register routes in router

## 5. Frontend

- [ ] 5.1 Add API client functions + TypeScript types for categories
- [ ] 5.2 Add categories management UI (list + create/edit/delete)

## 6. Testing

- [ ] 6.1 Add repository tests for category CRUD
- [ ] 6.2 Add handler tests for category endpoints
