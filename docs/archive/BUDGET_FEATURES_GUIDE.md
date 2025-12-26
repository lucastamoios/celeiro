# Budget Management Features Guide

## Overview

This guide explains how to use the advanced budget management features in the Celeiro system, specifically:

1. **Monthly Instance Modification** - Change a recurring entry for just one month
2. **Transaction-to-Pattern Mapping** - Link transactions to planned entries using patterns
3. **Budget Types** - Understanding fixed, calculated, and "maior" budgets

---

## ✅ Feature Status

All features you requested are **ALREADY IMPLEMENTED**:

- ✅ Create/modify/delete planned entries (recurring and one-time)
- ✅ Generate monthly instances from recurring entries
- ✅ Modify a single month's entry without affecting others
- ✅ Link transactions to planned entries via pattern matching
- ✅ Advanced regex-based pattern matching
- ✅ "Maior" budget type (uses larger of fixed or calculated)

---

## 1. Monthly Instance Modification

### How It Works

**Recurring entries** are templates stored once in the database. When you need them for a specific month, you **generate a monthly instance**.

```
Parent Entry (Recurrent)
  ├─ November Instance (non-recurrent, parent_entry_id → Parent)
  ├─ December Instance (non-recurrent, parent_entry_id → Parent)
  └─ January Instance  (non-recurrent, parent_entry_id → Parent)
```

### API Endpoints

#### Generate Monthly Instance
```http
POST /financial/planned-entries/{parentId}/generate
Authorization: Bearer <token>
X-Active-Organization: 1
Content-Type: application/json

{
  "month": 11,
  "year": 2025
}
```

**Response**: Creates a new non-recurrent entry linked to the parent
- `is_recurrent = false`
- `parent_entry_id = {parentId}`
- Can be modified independently

#### Modify a Monthly Instance
```http
PUT /financial/planned-entries/{instanceId}
Authorization: Bearer <token>
X-Active-Organization: 1
Content-Type: application/json

{
  "amount": 1500.00,        // Change amount just for this month
  "description": "Special",  // Change description
  "expected_day": 15        // Change day
}
```

**Key Point**: Modifying the instance does NOT affect:
- The parent entry
- Other months' instances
- Future generated instances

#### Delete a Monthly Instance
```http
DELETE /financial/planned-entries/{instanceId}
```

Deletes only that specific month. The recurring parent remains intact.

---

## 2. Transaction-to-Pattern Mapping

### How It Works

The system provides **two ways** to map transactions to planned entries:

#### Method 1: Simple Pattern Matching (Already Working)

When you have a planned entry with `is_saved_pattern = true`, the system automatically matches new transactions against it.

```sql
-- Example: Planned entry for "Google One"
INSERT INTO planned_entries (
  description, amount, category_id,
  is_saved_pattern, is_recurrent
) VALUES (
  'Google One', 7.99, 15,  -- TV/Internet category
  true, true               -- It's a pattern AND recurring
);
```

Now when you import a transaction with description containing "Google One", the system:
1. Matches it against saved patterns
2. Suggests the category automatically
3. You can apply it with one click

**API Endpoint**:
```http
GET /financial/match-suggestions?transaction_id=123
```

Returns:
```json
{
  "matches": [
    {
      "pattern": {
        "planned_entry_id": 456,
        "description": "Google One",
        "category_id": 15,
        "amount": "7.99"
      },
      "match_score": {
        "total_score": 0.95,
        "confidence": "HIGH",
        "description_similarity": 1.0,
        "amount_similarity": 0.98,
        "day_alignment": 0.85,
        "weekday_alignment": 0.90
      }
    }
  ]
}
```

#### Method 2: Advanced Regex Patterns (New Feature)

For more complex matching, use the Advanced Pattern Creator:

```http
POST /financial/advanced-patterns
Content-Type: application/json

{
  "description_pattern": "GOOGLE.*ONE|Google One",  // Regex
  "weekday_pattern": "(1|2|3)",                     // Mon-Wed
  "amount_range": { "min": 7.00, "max": 9.00 },
  "target_description": "Google One",
  "target_category_id": 15,
  "apply_retroactively": true  // Apply to existing transactions
}
```

