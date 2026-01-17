# Planned Entry Organization (Drag & Drop)

## Purpose

Allow users to quickly reorganize planned entries by moving them between categories directly from the Budgets screen.

## Behavior

- Planned entries are draggable from within a category card’s expanded planned-entry list.
- Category budget cards act as drop targets.
- On drop, the planned entry’s `category_id` is updated and the budget view refreshes.

## Validation Rules

- Expense planned entries can only be moved to expense categories.
- Income planned entries can only be moved to income categories.
- Dismissed planned entries are not draggable.

## Implementation Notes

- Uses `@dnd-kit/core` on the frontend.
- Update call: planned entry update with `category_id`.

## Related Documentation

- `docs/screens/budgets.md`
- `docs/specs/budget-planned-entries/spec.md`
