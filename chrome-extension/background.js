// Celeiro Amazon Sync - Background Service Worker
// Handles the full sync lifecycle: navigate, extract, paginate, send to API.
// Runs independently of the popup — survives popup close/reopen.

console.log('[Celeiro] Background service worker started');

// In-memory sync state (also persisted to storage for popup recovery)
let currentSync = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wait for a tab to reach "complete" status using chrome.tabs.onUpdated.
 * Falls back to polling if the event fires before we attach the listener.
 */
function waitForTabComplete(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error('Tab load timeout'));
    }, timeout);

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        // Extra delay for Amazon's dynamic rendering (lazy-loaded order cards)
        setTimeout(() => resolve(), 2000);
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);

    // Edge case: tab may already be complete before listener attached
    chrome.tabs.get(tabId).then(tab => {
      if (tab.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        setTimeout(() => resolve(), 2000);
      }
    }).catch(() => {});
  });
}

/**
 * Broadcast a message to the popup (best-effort, popup may be closed).
 */
function notifyPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

/**
 * Persist sync state so the popup can recover it after close/reopen.
 */
async function saveSyncState(state) {
  currentSync = state;
  await chrome.storage.local.set({ syncState: state });
}

async function clearSyncState() {
  currentSync = null;
  await chrome.storage.local.remove(['syncState']);
}

// ---------------------------------------------------------------------------
// Order extraction function (injected into the Amazon page)
// ---------------------------------------------------------------------------
// IMPORTANT: this function runs in the PAGE context via chrome.scripting.executeScript.
// All helpers must be defined INSIDE — it has no access to background.js scope.

function extractOrdersFromPage(targetMonth, targetYear) {
  function parsePortugueseMonth(monthName) {
    const months = {
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4,
      'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
      'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
    };
    return months[monthName.toLowerCase()] || null;
  }

  function parseBrazilianDate(dateText) {
    if (!dateText) return null;
    const match = dateText.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parsePortugueseMonth(match[2]);
      const year = parseInt(match[3], 10);
      if (month) {
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { day, month, year, iso };
      }
    }
    return null;
  }

  function parseBrazilianCurrency(currencyText) {
    if (!currencyText) return null;
    const match = currencyText.match(/R\$\s*([\d.,]+)/);
    if (match) {
      const normalized = match[1].replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized);
    }
    return null;
  }

  const orders = [];

  // --- Order cards ---
  const orderCards = document.querySelectorAll(
    '.order-card, .order, [data-testid="order-card"], .a-box-group.order'
  );

  console.log(`[Celeiro] Found ${orderCards.length} order cards on page`);

  orderCards.forEach((card, index) => {
    try {
      // Date
      let dateText = '';
      const dateSelectors = [
        '.order-info .value',
        '.a-column.a-span3 .value',
        '[data-testid="order-date"]',
        '.order-date',
        '.a-color-secondary'
      ];
      for (const sel of dateSelectors) {
        const el = card.querySelector(sel);
        if (el) {
          const text = el.textContent.trim();
          if (text.match(/\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/i)) {
            dateText = text;
            break;
          }
        }
      }
      if (!dateText) {
        const allText = card.textContent;
        const dateMatch = allText.match(/(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i);
        if (dateMatch) dateText = dateMatch[0];
      }
      const parsedDate = parseBrazilianDate(dateText);

      // Total
      let totalText = '';
      const totalSelectors = [
        '.order-info .value',
        '.a-column.a-span2 .value',
        '[data-testid="order-total"]',
        '.order-total',
        '.grand-total-price'
      ];
      for (const sel of totalSelectors) {
        const els = card.querySelectorAll(sel);
        for (const el of els) {
          const text = el.textContent.trim();
          if (text.includes('R$')) { totalText = text; break; }
        }
        if (totalText) break;
      }
      if (!totalText) {
        const currencyMatch = card.textContent.match(/R\$\s*([\d.,]+)/);
        if (currencyMatch) totalText = `R$ ${currencyMatch[1]}`;
      }
      const parsedTotal = parseBrazilianCurrency(totalText);

      // Order ID
      let orderId = '';
      const orderIdSelectors = [
        '.order-info .value',
        '[data-testid="order-id"]',
        '.order-id',
        'a[href*="order-details"]'
      ];
      for (const sel of orderIdSelectors) {
        const el = card.querySelector(sel);
        if (el) {
          const href = el.getAttribute('href');
          if (href && href.includes('orderID=')) {
            const m = href.match(/orderID=([^&]+)/);
            if (m) { orderId = m[1]; break; }
          }
          const text = el.textContent.trim();
          if (text.match(/^\d{3}-\d{7}-\d{7}$/)) { orderId = text; break; }
        }
      }

      // Items
      const items = [];
      const itemSelectors = [
        '.yohtmlc-item a.a-link-normal',
        '.a-fixed-left-grid-inner .a-link-normal',
        '[data-testid="product-title"]',
        '.product-title'
      ];
      for (const sel of itemSelectors) {
        const els = card.querySelectorAll(sel);
        els.forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length > 5 && !text.includes('Ver detalhes')) {
            items.push({ name: text, url: el.href || null });
          }
        });
        if (items.length > 0) break;
      }

      if (dateText || totalText || orderId) {
        orders.push({
          order_id: orderId,
          date: dateText,
          parsed_date: parsedDate,
          total: totalText,
          parsed_total: parsedTotal,
          items: items.slice(0, 5),
          raw_index: index
        });
      }
    } catch (e) {
      console.error('[Celeiro] Error extracting order card:', e);
    }
  });

  // --- Transaction rows (if on transactions page) ---
  const txRows = document.querySelectorAll(
    '.apx-transaction-details, .transaction-row, [data-testid="transaction"]'
  );
  txRows.forEach((row, index) => {
    try {
      const dateEl = row.querySelector('.apx-transaction-date, .transaction-date, [data-testid="transaction-date"]');
      const amountEl = row.querySelector('.apx-transaction-amount, .transaction-amount, [data-testid="transaction-amount"]');
      const descEl = row.querySelector('.apx-transaction-title, .transaction-description, [data-testid="transaction-title"]');

      if (dateEl || amountEl) {
        const txDateText = dateEl?.textContent?.trim() || '';
        const txTotalText = amountEl?.textContent?.trim() || '';
        orders.push({
          order_id: `TX-${index}`,
          date: txDateText,
          parsed_date: parseBrazilianDate(txDateText),
          total: txTotalText,
          parsed_total: parseBrazilianCurrency(txTotalText),
          items: descEl ? [{ name: descEl.textContent.trim() }] : [],
          is_transaction: true,
          raw_index: index
        });
      }
    } catch (e) {
      console.error('[Celeiro] Error extracting transaction row:', e);
    }
  });

  console.log(`[Celeiro] Extracted ${orders.length} orders total`);
  return orders;
}