This creates a reusable pattern that:
- Matches any description with "GOOGLE" and "ONE"
- Only on Monday, Tuesday, or Wednesday
- Only if amount is between R$ 7.00 and R$ 9.00
- Auto-categorizes and renames the transaction

---

## 3. Budget Types

### Three Budget Types

Your spreadsheet uses three budget calculation methods:

#### 1. **Fixed Budget**
```sql
budget_type = 'fixed'
planned_amount = 3000.00
```
- Uses the fixed amount you set
- Example: Economias (R$ 3.000,00)

#### 2. **Calculated Budget**
```sql
budget_type = 'calculated'
planned_amount = NULL  -- Ignored
```
- Sums all planned entries in the category
- Example: Compras - Supérfluos

#### 3. **Maior Budget** (Greater of the two)
```sql
budget_type = 'maior'
planned_amount = 8500.00
```
- Calculates: `MAX(fixed_amount, SUM(planned_entries))`
- Example: Moradia (R$ 8.500,00 fixed, but uses calculated if higher)

### How It's Calculated

```go
// Backend calculation (see: budget_progress.go)
switch budgetType {
case "fixed":
    return fixedAmount

case "calculated":
    return sumOfPlannedEntries

case "maior":
    if sumOfPlannedEntries > fixedAmount {
        return sumOfPlannedEntries
    }
    return fixedAmount
}
```

---

## 4. Your Current Data (Loaded)

### Categories with Budgets (November 2025)

| Category | Budget Type | Fixed Amount | Status |
|----------|-------------|--------------|--------|
| Moradia | maior | R$ 8.500,00 | ✅ Loaded |
| Mercado | maior | R$ 3.500,00 | ✅ Loaded |
| Educação | maior | R$ 300,00 | ✅ Loaded |
| Saúde | maior | R$ 3.000,00 | ✅ Loaded |
| Transporte | maior | R$ 2.000,00 | ✅ Loaded |
| TV/Internet/Telefone | maior | R$ 900,00 | ✅ Loaded |
| Empresa | maior | R$ 5.800,00 | ✅ Loaded |
| Economias | fixed | R$ 3.000,00 | ✅ Loaded |

### Planned Entries Summary

- **Total Entries**: 53
- **Recurring**: 45 (will repeat every month)
- **One-time**: 8 (specific to a date/month)

#### Example Recurring Entries
- **Salário**: R$ 45.840,25 (expected day: 5th)
- **Parcela da Caixa**: R$ 7.500,00 (expected day: 5th)
- **Contador**: R$ 350,00
- **Google One**: R$ 7,99
- **ChatGPT**: R$ 130,00
- ... (40 more)

#### Example One-Time Entries
- **Dinheiro Mãe**: R$ 12.200,00 (date: Nov 3)
- **Cartão Nubank**: R$ 8.886,13 (date: Nov 5)
- **Conserto Leds escada**: R$ 951,00 (date: Nov 4)
- ... (5 more)

---

## 5. Practical Usage Examples

### Example 1: Modify December's Electricity Bill

The electricity bill varies each month. Here's how to adjust it:

**Step 1**: Generate December instance
```http
POST /financial/planned-entries/37/generate
{ "month": 12, "year": 2025 }
```
(Assuming entry_id 37 is "Conta de Energia Elétrica")

**Step 2**: Update the December instance
```http
PUT /financial/planned-entries/89  // The new instance ID
{
  "amount": 520.00  // December was more expensive
}
```

**Result**:
- November: R$ 485,58 (from parent)
- December: R$ 520,00 (modified)
- January: R$ 485,58 (from parent)

### Example 2: Create Pattern for Amazon Purchases

You buy milk powder from Amazon every Thursday or Saturday:

```http
POST /financial/advanced-patterns
{
  "description_pattern": "AMZN.*LEITE|Amazon.*Milk",
  "weekday_pattern": "(4|6)",  // Thursday=4, Saturday=6
  "amount_range": { "min": 9.40, "max": 10.50 },
  "target_description": "Leite em pó Amazon",
  "target_category_id": 7,  // Mercado category
  "apply_retroactively": false
}
```

