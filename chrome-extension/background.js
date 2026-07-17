// Celeiro Amazon Sync - Background Service Worker
// Handles the full sync lifecycle: navigate, extract, paginate, send to API.
// Runs independently of the popup — survives popup close/reopen.

if (!globalThis.CeleiroGmailForwarding && typeof importScripts === 'function') {
  importScripts('gmail-forwarding-flow.js');
}

console.log('[Celeiro] Background service worker started');

// In-memory sync state (also persisted to storage for popup recovery)
let currentSync = null;
let currentForwarding = null;

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

async function saveForwardingState(state) {
  currentForwarding = state;
  await chrome.storage.local.set({ forwardingState: state });
}

function notifyForwarding(message) {
  notifyPopup(message);
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
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

function getNextPageUrl() {
  const nextBtn = document.querySelector('.a-pagination .a-last:not(.a-disabled) a') ||
                  document.querySelector('[aria-label="Ir para a próxima página"]') ||
                  document.querySelector('.a-pagination li:last-child:not(.a-disabled) a');
  return nextBtn ? nextBtn.href : null;
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

      // Navigate to next page — extract the URL first so we can guarantee
      // timeFilter is preserved (Amazon sometimes omits it from pagination links)
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: getNextPageUrl
        });
        const nextUrl = results[0]?.result;
        if (nextUrl) {
          let urlToNavigate = nextUrl;
          if (!urlToNavigate.includes('timeFilter')) {
            const sep = urlToNavigate.includes('?') ? '&' : '?';
            urlToNavigate += `${sep}timeFilter=year-${year}`;
          }
          pageNum++;
          await chrome.tabs.update(tabId, { url: urlToNavigate });
          await waitForTabComplete(tabId);
          hasMorePages = true;
        } else {
          hasMorePages = false;
        }
      } catch (e) {
        console.error('[Celeiro] Pagination failed:', e);
        hasMorePages = false;
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
// Gmail forwarding
// ---------------------------------------------------------------------------

// These functions run inside Gmail through chrome.scripting.executeScript.
// Keep each one self-contained: injected functions cannot access worker scope.

function inspectGmailForwarding(address) {
  const normalizedAddress = String(address).toLowerCase();
  const textOf = element => `${element.textContent || ''} ${element.value || ''}`.trim().toLowerCase();
  const isVisible = element => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  const pageText = (document.body?.innerText || '').toLowerCase();

  if (location.hostname === 'accounts.google.com' || /sign in|fazer login|iniciar sess[aã]o/.test(pageText)) {
    return 'requires-login';
  }

  const selects = Array.from(document.querySelectorAll('select')).filter(isVisible);
  const addressSelect = selects.find(select =>
    Array.from(select.options || []).some(option => textOf(option).includes(normalizedAddress))
  );

  if (addressSelect) {
    const forwardingRadio = Array.from(document.querySelectorAll('input[type="radio"]'))
      .filter(isVisible)
      .find(radio => {
        let container = radio;
        for (let level = 0; container && level < 8; level += 1, container = container.parentElement) {
          const containerText = textOf(container);
          if (/forward a copy|encaminhar uma c[oó]pia/.test(containerText) &&
              !/disable forwarding|desativar encaminhamento/.test(containerText)) return true;
        }
        const containerText = textOf(radio);
        return /forward a copy|encaminhar uma c[oó]pia/.test(containerText) &&
          !/disable forwarding|desativar encaminhamento/.test(containerText);
      });
    const selectedAddress = textOf(addressSelect.options[addressSelect.selectedIndex] || addressSelect);
    return forwardingRadio?.checked && selectedAddress.includes(normalizedAddress) ? 'enabled' : 'disabled';
  }

  if (pageText.includes(normalizedAddress) && /verification|confirm|verifica|confirma|pendente|pending/.test(pageText)) {
    return 'pending';
  }

  return 'missing';
}

async function addGmailForwardingAddress(address) {
  const isVisible = element => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  const textOf = element => `${element.textContent || ''} ${element.value || ''}`.trim().toLowerCase();
  const controls = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
    .filter(isVisible);
  const addButton = controls.find(control => /add a forwarding address|adicionar um endere[cç]o de encaminhamento/.test(textOf(control)));

  if (!addButton) {
    throw new Error('Gmail add-forwarding control was not found');
  }
  addButton.click();

  const waitFor = async (finder, timeout = 10000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const result = finder();
      if (result) return result;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return null;
  };

  const dialog = await waitFor(() =>
    Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .Kj-JD')).find(isVisible)
  , 2000);
  if (!dialog) {
    return false;
  }

  const input = Array.from(dialog.querySelectorAll('input[type="email"], input[type="text"]')).find(isVisible);
  if (!input) {
    throw new Error('Gmail forwarding address field was not found');
  }

  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (valueSetter) valueSetter.call(input, address);
  else input.value = address;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  const nextButton = Array.from(dialog.querySelectorAll('button, input[type="button"], input[type="submit"]'))
    .filter(isVisible)
    .find(control => /next|pr[oó]xima|avan[cç]ar|prosseguir/.test(textOf(control)));
  if (!nextButton) {
    throw new Error('Gmail forwarding next button was not found');
  }
  nextButton.click();
  return true;
}

function submitGmailForwardingAddress(address) {
  const isVisible = element => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  const textOf = element => `${element.textContent || ''} ${element.value || ''}`.trim().toLowerCase();
  const pageText = (document.body?.innerText || '').toLowerCase();
  if (!/forward|encaminh/.test(pageText)) return false;

  const dialog = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .Kj-JD'))
    .find(isVisible) || document.body;
  const input = Array.from(dialog.querySelectorAll('input[type="email"], input[type="text"]')).find(isVisible);
  if (!input) return false;

  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (valueSetter) valueSetter.call(input, address);
  else input.value = address;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  const nextButton = Array.from(dialog.querySelectorAll('button, input[type="button"], input[type="submit"]'))
    .filter(isVisible)
    .find(control => /next|pr[oó]xima|avan[cç]ar|prosseguir/.test(textOf(control)));
  if (!nextButton) return false;
  nextButton.click();
  return true;
}

async function confirmGmailForwardingDialog() {
  const isVisible = element => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  const textOf = element => `${element.textContent || ''} ${element.value || ''}`.trim().toLowerCase();
  const pageText = (document.body?.innerText || '').toLowerCase();
  if (!/forward|encaminh/.test(pageText)) return false;

  let clicked = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const dialog = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .Kj-JD'))
      .find(isVisible) || document.body;
    const action = Array.from(dialog.querySelectorAll('button, input[type="button"], input[type="submit"]'))
      .filter(isVisible)
      .find(control => /^(proceed|prosseguir|ok|okay|next|pr[oó]xima)$/.test(textOf(control)));
    if (!action) break;
    action.click();
    clicked = true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return clicked;
}

function enableGmailForwarding(address) {
  const normalizedAddress = String(address).toLowerCase();
  const isVisible = element => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  const textOf = element => `${element.textContent || ''} ${element.value || ''}`.trim().toLowerCase();
  const select = Array.from(document.querySelectorAll('select')).filter(isVisible).find(candidate =>
    Array.from(candidate.options || []).some(option => textOf(option).includes(normalizedAddress))
  );

  if (!select) throw new Error('Confirmed Gmail forwarding address was not found');
  const option = Array.from(select.options).find(candidate => textOf(candidate).includes(normalizedAddress));
  select.value = option.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));

  const forwardingRadio = Array.from(document.querySelectorAll('input[type="radio"]')).filter(isVisible).find(radio => {
    let container = radio;
    for (let level = 0; container && level < 8; level += 1, container = container.parentElement) {
      const containerText = textOf(container);
      if (/forward a copy|encaminhar uma c[oó]pia/.test(containerText) &&
          !/disable forwarding|desativar encaminhamento/.test(containerText)) return true;
    }
    return false;
  });
  if (!forwardingRadio) throw new Error('Gmail enable-forwarding control was not found');
  forwardingRadio.click();
  forwardingRadio.dispatchEvent(new Event('change', { bubbles: true }));
}