// ---------------------------------------------------------------------------
// Pagination helper (injected into the Amazon page)
// ---------------------------------------------------------------------------

function clickNextPage() {
  const nextBtn = document.querySelector('.a-pagination .a-last:not(.a-disabled) a') ||
                  document.querySelector('[aria-label="Ir para a próxima página"]') ||
                  document.querySelector('.a-pagination li:last-child:not(.a-disabled) a');
  if (nextBtn) {
    nextBtn.click();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Full sync operation
// ---------------------------------------------------------------------------

async function performFullSync({ tabId, month, year, apiUrl, token }) {
  try {
    await saveSyncState({ status: 'running', message: 'Navegando para pedidos...', percent: 5 });
    notifyPopup({ type: 'syncProgress', message: 'Navegando para pedidos...', percent: 5 });

    // 1. Navigate to orders page
    const ordersUrl = `https://www.amazon.com.br/your-orders/orders?timeFilter=year-${year}`;
    console.log('[Celeiro] Navigating to:', ordersUrl);
    await chrome.tabs.update(tabId, { url: ordersUrl });
    await waitForTabComplete(tabId);

    // 2. Paginated extraction
    await saveSyncState({ status: 'running', message: 'Extraindo pedidos...', percent: 20 });
    notifyPopup({ type: 'syncProgress', message: 'Extraindo pedidos...', percent: 20 });

    const allOrders = [];
    let pageNum = 1;
    let hasMorePages = true;
    let pastMonthDetectedOnPage = 0;
    const maxPages = 20;

    while (hasMorePages && pageNum <= maxPages) {
      const progressMsg = `Extraindo página ${pageNum}...`;
      const progressPct = Math.min(20 + pageNum * 5, 55);
      await saveSyncState({ status: 'running', message: progressMsg, percent: progressPct });
      notifyPopup({ type: 'syncProgress', message: progressMsg, percent: progressPct });

      // Inject extraction function into Amazon page
      let pageOrders = [];
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: extractOrdersFromPage,
          args: [month, year]
        });
        pageOrders = results[0]?.result || [];
      } catch (e) {
        console.error(`[Celeiro] Extraction failed on page ${pageNum}:`, e);
      }

      console.log(`[Celeiro] Page ${pageNum}: found ${pageOrders.length} orders`);

      // Filter by target month & detect past-month boundary
      for (const order of pageOrders) {
        if (order.parsed_date) {
          const om = order.parsed_date.month;
          const oy = order.parsed_date.year;

          if (oy < year || (oy === year && om < month)) {
            if (pastMonthDetectedOnPage === 0) {
              pastMonthDetectedOnPage = pageNum;
              console.log(`[Celeiro] Reached past month (${om}/${oy}) on page ${pageNum}, will fetch one more`);
            }
          }

          if (om === month && oy === year) {
            allOrders.push(order);
          }
        } else {
          // No parsed date — include, backend will filter
          allOrders.push(order);
        }
      }

      // Stop if we already fetched the extra page after detecting past month
      if (pastMonthDetectedOnPage > 0 && pageNum > pastMonthDetectedOnPage) {
        console.log(`[Celeiro] Finished extra page ${pageNum}, stopping`);
        break;
      }

      // Click "Next" and wait for navigation
      try {
        const paginationResult = await chrome.scripting.executeScript({
          target: { tabId },
          func: clickNextPage
        });
        hasMorePages = paginationResult[0]?.result === true;
      } catch (e) {
        console.error('[Celeiro] Pagination click failed:', e);
        hasMorePages = false;
      }

      if (hasMorePages) {
        pageNum++;
        await waitForTabComplete(tabId);
      }
    }

    console.log('[Celeiro] Total orders extracted:', allOrders.length);
    if (allOrders.length > 0) {
      console.log('[Celeiro] Sample:', JSON.stringify(allOrders.slice(0, 2), null, 2));
    }

    // 3. Handle empty result
    if (allOrders.length === 0) {
      const result = { success: true, ordersFound: 0, matched: 0, message: 'Nenhum pedido encontrado' };
      await saveSyncState({ status: 'done', result });
      notifyPopup({ type: 'syncComplete', result });
      return;
    }

    // 4. Send to API
    const apiMsg = `${allOrders.length} pedidos encontrados. Enviando para API...`;
    await saveSyncState({ status: 'running', message: apiMsg, percent: 60 });
    notifyPopup({ type: 'syncProgress', message: apiMsg, percent: 60 });

    console.log('[Celeiro] Sending to API:', `${apiUrl}/financial/amazon/sync`);
    const response = await fetch(`${apiUrl}/financial/amazon/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Active-Organization': '1'
      },
      body: JSON.stringify({ orders: allOrders, month, year })
    });

    console.log('[Celeiro] API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Celeiro] API error:', response.status, errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Celeiro] API response data:', data);

    // Debug: log matched/unmatched
    if (data.data?.matched_orders?.length > 0) {
      console.log('[Celeiro] ✅ MATCHED ORDERS:');
      data.data.matched_orders.forEach((m, i) => {
        console.log(`  ${i + 1}. Order ${m.order_id}: R$ ${m.order_amount} → TX #${m.transaction_id} (${m.new_description})`);
      });
    }
    if (data.data?.unmatched_orders?.length > 0) {
      console.log('[Celeiro] ❌ UNMATCHED ORDERS:');
      data.data.unmatched_orders.forEach((u, i) => {
        console.log(`  ${i + 1}. Order ${u.order_id}: R$ ${u.amount} on ${u.date} - Reason: ${u.reason}`);
        console.log(`     Items: ${u.description}`);
      });
    }

    // 5. Done
    const finalResult = {
      success: true,
      ordersFound: allOrders.length,
      matched: data.data?.matched_count || 0,
      message: 'Sincronização concluída com sucesso'
    };
    await saveSyncState({ status: 'done', result: finalResult, percent: 100 });
    notifyPopup({ type: 'syncComplete', result: finalResult });

  } catch (error) {
    console.error('[Celeiro] Sync error:', error);
    const errMsg = error.message || 'Erro desconhecido';
    await saveSyncState({ status: 'error', error: errMsg });
    notifyPopup({ type: 'syncError', error: errMsg });
  }
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Celeiro] Background received:', request.action);

  if (request.action === 'startSync') {
    const { tabId, month, year, apiUrl, token } = request;
    performFullSync({ tabId, month, year, apiUrl, token });
    sendResponse({ started: true });
    return true;
  }

  if (request.action === 'getSyncStatus') {
    sendResponse({ sync: currentSync });
    return true;
  }

  if (request.action === 'cancelSync') {
    clearSyncState();
    sendResponse({ cancelled: true });
    return true;
  }

  sendResponse({ error: 'Unknown action' });
  return true;
});

console.log('[Celeiro] Background service worker ready');
