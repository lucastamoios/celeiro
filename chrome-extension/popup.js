// Celeiro Amazon Sync - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const settings = await chrome.storage.local.get(['apiUrl', 'token', 'userEmail', 'month', 'year']);

  // DOM Elements - Auth
  const loginSection = document.getElementById('loginSection');
  const userInfoSection = document.getElementById('userInfoSection');
  const configSection = document.getElementById('configSection');
  const syncSection = document.getElementById('syncSection');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userEmailSpan = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  // DOM Elements - Config & Sync
  const apiUrlInput = document.getElementById('apiUrl');
  const monthSelect = document.getElementById('month');
  const yearInput = document.getElementById('year');
  const syncBtn = document.getElementById('syncBtn');
  const openAmazonBtn = document.getElementById('openAmazonBtn');
  const statusDiv = document.getElementById('status');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const resultsSection = document.getElementById('resultsSection');
  const ordersFoundSpan = document.getElementById('ordersFound');
  const transactionsMatchedSpan = document.getElementById('transactionsMatched');

  // Set default values
  const currentDate = new Date();
  apiUrlInput.value = settings.apiUrl || 'http://localhost:8080';
  monthSelect.value = settings.month || currentDate.getMonth() + 1;
  yearInput.value = settings.year || currentDate.getFullYear();

  // Check if user is authenticated
  const updateAuthUI = () => {
    const isAuthenticated = settings.token && settings.userEmail;

    if (isAuthenticated) {
      loginSection.classList.add('hidden');
      userInfoSection.classList.remove('hidden');
      configSection.classList.remove('hidden');
      syncSection.classList.remove('hidden');
      openAmazonBtn.classList.remove('hidden');

      userEmailSpan.textContent = settings.userEmail;
      userAvatar.textContent = settings.userEmail.charAt(0).toUpperCase();
    } else {
      loginSection.classList.remove('hidden');
      userInfoSection.classList.add('hidden');
      configSection.classList.add('hidden');
      syncSection.classList.add('hidden');
      openAmazonBtn.classList.add('hidden');
    }
  };

  updateAuthUI();

  // Save settings on change
  const saveSettings = () => {
    chrome.storage.local.set({
      apiUrl: apiUrlInput.value,
      month: monthSelect.value,
      year: yearInput.value
    });
  };

  apiUrlInput.addEventListener('change', saveSettings);
  monthSelect.addEventListener('change', saveSettings);
  yearInput.addEventListener('change', saveSettings);

  // Status display helper
  const showStatus = (message, type = 'info') => {
    statusDiv.textContent = message;
    statusDiv.className = `status show ${type}`;
  };

  const hideStatus = () => {
    statusDiv.className = 'status';
  };

  // Progress display helper
  const showProgress = (percent, text) => {
    progressContainer.classList.add('show');
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
  };

  const hideProgress = () => {
    progressContainer.classList.remove('show');
  };

  // Google OAuth Login using Chrome's native identity API
  googleLoginBtn.addEventListener('click', async () => {
    try {
      googleLoginBtn.disabled = true;
      showStatus('Conectando com Google...', 'info');

      // Use Chrome's native getAuthToken for Google OAuth
      // This is the recommended approach for Google OAuth in Chrome extensions
      const accessToken = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(token);
          }
        });
      });

      console.log('[Celeiro] Got access token via getAuthToken');

      if (!accessToken) {
        throw new Error('No access token received from Google');
      }

      console.log('[Celeiro] Got access token, authenticating with backend...');
      showStatus('Autenticando...', 'info');

      // Send access token to our backend
      const apiUrl = apiUrlInput.value.trim();
      const response = await fetch(`${apiUrl}/auth/google/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_token: accessToken })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend auth failed: ${response.status} - ${errorText}`);
      }

      const authData = await response.json();
      console.log('[Celeiro] Backend auth response:', authData);

      // Save the session token and user info
      const sessionToken = authData.data.session_token;
      const userEmail = authData.data.session_info.user.email;

      settings.token = sessionToken;
      settings.userEmail = userEmail;

      await chrome.storage.local.set({
        token: sessionToken,
        userEmail: userEmail
      });

      showStatus('Login realizado com sucesso!', 'success');
      updateAuthUI();

      setTimeout(hideStatus, 2000);

    } catch (error) {
      console.error('[Celeiro] OAuth error:', error);
      showStatus(`Erro: ${error.message}`, 'error');
    } finally {
      googleLoginBtn.disabled = false;
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    // First, revoke the Google token if we have one cached
    try {
      const token = await new Promise((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          resolve(token);
        });
      });

      if (token) {
        // Remove the cached token from Chrome
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token }, resolve);
        });
        console.log('[Celeiro] Removed cached Google auth token');
      }
    } catch (e) {
      console.log('[Celeiro] No cached token to remove');
    }

    settings.token = null;
    settings.userEmail = null;

    await chrome.storage.local.remove(['token', 'userEmail']);

    showStatus('Logout realizado', 'info');
    updateAuthUI();

    setTimeout(hideStatus, 2000);
  });

  // Open Amazon orders page
  openAmazonBtn.addEventListener('click', async () => {
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearInput.value);

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Format dates for Amazon URL (YYYY-MM-DD)
    const formatDate = (d) => d.toISOString().split('T')[0];

    // Amazon orders URL with date filter
    const url = `https://www.amazon.com.br/your-orders/orders?timeFilter=year-${year}&startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`;

    chrome.tabs.create({ url });
  });

  // Sync orders
  syncBtn.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value.trim();
    const token = settings.token;
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearInput.value);

    if (!apiUrl) {
      showStatus('Por favor, configure a URL da API', 'error');
      return;
    }

    if (!token) {
      showStatus('Por favor, faça login primeiro', 'error');
      return;
    }

    saveSettings();

    try {
      syncBtn.disabled = true;
      hideStatus();
      resultsSection.style.display = 'none';
      showProgress(0, 'Buscando aba da Amazon...');

      // Find active Amazon tab
      const tabs = await chrome.tabs.query({
        url: ['https://www.amazon.com.br/*', 'https://www.amazon.com/*'],
        active: true,
        currentWindow: true
      });

      let amazonTab = tabs[0];

      if (!amazonTab) {
        // Try to find any Amazon tab
        const allAmazonTabs = await chrome.tabs.query({
          url: ['https://www.amazon.com.br/*', 'https://www.amazon.com/*']
        });

        if (allAmazonTabs.length > 0) {
          amazonTab = allAmazonTabs[0];
          await chrome.tabs.update(amazonTab.id, { active: true });
        } else {
          showStatus('Abra a página de pedidos da Amazon primeiro', 'warning');
          showProgress(0, '');
          hideProgress();
          syncBtn.disabled = false;
          return;
        }
      }

      showProgress(10, 'Navegando para pedidos...');
      console.log('[Celeiro] Starting sync for month:', month, 'year:', year);

      // Navigate to orders page for the selected month
      const ordersUrl = `https://www.amazon.com.br/your-orders/orders?timeFilter=year-${year}`;
      console.log('[Celeiro] Navigating to:', ordersUrl);
      await chrome.tabs.update(amazonTab.id, { url: ordersUrl });

      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      showProgress(20, 'Extraindo pedidos...');
      console.log('[Celeiro] Starting order extraction...');

      // Pagination: extract orders from all pages until we reach orders from previous month + 1 extra page
      let allOrders = [];
      let pageNum = 1;
      let hasMorePages = true;
      let pastMonthDetectedOnPage = 0; // Track which page we first detected past month

      while (hasMorePages) {
        showProgress(20 + (pageNum * 5), `Extraindo página ${pageNum}...`);

        // Execute content script to extract orders
        const results = await chrome.scripting.executeScript({
          target: { tabId: amazonTab.id },
          func: extractOrders,
          args: [month, year]
        });

        const pageOrders = results[0]?.result || [];
        console.log(`[Celeiro] Page ${pageNum}: found ${pageOrders.length} orders`);

        // Filter orders for the target month and check if we've passed it
        for (const order of pageOrders) {
          if (order.parsed_date) {
            const orderMonth = order.parsed_date.month;
            const orderYear = order.parsed_date.year;

            // If order is from an earlier month/year, we've gone past our target
            if (orderYear < year || (orderYear === year && orderMonth < month)) {
              if (pastMonthDetectedOnPage === 0) {
                pastMonthDetectedOnPage = pageNum;
                console.log(`[Celeiro] Reached orders before target month (${orderMonth}/${orderYear}) on page ${pageNum}, will fetch one more page`);
              }
              // Don't break - continue processing this page and fetch one more
            }

            // Only include orders from the target month
            if (orderMonth === month && orderYear === year) {
              allOrders.push(order);
            }
          } else {
            // If no parsed date, include it anyway (will be filtered by backend)
            allOrders.push(order);
          }
        }

        // If we detected past month on a previous page, this was the extra page - stop now
        if (pastMonthDetectedOnPage > 0 && pageNum > pastMonthDetectedOnPage) {
          console.log(`[Celeiro] Finished extra page (page ${pageNum}) after detecting past month on page ${pastMonthDetectedOnPage}, stopping`);
          break;
        }

        // Try to find and click the "Next" pagination button
        const paginationResult = await chrome.scripting.executeScript({
          target: { tabId: amazonTab.id },
          func: () => {
            // Look for next page button
            const nextBtn = document.querySelector('.a-pagination .a-last:not(.a-disabled) a') ||
                           document.querySelector('[aria-label="Ir para a próxima página"]') ||
                           document.querySelector('.a-pagination li:last-child:not(.a-disabled) a');

            if (nextBtn) {
              nextBtn.click();
              return true;
            }
            return false;
          }
        });

        hasMorePages = paginationResult[0]?.result === true;

        if (hasMorePages) {
          pageNum++;
          // Wait for next page to load
          await new Promise(resolve => setTimeout(resolve, 2500));
        }

        // Safety limit to prevent infinite loops
        if (pageNum > 20) {
          console.log('[Celeiro] Reached maximum page limit (20)');
          break;
        }
      }

      const orders = allOrders;
      console.log('[Celeiro] Total orders extracted:', orders.length);
      console.log('[Celeiro] Orders data:', JSON.stringify(orders.slice(0, 2), null, 2)); // Log first 2 orders
      showProgress(60, `${orders.length} pedidos encontrados. Enviando...`);

      if (orders.length === 0) {
        console.log('[Celeiro] No orders found, aborting');
        showStatus('Nenhum pedido encontrado para este mês', 'warning');
        hideProgress();
        syncBtn.disabled = false;
        return;
      }

      // Send to Celeiro API
      showProgress(70, 'Enviando para Celeiro...');
      console.log('[Celeiro] Sending to API:', apiUrl + '/financial/amazon/sync');

      const response = await fetch(`${apiUrl}/financial/amazon/sync`, {
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

      console.log('[Celeiro] API response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Celeiro] API error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[Celeiro] API response data:', data);

      // Log matched and unmatched orders for debugging
      if (data.data?.matched_orders?.length > 0) {
        console.log('[Celeiro] ✅ MATCHED ORDERS:');
        data.data.matched_orders.forEach((m, i) => {
          console.log(`  ${i+1}. Order ${m.order_id}: R$ ${m.order_amount} → TX #${m.transaction_id} (${m.new_description})`);
        });
      }
      if (data.data?.unmatched_orders?.length > 0) {
        console.log('[Celeiro] ❌ UNMATCHED ORDERS:');
        data.data.unmatched_orders.forEach((u, i) => {
          console.log(`  ${i+1}. Order ${u.order_id}: R$ ${u.amount} on ${u.date} - Reason: ${u.reason}`);
          console.log(`     Items: ${u.description}`);
        });
      }

      showProgress(100, 'Concluído!');
      showStatus('Sincronização concluída com sucesso!', 'success');

      // Show results
      resultsSection.style.display = 'block';
      ordersFoundSpan.textContent = orders.length;
      transactionsMatchedSpan.textContent = data.data?.matched_count || 0;

      setTimeout(hideProgress, 2000);

    } catch (error) {
      console.error('Sync error:', error);
      showStatus(`Erro: ${error.message}`, 'error');
      hideProgress();
    } finally {
      syncBtn.disabled = false;
    }
  });
});