function saveGmailForwardingSettings() {
  const isVisible = element => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  const textOf = element => `${element.textContent || ''} ${element.value || ''}`.trim().toLowerCase();
  const saveButton = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
    .filter(isVisible)
    .find(control => /^(save changes|salvar altera[cç][oõ]es)$/.test(textOf(control)));
  if (!saveButton) throw new Error('Gmail save-settings button was not found');
  saveButton.click();
}

async function executeInTab(tabId, func, args = []) {
  const results = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return results[0]?.result;
}

async function getOrCreateGmailSettingsTab() {
  const settingsURL = 'https://mail.google.com/mail/u/0/#settings/fwdandpop';
  const gmailTabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
  let tab = gmailTabs.find(candidate => candidate.url?.includes('#settings/fwdandpop')) || gmailTabs[0];

  if (tab) {
    if (tab.url === settingsURL) {
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.tabs.reload(tab.id);
      tab = await chrome.tabs.get(tab.id);
    } else {
      tab = await chrome.tabs.update(tab.id, { url: settingsURL, active: true });
    }
  } else {
    tab = await chrome.tabs.create({ url: settingsURL, active: true });
  }
  await waitForTabComplete(tab.id);
  return tab;
}

async function confirmOpenGmailDialogs() {
  await delay(1000);
  const gmailTabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
  for (const tab of gmailTabs) {
    try {
      await executeInTab(tab.id, confirmGmailForwardingDialog);
    } catch (error) {
      console.debug('[Celeiro] Gmail dialog not available in tab:', tab.id, error.message);
    }
  }
}