Now all future matching transactions automatically:
- Rename to "Leite em pó Amazon"
- Categorize as "Mercado"

### Example 3: Link Transaction to Planned Entry

When you import bank statements, transactions can be matched:

**Step 1**: Import OFX file
```http
POST /financial/accounts/1/transactions/import
(Upload OFX file)
```

**Step 2**: System auto-matches
- Transaction: "GOOGLE  *One 07/11"
- Matches planned entry: "Google One" (R$ 7,99)
- Confidence: HIGH (95% match)

**Step 3**: Apply pattern
```http
POST /financial/transactions/456/apply-pattern
{
  "pattern_id": 37  // "Google One" planned entry
}
```

**Result**:
- Transaction is categorized
- Amount is validated
- Linked to the planned entry

---

## 6. Frontend UI Features

### Budget Dashboard
- View all categories with "maior" logic applied
- See Estimado (Budget) vs Realizado (Actual) vs Disponível (Available)
- Timeline view showing past/current/future months

### Transaction Matching
- Import OFX files
- See match suggestions with confidence scores
- One-click pattern application
- Save new patterns from transactions

### Advanced Pattern Creator
- Two-pane UI (Pattern → Target)
- Visual weekday selector
- Live pattern preview
- Regex validation

### Planned Entries Management
- Create recurring templates
- Generate monthly instances
- Modify individual months
- Delete specific instances

---

## 7. Database Schema Reference

### Tables

```sql
-- Parent recurring entries
planned_entries (
  planned_entry_id,
  description,
  amount,
  is_recurrent,      -- true for templates
  parent_entry_id,   -- NULL for parents
  expected_day,      -- Day of month
  is_saved_pattern   -- true for pattern matching
)

-- Monthly budgets
category_budgets (
  category_budget_id,
  category_id,
  month,
  year,
  budget_type,       -- 'fixed', 'calculated', 'maior'
  planned_amount     -- Fixed amount (if applicable)
)

-- Advanced patterns
advanced_patterns (
  pattern_id,
  description_pattern,   -- Regex
  date_pattern,          -- Regex (YYYY-MM-DD)
  weekday_pattern,       -- Regex (0-6)
  amount_min,
  amount_max,
  target_description,
  target_category_id,
  apply_retroactively
)
```

---

## 8. API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/financial/planned-entries` | GET | List all planned entries |
| `/financial/planned-entries` | POST | Create new entry |
| `/financial/planned-entries/{id}` | PUT | Update entry |
| `/financial/planned-entries/{id}` | DELETE | Delete entry |
| `/financial/planned-entries/{id}/generate` | POST | Generate monthly instance |
| `/financial/match-suggestions?transaction_id=X` | GET | Get pattern matches |
| `/financial/transactions/{id}/apply-pattern` | POST | Apply pattern to transaction |
| `/financial/transactions/{id}/save-as-pattern` | POST | Save transaction as reusable pattern |
| `/financial/advanced-patterns` | POST | Create advanced regex pattern |
| `/financial/budgets/categories` | GET | List category budgets |

---

## 9. Next Steps

1. **Access the frontend**: http://localhost:13000
2. **Login** with your account (user_id = 1)
3. **View your budgets**: All 20 categories are loaded for November 2025
4. **Test pattern matching**: Import an OFX file and see auto-matching
5. **Try the Advanced Pattern Creator**: Create your first regex pattern
6. **Generate monthly instances**: For December planned entries

---

## 10. Questions Answered

### ✅ "Can I delete/change a planned entry just for one month?"
**YES!** Use `POST /planned-entries/{id}/generate` to create a monthly instance, then modify or delete just that instance.

### ✅ "Can I map transactions to planned entries using patterns?"
**YES!** Two ways:
1. Simple: Set `is_saved_pattern = true` on a planned entry
2. Advanced: Use regex patterns via `/advanced-patterns`

### ✅ "Are all my categories and budgets loaded?"
**YES!** 24 categories, 53 planned entries, 20 November budgets loaded.

---

## Support

For questions or issues:
- Check backend logs: `docker logs celeiro_backend`
- Check frontend console: Browser DevTools
- Database queries: `make dbshell`

Enjoy your budget management system! 🎉
