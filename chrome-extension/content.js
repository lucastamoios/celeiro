// Celeiro Amazon Sync - Content Script
// This script runs on Amazon order pages and provides order extraction capabilities

console.log('[Celeiro] Amazon Sync content script loaded');

// Month name mappings for Portuguese
const MONTH_NAMES_PT = {
  'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4,
  'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
  'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
};

const MONTH_NAMES_EN = {
  'january': 1, 'february': 2, 'march': 3, 'april': 4,
  'may': 5, 'june': 6, 'july': 7, 'august': 8,
  'september': 9, 'october': 10, 'november': 11, 'december': 12
};

/**
 * Parse a date string in various Amazon formats
 * Supports: "DD de MÊS de YYYY", "MÊS DD, YYYY", etc.
 */
function parseAmazonDate(dateStr) {
  if (!dateStr) return null;

  dateStr = dateStr.toLowerCase().trim();

  // Try Portuguese format: "15 de dezembro de 2024"
  let match = dateStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2];
    const year = parseInt(match[3]);
    const month = MONTH_NAMES_PT[monthName];
    if (month) {
      return { day, month, year, iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
    }
  }

  // Try English format: "December 15, 2024"
  match = dateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (match) {
    const monthName = match[1];
    const day = parseInt(match[2]);
    const year = parseInt(match[3]);
    const month = MONTH_NAMES_EN[monthName];
    if (month) {
      return { day, month, year, iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
    }
  }

  // Try ISO format: "2024-12-15"
  match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: parseInt(match[1]),
      month: parseInt(match[2]),
      day: parseInt(match[3]),
      iso: match[0]
    };
  }

  // Try DD/MM/YYYY
  match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);
    return { day, month, year, iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
  }

  return null;
}

/**
 * Parse a currency string in BRL format
 */