// This function is injected into the Amazon page to extract order data
// Note: Helper functions must be defined INSIDE this function because it's injected into the page
function extractOrders(targetMonth, targetYear) {
  // Helper function to parse Brazilian Portuguese month names
  function parsePortugueseMonth(monthName) {
    const months = {
      'janeiro': 1, 'fevereiro': 2, 'março': 3, 'marco': 3, 'abril': 4,
      'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
      'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
    };
    return months[monthName.toLowerCase()] || null;
  }

  // Helper function to parse Brazilian date format "DD de MÊS de YYYY"
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

  // Helper function to parse Brazilian currency "R$ 1.234,56"
  function parseBrazilianCurrency(currencyText) {
    if (!currencyText) return null;
    const match = currencyText.match(/R\$\s*([\d.,]+)/);
    if (match) {
      // Brazilian format: 1.234,56 -> remove dots, replace comma with dot
      const normalized = match[1].replace(/\./g, '').replace(',', '.');
      return parseFloat(normalized);
    }
    return null;
  }

  const orders = [];

  // Find all order cards on the page
  const orderCards = document.querySelectorAll('.order-card, .order, [data-testid="order-card"], .a-box-group.order');

  console.log(`Found ${orderCards.length} order cards on page`);

  orderCards.forEach((card, index) => {
    try {
      // Extract order date
      let dateText = '';
      const dateSelectors = [
        '.order-info .value',
        '.a-column.a-span3 .value',
        '[data-testid="order-date"]',
        '.order-date',
        '.a-color-secondary'
      ];

      for (const selector of dateSelectors) {
        const dateEl = card.querySelector(selector);
        if (dateEl) {
          const text = dateEl.textContent.trim();
          // Check if it looks like a date
          if (text.match(/\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/i)) {
            dateText = text;
            break;
          }
        }
      }

      // Try to find date in format "DD de MÊS de YYYY" in card text
      if (!dateText) {
        const allText = card.textContent;
        const dateMatch = allText.match(/(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i);
        if (dateMatch) {
          dateText = dateMatch[0];
        }
      }

      // Parse the date
      const parsedDate = parseBrazilianDate(dateText);

      // Extract order total
      let totalText = '';
      const totalSelectors = [
        '.order-info .value',
        '.a-column.a-span2 .value',
        '[data-testid="order-total"]',
        '.order-total',
        '.grand-total-price'
      ];

      for (const selector of totalSelectors) {
        const totalEls = card.querySelectorAll(selector);
        for (const el of totalEls) {
          const text = el.textContent.trim();
          if (text.includes('R$')) {
            totalText = text;
            break;
          }
        }
        if (totalText) break;
      }

      // Try regex for currency in all card text
      if (!totalText) {
        const allText = card.textContent;
        const currencyMatch = allText.match(/R\$\s*([\d.,]+)/);
        if (currencyMatch) {
          totalText = `R$ ${currencyMatch[1]}`;
        }
      }

      // Parse the total amount
      const parsedTotal = parseBrazilianCurrency(totalText);

      // Extract order ID
      let orderId = '';
      const orderIdSelectors = [
        '.order-info .value',
        '[data-testid="order-id"]',
        '.order-id',
        'a[href*="order-details"]'
      ];

      for (const selector of orderIdSelectors) {
        const el = card.querySelector(selector);
        if (el) {
          const href = el.getAttribute('href');
          if (href && href.includes('orderID=')) {
            const match = href.match(/orderID=([^&]+)/);
            if (match) {
              orderId = match[1];
              break;
            }
          }
          const text = el.textContent.trim();
          if (text.match(/^\d{3}-\d{7}-\d{7}$/)) {
            orderId = text;
            break;
          }
        }
      }

      // Extract items/products
      const items = [];
      const itemSelectors = [
        '.yohtmlc-item a.a-link-normal',
        '.a-fixed-left-grid-inner .a-link-normal',
        '[data-testid="product-title"]',
        '.product-title'
      ];

      for (const selector of itemSelectors) {
        const itemEls = card.querySelectorAll(selector);
        itemEls.forEach(el => {
          const text = el.textContent.trim();
          if (text && text.length > 5 && !text.includes('Ver detalhes')) {
            // Format as object with name and optional url (required by backend)
            items.push({
              name: text,
              url: el.href || null
            });
          }
        });
        if (items.length > 0) break;
      }

      if (dateText || totalText || orderId) {
        orders.push({
          order_id: orderId,
          date: dateText,
          parsed_date: parsedDate,  // {day, month, year, iso} or null
          total: totalText,
          parsed_total: parsedTotal, // float or null
          items: items.slice(0, 5), // Limit to first 5 items
          raw_index: index
        });
      }
    } catch (e) {
      console.error('Error extracting order:', e);
    }
  });

  // Also try to extract from the transactions page if we're there
  const transactionRows = document.querySelectorAll('.apx-transaction-details, .transaction-row, [data-testid="transaction"]');

  transactionRows.forEach((row, index) => {
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
      console.error('Error extracting transaction:', e);
    }
  });

  console.log(`Extracted ${orders.length} orders total`);
  return orders;
}
