# Amazon Sync - Transaction Matching

Matches Amazon orders (from Chrome Extension) with bank transactions to enrich transaction descriptions.

## API Endpoint

```
POST /financial/amazon/sync
```

**Headers:**
- `Authorization: Bearer <token>`
- `X-Active-Organization: <org_id>`

**Payload:**
```json
{
  "orders": [
    {
      "order_id": "123-4567890-1234567",
      "date": "15 de dezembro de 2024",
      "parsed_date": { "day": 15, "month": 12, "year": 2024, "iso": "2024-12-15" },
      "total": "R$ 123,45",
      "parsed_total": 123.45,
      "items": [{ "name": "Product Name", "url": "..." }]
    }
  ],
  "month": 12,
  "year": 2024
}
```

## Matching Algorithm

### Step 1: Fetch Transactions

Fetches all transactions for the user/org in the specified month/year.

### Step 2: Score Each Potential Match

For each Amazon order, scores all transactions:

| Factor | Criteria | Score Impact |
|--------|----------|--------------|
| **Amount** | Must be within **2%** tolerance | Required (eliminates if >2%) |
| **Date** | Must be within **5 days** | Required (eliminates if >5 days) |
| **Date proximity** | 0 days = +0.5, decreases by 0.08/day | +0.10 to +0.50 |
| **Description bonus** | Contains Amazon keywords | +0.50 |

### Step 3: Select Best Match

Highest scoring transaction wins. Each transaction can only match once.

## Tolerance Rationale

### Why 2% Amount Tolerance?

- Handles minor rounding differences
- Small price adjustments or discounts

### Why 5 Days Date Tolerance?

Amazon charges when items **ship**, not when ordered:
1. Order placed: Day 0
2. Item ships: Day 1-3 (Amazon charges card)
3. Credit card processing: +1-2 business days
4. Appears in bank statement: Day 3-5

Analysis showed typical delays of 1-2 days, with outliers up to 5 days.

## Amazon Transaction Patterns

The algorithm recognizes these patterns in transaction descriptions (case-insensitive):

- `amazon` - Direct Amazon purchases
- `amzn` - Abbreviated Amazon charges
- `mktplc` - e.g., "Amazonmktplc*VendorName"
- `marketplace` - e.g., "Amazon Marketplace"

Transactions matching these patterns get a +0.5 score bonus.

## Response Format

```json
{
  "data": {
    "total_orders": 10,
    "matched_count": 8,
    "message": "Sincronizado! 8 de 10 pedidos correspondidos",
    "matched_orders": [
      {
        "order_id": "123-...",
        "transaction_id": 456,
        "original_desc": "Amazonmktplc*AB1234",
        "new_description": "Amazon: Product Name (Pedido: 123-...)",
        "order_amount": 99.90,
        "transaction_amount": -99.90
      }
    ],
    "unmatched_orders": [
      {
        "order_id": "789-...",
        "amount": 150.00,
        "date": "20 de dezembro de 2024",
        "description": "Some Product",
        "reason": "Valor OK (1.5% diff) mas data muito distante (7 dias)"
      }
    ]
  }
}
```

## Unmatched Order Reasons

The API returns detailed Portuguese reasons:

| Reason | Meaning |
|--------|---------|
| `Valor OK (X% diff) mas data muito distante (Y dias)` | Amount matched but date >5 days |
| `Data OK (X dias) mas valor diferente (Y%)` | Date matched but amount >2% diff |
| `Nenhuma transação correspondente encontrada` | No candidates found |
| `Valor do pedido não disponível` | Order total was zero/null |
| `Erro ao atualizar transação` | Match found but update failed |

## Key Files

- `internal/application/financial/service.go` - `SyncAmazonOrders()` method
- `internal/web/financial/handler.go` - HTTP handler
- `internal/application/financial/models.go` - Request/response DTOs