function parseCurrency(currencyStr) {
  if (!currencyStr) return null;

  // Remove "R$" and whitespace
  let cleaned = currencyStr.replace(/R\$\s*/g, '').trim();

  // Handle Brazilian format: 1.234,56 -> 1234.56
  // First remove thousand separators (dots in Brazilian format)
  cleaned = cleaned.replace(/\./g, '');
  // Then replace comma with dot for decimal
  cleaned = cleaned.replace(',', '.');

  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

/**
 * Extract order information from the current page
 */
function extractOrdersFromPage(targetMonth = null, targetYear = null) {
  const orders = [];
  const seenOrderIds = new Set();

  console.log('[Celeiro] Starting order extraction...');

  // Strategy 1: Find order cards using various selectors
  const orderContainers = document.querySelectorAll(`
    .order-card,
    .order,
    [data-testid="order-card"],
    .a-box-group.order,
    .js-order-card,
    .your-orders-content-container .a-box-group
  `);

  console.log(`[Celeiro] Found ${orderContainers.length} potential order containers`);

  orderContainers.forEach((container, idx) => {
    try {
      const order = extractOrderFromContainer(container);
      if (order && order.order_id && !seenOrderIds.has(order.order_id)) {
        // Filter by month/year if specified
        if (targetMonth && targetYear && order.parsed_date) {
          if (order.parsed_date.month !== targetMonth || order.parsed_date.year !== targetYear) {
            return;
          }
        }
        seenOrderIds.add(order.order_id);
        orders.push(order);
      }
    } catch (e) {
      console.error('[Celeiro] Error extracting order from container:', e);
    }
  });

  // Strategy 2: If on transactions page, extract transaction data
  if (window.location.href.includes('/transactions')) {
    const transactions = extractTransactionsFromPage(targetMonth, targetYear);
    transactions.forEach(tx => {
      if (!seenOrderIds.has(tx.order_id)) {
        seenOrderIds.add(tx.order_id);
        orders.push(tx);
      }
    });
  }

  console.log(`[Celeiro] Extracted ${orders.length} orders total`);
  return orders;
}

/**
 * Extract order info from a single order container element
 */
function extractOrderFromContainer(container) {
  const order = {
    order_id: null,
    date: null,
    parsed_date: null,
    total: null,
    parsed_total: null,
    items: [],
    seller: null
  };

  // Find order ID
  const orderIdLink = container.querySelector('a[href*="orderID="]');
  if (orderIdLink) {
    const match = orderIdLink.href.match(/orderID=([^&]+)/);
    if (match) {
      order.order_id = match[1];
    }
  }

  // Also check for order ID in text format (XXX-XXXXXXX-XXXXXXX)
  if (!order.order_id) {
    const allText = container.textContent;
    const orderIdMatch = allText.match(/\d{3}-\d{7}-\d{7}/);
    if (orderIdMatch) {
      order.order_id = orderIdMatch[0];
    }
  }

  // Find order date
  const dateSelectors = [
    '.order-info .a-column:first-child .value',
    '[data-testid="order-date"]',
    '.order-date-container .value',
    'span.a-size-base.a-color-secondary'
  ];

  for (const selector of dateSelectors) {
    const el = container.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      const parsed = parseAmazonDate(text);
      if (parsed) {
        order.date = text;
        order.parsed_date = parsed;
        break;
      }
    }
  }

  // Also try to find date from "Pedido realizado" text
  if (!order.parsed_date) {
    const allText = container.textContent;
    const ptMatch = allText.match(/(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i);
    if (ptMatch) {
      const parsed = parseAmazonDate(ptMatch[1]);
      if (parsed) {
        order.date = ptMatch[1];
        order.parsed_date = parsed;
      }
    }
  }

  // Find order total
  const totalSelectors = [
    '.order-info .a-column:nth-child(2) .value',
    '[data-testid="order-total"]',
    '.order-total',
    '.yohtmlc-order-total .value'
  ];

  for (const selector of totalSelectors) {
    const el = container.querySelector(selector);
    if (el) {
      const text = el.textContent.trim();
      const parsed = parseCurrency(text);
      if (parsed !== null) {
        order.total = text;
        order.parsed_total = parsed;
        break;
      }
    }
  }

  // Also try to find total from "Total" label nearby
  if (!order.parsed_total) {
    const allText = container.textContent;
    const totalMatch = allText.match(/Total[:\s]*R\$\s*([\d.,]+)/i);
    if (totalMatch) {
      order.total = `R$ ${totalMatch[1]}`;
      order.parsed_total = parseCurrency(totalMatch[1]);
    }
  }

  // Find items/products
  const itemSelectors = [
    '.yohtmlc-item .a-link-normal',
    '.a-fixed-left-grid-inner a.a-link-normal[href*="/dp/"]',
    '[data-testid="product-title"]',
    '.product-title'
  ];

  const seenItems = new Set();
  for (const selector of itemSelectors) {
    const itemEls = container.querySelectorAll(selector);
    itemEls.forEach(el => {
      const text = el.textContent.trim();
      // Filter out navigation links and duplicates
      if (text && text.length > 5 && !seenItems.has(text) &&
          !text.toLowerCase().includes('ver detalhes') &&
          !text.toLowerCase().includes('track package') &&
          !text.toLowerCase().includes('rastrear')) {
        seenItems.add(text);
        order.items.push({
          name: text.substring(0, 200), // Limit length
          url: el.href || null
        });
      }
    });
    if (order.items.length > 0) break;
  }

  // Find seller
  const sellerEl = container.querySelector('.yohtmlc-seller, [data-testid="seller-name"]');
  if (sellerEl) {
    order.seller = sellerEl.textContent.trim();
  }

  return order;
}

/**
 * Extract transactions from the transactions page
 */
function extractTransactionsFromPage(targetMonth = null, targetYear = null) {
  const transactions = [];

  const transactionRows = document.querySelectorAll(`
    .apx-transaction-details,
    .transaction-row,
    [data-testid="transaction"],
    .pmts-transaction-row
  `);

  console.log(`[Celeiro] Found ${transactionRows.length} transaction rows`);

  transactionRows.forEach((row, idx) => {
    try {
      // Find date
      const dateEl = row.querySelector('.apx-transaction-date, .transaction-date, [data-testid="transaction-date"]');
      const dateText = dateEl?.textContent?.trim();
      const parsedDate = parseAmazonDate(dateText);

      // Filter by month/year
      if (targetMonth && targetYear && parsedDate) {
        if (parsedDate.month !== targetMonth || parsedDate.year !== targetYear) {
          return;
        }
      }

      // Find amount
      const amountEl = row.querySelector('.apx-transaction-amount, .transaction-amount, [data-testid="transaction-amount"]');
      const amountText = amountEl?.textContent?.trim();
      const parsedAmount = parseCurrency(amountText);

      // Find description
      const descEl = row.querySelector('.apx-transaction-title, .transaction-description, [data-testid="transaction-title"]');
      const description = descEl?.textContent?.trim();

      // Find order ID if linked
      const orderLink = row.querySelector('a[href*="orderID="]');
      let orderId = null;
      if (orderLink) {
        const match = orderLink.href.match(/orderID=([^&]+)/);
        if (match) orderId = match[1];
      }

      if (dateText || amountText) {
        transactions.push({
          order_id: orderId || `TX-${idx}-${Date.now()}`,
          date: dateText || null,
          parsed_date: parsedDate,
          total: amountText || null,
          parsed_total: parsedAmount,
          items: description ? [{ name: description }] : [],
          is_transaction: true
        });
      }
    } catch (e) {
      console.error('[Celeiro] Error extracting transaction:', e);
    }
  });

  return transactions;
}

/**
 * Get pagination info from the current page
 */
function getPaginationInfo() {
  const paginationEl = document.querySelector('.a-pagination, [data-testid="pagination"]');
  if (!paginationEl) {
    return { hasNext: false, hasPrev: false, currentPage: 1, totalPages: 1 };
  }

  const nextLink = paginationEl.querySelector('.a-last:not(.a-disabled) a, [data-testid="next-page"]');
  const prevLink = paginationEl.querySelector('.a-first:not(.a-disabled) a, [data-testid="prev-page"]');
  const currentEl = paginationEl.querySelector('.a-selected, [data-testid="current-page"]');

  return {
    hasNext: !!nextLink,
    hasPrev: !!prevLink,
    nextUrl: nextLink?.href || null,
    prevUrl: prevLink?.href || null,
    currentPage: currentEl ? parseInt(currentEl.textContent) : 1
  };
}

/**
 * Click next page button
 */
function goToNextPage() {
  const nextLink = document.querySelector('.a-pagination .a-last:not(.a-disabled) a');
  if (nextLink) {
    nextLink.click();
    return true;
  }
  return false;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Celeiro] Received message:', request.action);

  if (request.action === 'extractOrders') {
    const orders = extractOrdersFromPage(request.month, request.year);
    sendResponse({ success: true, orders });
    return true;
  }

  if (request.action === 'getPagination') {
    const pagination = getPaginationInfo();
    sendResponse({ success: true, pagination });
    return true;
  }

  if (request.action === 'nextPage') {
    const success = goToNextPage();
    sendResponse({ success });
    return true;
  }

  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'Content script active' });
    return true;
  }

  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});

// Export for direct script injection
window.CeleiroAmazonSync = {
  extractOrders: extractOrdersFromPage,
  getPagination: getPaginationInfo,
  goToNextPage,
  parseDate: parseAmazonDate,
  parseCurrency
};

console.log('[Celeiro] Content script ready');
