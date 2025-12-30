// Celeiro Amazon Sync - Background Service Worker
// Handles long-running operations and coordinates between popup and content scripts

console.log('[Celeiro] Background service worker started');

// Store for ongoing sync operations
let currentSync = null;

/**
 * Send a message to a tab and wait for response
 */
async function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Wait for a tab to finish loading
 */
async function waitForTabLoad(tabId, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkTab = async () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Tab load timeout'));
        return;
      }

      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          // Give extra time for dynamic content
          await new Promise(r => setTimeout(r, 2000));
          resolve(tab);
        } else {
          setTimeout(checkTab, 500);
        }
      } catch (e) {
        reject(e);
      }
    };

    checkTab();
  });
}

/**
 * Inject content script into a tab if not already present
 */
async function ensureContentScript(tabId) {
  try {
    // Try to ping the content script
    const response = await sendTabMessage(tabId, { action: 'ping' });
    if (response?.success) {
      return true;
    }
  } catch {
    // Content script not loaded, inject it
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    // Wait a bit for script initialization
    await new Promise(r => setTimeout(r, 500));
    return true;
  } catch (e) {
    console.error('[Celeiro] Failed to inject content script:', e);
    return false;
  }
}

/**
 * Extract orders with pagination support
 */
async function extractAllOrders(tabId, month, year, onProgress) {
  const allOrders = [];
  const seenOrderIds = new Set();
  let pageCount = 0;
  const maxPages = 20; // Safety limit

  while (pageCount < maxPages) {
    pageCount++;
    onProgress?.(`Processando página ${pageCount}...`);

    // Ensure content script is loaded
    await ensureContentScript(tabId);

    // Extract orders from current page
    try {
      const response = await sendTabMessage(tabId, {
        action: 'extractOrders',
        month,
        year
      });

      if (response?.success && response.orders) {
        for (const order of response.orders) {
          if (order.order_id && !seenOrderIds.has(order.order_id)) {
            seenOrderIds.add(order.order_id);
            allOrders.push(order);
          }
        }
        console.log(`[Celeiro] Page ${pageCount}: Found ${response.orders.length} orders (${allOrders.length} total)`);
      }
    } catch (e) {
      console.error('[Celeiro] Error extracting from page:', e);
    }

    // Check for next page
    try {
      const paginationResponse = await sendTabMessage(tabId, { action: 'getPagination' });

      if (!paginationResponse?.success || !paginationResponse.pagination?.hasNext) {
        console.log('[Celeiro] No more pages');
        break;
      }

      // Go to next page
      onProgress?.(`Navegando para página ${pageCount + 1}...`);

      const nextResponse = await sendTabMessage(tabId, { action: 'nextPage' });
      if (!nextResponse?.success) {
        break;
      }

      // Wait for page to load
      await waitForTabLoad(tabId);

    } catch (e) {
      console.error('[Celeiro] Pagination error:', e);
      break;
    }
  }

  return allOrders;
}

/**
 * Full sync operation: navigate to orders page, paginate, extract, and send to API
 */
async function performFullSync(options) {
  const { tabId, month, year, apiUrl, token, onProgress, onComplete, onError } = options;

  try {
    currentSync = { status: 'running', progress: 0 };
    onProgress?.('Navegando para página de pedidos...', 5);

    // Navigate to orders page
    const ordersUrl = `https://www.amazon.com.br/your-orders/orders?timeFilter=year-${year}`;
    await chrome.tabs.update(tabId, { url: ordersUrl });
    await waitForTabLoad(tabId);

    onProgress?.('Extraindo pedidos...', 20);

    // Extract all orders with pagination
    const orders = await extractAllOrders(tabId, month, year, (msg) => {
      onProgress?.(msg, 40);
    });

    if (orders.length === 0) {
      onComplete?.({ success: true, orders: [], matched: 0, message: 'Nenhum pedido encontrado' });
      return;
    }

    onProgress?.(`${orders.length} pedidos encontrados. Enviando para API...`, 70);

    // Send to Celeiro API
    const response = await fetch(`${apiUrl}/api/v1/financial/amazon/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Active-Organization': '1'
      },
      body: JSON.stringify({
        orders,
        month,
        year
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    onProgress?.('Sincronização concluída!', 100);
    onComplete?.({
      success: true,
      orders,
      matched: result.data?.matched_count || 0,
      message: 'Sincronização concluída com sucesso'
    });

  } catch (error) {
    console.error('[Celeiro] Sync error:', error);
    onError?.(error.message);
  } finally {
    currentSync = null;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Celeiro] Background received:', request.action);

  if (request.action === 'startSync') {
    // Get the popup's response port
    const { tabId, month, year, apiUrl, token } = request;

    // Perform sync asynchronously
    performFullSync({
      tabId,
      month,
      year,
      apiUrl,
      token,
      onProgress: (message, percent) => {
        chrome.runtime.sendMessage({
          type: 'syncProgress',
          message,
          percent
        }).catch(() => {});
      },
      onComplete: (result) => {
        chrome.runtime.sendMessage({
          type: 'syncComplete',
          result
        }).catch(() => {});
      },
      onError: (error) => {
        chrome.runtime.sendMessage({
          type: 'syncError',
          error
        }).catch(() => {});
      }
    });

    sendResponse({ started: true });
    return true;
  }

  if (request.action === 'getSyncStatus') {
    sendResponse({ sync: currentSync });
    return true;
  }

  if (request.action === 'cancelSync') {
    currentSync = null;
    sendResponse({ cancelled: true });
    return true;
  }

  sendResponse({ error: 'Unknown action' });
  return true;
});

// Handle tab updates (for detecting when Amazon pages load)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('amazon.com') && tab.url.includes('your-orders')) {
      console.log('[Celeiro] Amazon orders page loaded:', tab.url);
    }
  }
});

console.log('[Celeiro] Background service worker ready');
