# Learnings - Planned Entry Pattern UX

## Conventions & Patterns

## Task 0: UX Copy + Terminology Alignment

**Date:** 2026-01-26

**Changes:**
- Updated `PatternCreator.tsx` labels:
  - Source field: "Texto do banco (para encontrar)" (was "Descrição contém *")
  - Target field: "Como deve aparecer (renomear para)" (was "Nova descrição *")
- Verified field order: Source (Section 1) appears before Target (Section 2).

**Findings:**
- The component structure already supported the correct field order (Source -> Target).
- Variable names used:
  - Source: `simpleDescriptionText` (simple mode) / `descriptionPattern` (regex mode)
  - Target: `targetDescription`
- No logic changes were required, only JSX label updates.
- `tsc -b` passed successfully.