async function submitOpenGmailForwardingAddress(address) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await delay(500);
    const gmailTabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
    for (const tab of gmailTabs) {
      try {
        if (await executeInTab(tab.id, submitGmailForwardingAddress, [address])) return true;
      } catch (error) {
        console.debug('[Celeiro] Gmail forwarding form not ready in tab:', tab.id, error.message);
      }
    }
  }
  return false;
}

async function performGmailForwarding(emailID) {
  let address = '';

  try {
    const flow = globalThis.CeleiroGmailForwarding;
    if (!flow) throw new Error('Gmail forwarding module was not loaded');

    address = flow.buildForwardingAddress(emailID);
    const settingsURL = 'https://mail.google.com/mail/u/0/#settings/fwdandpop';
    await saveForwardingState({ status: 'running', message: 'Abrindo configurações do Gmail...', address });
    notifyForwarding({ type: 'forwardingProgress', message: 'Abrindo configurações do Gmail...' });

    const gmailTab = await getOrCreateGmailSettingsTab();
    const gateway = {
      inspect: async forwardingAddress => {
        const currentTab = await chrome.tabs.get(gmailTab.id);
        if (!currentTab.url?.startsWith('https://mail.google.com/')) return 'requires-login';
        return executeInTab(gmailTab.id, inspectGmailForwarding, [forwardingAddress]);
      },
      add: async forwardingAddress => {
        notifyForwarding({ type: 'forwardingProgress', message: 'Adicionando seu email do Celeiro...' });
        const submittedInline = await executeInTab(gmailTab.id, addGmailForwardingAddress, [forwardingAddress]);
        if (!submittedInline && !await submitOpenGmailForwardingAddress(forwardingAddress)) {
          throw new Error('Gmail forwarding address form was not found');
        }
        await confirmOpenGmailDialogs();
      },
      waitForVerification: async () => {
        await saveForwardingState({ status: 'running', message: 'Aguardando confirmação segura do Celeiro...', address });
        notifyForwarding({ type: 'forwardingProgress', message: 'Aguardando confirmação segura do Celeiro...' });
        await delay(5000);
      },
      reloadSettings: async () => {
        const currentTab = await chrome.tabs.get(gmailTab.id);
        if (currentTab.url === settingsURL) {
          await chrome.tabs.reload(gmailTab.id);
        } else {
          await chrome.tabs.update(gmailTab.id, { url: settingsURL });
        }
        await waitForTabComplete(gmailTab.id);
      },
      enable: async forwardingAddress => {
        notifyForwarding({ type: 'forwardingProgress', message: 'Ativando encaminhamento no Gmail...' });
        await executeInTab(gmailTab.id, enableGmailForwarding, [forwardingAddress]);
      },
      save: async () => {
        await executeInTab(gmailTab.id, saveGmailForwardingSettings);
        await delay(1500);
      },
    };

    const result = await flow.configureGmailForwarding(gateway, address);
    const message = result.alreadyEnabled
      ? 'O encaminhamento do Gmail já estava configurado.'
      : 'Encaminhamento do Gmail configurado com segurança!';
    await saveForwardingState({ status: 'done', message, address });
    notifyForwarding({ type: 'forwardingComplete', message });
  } catch (error) {
    let message = error.message || 'Erro desconhecido';
    if (/requires-login/.test(message)) {
      message = 'Entre no Gmail na aba aberta e tente novamente.';
    } else if (/confirmation timed out/.test(message)) {
      message = 'A confirmação não chegou. Verifique se o Gmail aberto usa o mesmo email da sua conta Celeiro e tente novamente.';
    }
    await saveForwardingState({ status: 'error', error: message, address });
    notifyForwarding({ type: 'forwardingError', error: message });
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

  if (request.action === 'startGmailForwarding') {
    if (currentForwarding?.status === 'running') {
      sendResponse({ error: 'A configuração do Gmail já está em andamento.' });
      return true;
    }
    performGmailForwarding(request.emailID);
    sendResponse({ started: true });
    return true;
  }

  if (request.action === 'getGmailForwardingStatus') {
    sendResponse({ forwarding: currentForwarding });
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
