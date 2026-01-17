## 1. Database Schema

- [ ] 1.1 Create migration for `categories` table (organization-scoped)
- [ ] 1.2 Add indexes and uniqueness constraints (org_id + name)

## 2. Backend - Domain Layer

- [ ] 2.1 Add Category model/DTO
- [ ] 2.2 Add validation rules (required fields, uniqueness errors)

## 3. Backend - Repository Layer

- [ ] 3.1 Add `FetchCategories` repository method
- [ ] 3.2 Add `FetchCategoryByID` repository method
- [ ] 3.3 Add `InsertCategory` repository method
- [ ] 3.4 Add `ModifyCategory` repository method
- [ ] 3.5 Add `RemoveCategory` repository method (soft delete)

## 4. Backend - Service + HTTP

- [ ] 4.1 Add service methods for category CRUD
- [ ] 4.2 Add REST endpoints under `/financial/categories`
- [ ] 4.3 Register routes in router

## 5. Frontend

- [ ] 5.1 Add API client functions + TypeScript types for categories
- [ ] 5.2 Add categories management UI (list + create/edit/delete)

## 6. Testing

- [ ] 6.1 Add repository tests for category CRUD
- [ ] 6.2 Add handler tests for category endpoints
