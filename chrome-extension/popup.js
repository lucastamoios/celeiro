// Celeiro Amazon Sync - Popup Script
// Thin UI layer: auth, settings, and sync trigger.
// All sync work runs in background.js — popup can close/reopen freely.

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await chrome.storage.local.get(['apiUrl', 'token', 'userEmail', 'emailID']);

  // DOM Elements - Auth
  const loginSection = document.getElementById('loginSection');
  const userInfoSection = document.getElementById('userInfoSection');
  const configSection = document.getElementById('configSection');
  const syncSection = document.getElementById('syncSection');
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const logoutBtn = document.getElementById('logoutBtn');
  const userEmailSpan = document.getElementById('userEmail');
  const userAvatar = document.getElementById('userAvatar');

  // DOM Elements - Gmail forwarding
  const gmailForwardingSection = document.getElementById('gmailForwardingSection');
  const gmailForwardingBtn = document.getElementById('gmailForwardingBtn');
  const forwardingEmail = document.getElementById('forwardingEmail');

  // DOM Elements - Config & Sync
  const apiUrlInput = document.getElementById('apiUrl');
  const monthSelect = document.getElementById('month');
  const yearInput = document.getElementById('year');
  const syncBtn = document.getElementById('syncBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const currentMonthDisplay = document.getElementById('currentMonthDisplay');
  const currentMonthText = document.getElementById('currentMonthText');
  const statusDiv = document.getElementById('status');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const resultsSection = document.getElementById('resultsSection');
  const ordersFoundSpan = document.getElementById('ordersFound');
  const transactionsMatchedSpan = document.getElementById('transactionsMatched');

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Migrate old domains to current API URL
  const oldDomains = ['https://celeiro.catru.tech', 'https://celeiro.laguiar.dev'];
  if (!settings.apiUrl || oldDomains.includes(settings.apiUrl)) {
    settings.apiUrl = 'https://api.celeiro.laguiar.dev';
    await chrome.storage.local.set({ apiUrl: settings.apiUrl });
  }
  apiUrlInput.value = settings.apiUrl || 'https://api.celeiro.laguiar.dev';
  monthSelect.value = currentMonth;
  yearInput.value = currentYear;

  const updateMonthDisplay = () => {
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearInput.value);
    currentMonthText.textContent = `${monthNames[month - 1]} ${year}`;
  };

  let settingsVisible = false;

  // -------------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------------

  const showStatus = (message, type = 'info') => {
    statusDiv.textContent = message;
    statusDiv.className = `status show ${type}`;
  };

  const hideStatus = () => {
    statusDiv.className = 'status';
  };

  const showProgress = (percent, text) => {
    progressContainer.classList.add('show');
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
  };

  const hideProgress = () => {
    progressContainer.classList.remove('show');
  };

  const setSyncing = (syncing) => {
    syncBtn.disabled = syncing;
    if (syncing) {
      syncBtn.textContent = '⏳ Sincronizando...';
    } else {
      syncBtn.textContent = '🛒 Sincronizar Pedidos Amazon';
    }
  };

  // -------------------------------------------------------------------------
  // Auth UI
  // -------------------------------------------------------------------------

  const updateAuthUI = () => {
    const isAuthenticated = settings.token && settings.userEmail;

    if (isAuthenticated) {
      loginSection.classList.add('hidden');
      userInfoSection.classList.remove('hidden');
      configSection.classList.add('hidden');
      syncSection.classList.remove('hidden');
      currentMonthDisplay.classList.remove('hidden');
      gmailForwardingSection.classList.toggle('hidden', !settings.emailID);

      userEmailSpan.textContent = settings.userEmail;
      userAvatar.textContent = settings.userEmail.charAt(0).toUpperCase();
      forwardingEmail.textContent = settings.emailID ? `${settings.emailID}@laguiar.dev` : '-';
      updateMonthDisplay();
    } else {
      loginSection.classList.remove('hidden');
      userInfoSection.classList.add('hidden');
      configSection.classList.add('hidden');
      syncSection.classList.add('hidden');
      currentMonthDisplay.classList.add('hidden');
      gmailForwardingSection.classList.add('hidden');
    }
  };

  if (settings.token && !settings.emailID) {
    try {
      const response = await fetch(`${settings.apiUrl}/accounts/me/`, {
        headers: { 'Authorization': `Bearer ${settings.token}` },
      });
      if (response.ok) {
        const me = await response.json();
        settings.emailID = me.data?.user?.email_id;
        if (settings.emailID) {
          await chrome.storage.local.set({ emailID: settings.emailID });
        }
      }
    } catch (error) {
      console.warn('[Celeiro] Could not refresh email ID:', error);
    }
  }

  updateAuthUI();

  settingsBtn.addEventListener('click', () => {
    settingsVisible = !settingsVisible;
    if (settingsVisible) {
      configSection.classList.remove('hidden');
      settingsBtn.classList.add('active');
    } else {
      configSection.classList.add('hidden');
      settingsBtn.classList.remove('active');
    }
  });

  const saveApiUrl = () => {
    chrome.storage.local.set({ apiUrl: apiUrlInput.value });
  };

  apiUrlInput.addEventListener('change', saveApiUrl);
  monthSelect.addEventListener('change', updateMonthDisplay);
  yearInput.addEventListener('change', updateMonthDisplay);

  // -------------------------------------------------------------------------
  // Login / Logout
  // -------------------------------------------------------------------------

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showStatus('Preencha email e senha', 'error');
      return;
    }

    try {
      loginBtn.disabled = true;
      showStatus('Autenticando...', 'info');

      const apiUrl = apiUrlInput.value.trim();
      const response = await fetch(`${apiUrl}/auth/password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro de autenticação: ${response.status}`);
      }

      const authData = await response.json();
      console.log('[Celeiro] Backend auth response:', authData);

      const sessionToken = authData.data.session_token;
      const userEmail = authData.data.session_info.user.email;
      const emailID = authData.data.session_info.user.email_id;

      settings.token = sessionToken;
      settings.userEmail = userEmail;
      settings.emailID = emailID;

      await chrome.storage.local.set({ token: sessionToken, userEmail, emailID });

      passwordInput.value = '';
      showStatus('Login realizado com sucesso!', 'success');
      updateAuthUI();
      setTimeout(hideStatus, 2000);

    } catch (error) {
      console.error('[Celeiro] Login error:', error);
      showStatus(`Erro: ${error.message}`, 'error');
    } finally {
      loginBtn.disabled = false;
    }
  });

  // -------------------------------------------------------------------------
  // Forgot Password
  // -------------------------------------------------------------------------

  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

  forgotPasswordBtn.addEventListener('click', async () => {
    const emailValue = emailInput.value.trim();
    const email = emailValue || prompt('Digite seu email para receber o link de redefinição:');

    if (!email) return;

    try {
      forgotPasswordBtn.disabled = true;
      showStatus('Enviando link de redefinição...', 'info');

      const apiUrl = apiUrlInput.value.trim();
      await fetch(`${apiUrl}/auth/password/reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Always show the same message regardless of whether email exists
      showStatus('Se este email estiver cadastrado, você receberá um link em breve.', 'success');
      setTimeout(hideStatus, 5000);
    } catch (error) {
      console.error('[Celeiro] Forgot password error:', error);
      showStatus('Erro ao enviar email. Verifique sua conexão.', 'error');
    } finally {
      forgotPasswordBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    settings.token = null;
    settings.userEmail = null;
    settings.emailID = null;
    await chrome.storage.local.remove(['token', 'userEmail', 'emailID', 'forwardingState']);
    showStatus('Logout realizado', 'info');
    updateAuthUI();
    setTimeout(hideStatus, 2000);
  });

  // -------------------------------------------------------------------------
  // Listen for background sync messages
  // -------------------------------------------------------------------------

  function handleSyncMessage(message) {
    if (message.type === 'syncProgress') {
      showProgress(message.percent || 0, message.message);
    }

    if (message.type === 'syncComplete') {
      const r = message.result;
      showProgress(100, 'Concluído!');
      showStatus('Sincronização concluída com sucesso!', 'success');
      resultsSection.style.display = 'block';
      ordersFoundSpan.textContent = r.ordersFound || 0;
      transactionsMatchedSpan.textContent = r.matched || 0;
      setSyncing(false);
      setTimeout(hideProgress, 2000);
    }

    if (message.type === 'syncError') {
      showStatus(`Erro: ${message.error}`, 'error');
      hideProgress();
      setSyncing(false);
    }

    if (message.type === 'forwardingProgress') {
      gmailForwardingBtn.disabled = true;
      showStatus(message.message, 'info');
    }

    if (message.type === 'forwardingComplete') {
      gmailForwardingBtn.disabled = false;
      gmailForwardingBtn.textContent = '✓ Encaminhamento configurado';
      showStatus(message.message || 'Encaminhamento do Gmail configurado!', 'success');
    }

    if (message.type === 'forwardingError') {
      gmailForwardingBtn.disabled = false;
      showStatus(`Erro no Gmail: ${message.error}`, 'error');
    }
  }

  chrome.runtime.onMessage.addListener(handleSyncMessage);

  // -------------------------------------------------------------------------
  // Recover state if popup reopened during a sync
  // -------------------------------------------------------------------------

  const stored = await chrome.storage.local.get(['syncState']);
  if (stored.syncState) {
    const s = stored.syncState;
    if (s.status === 'running') {
      setSyncing(true);
      showProgress(s.percent || 0, s.message || 'Sincronizando...');
    } else if (s.status === 'done' && s.result) {
      resultsSection.style.display = 'block';
      ordersFoundSpan.textContent = s.result.ordersFound || 0;
      transactionsMatchedSpan.textContent = s.result.matched || 0;
      showStatus(s.result.message || 'Sincronização concluída!', 'success');
      // Clear stored state after displaying
      chrome.storage.local.remove(['syncState']);
    } else if (s.status === 'error') {
      showStatus(`Erro: ${s.error}`, 'error');
      chrome.storage.local.remove(['syncState']);
    }
  }

  const forwardingStored = await chrome.storage.local.get(['forwardingState']);
  if (forwardingStored.forwardingState?.status === 'running') {
    gmailForwardingBtn.disabled = true;
    showStatus(forwardingStored.forwardingState.message || 'Configurando Gmail...', 'info');
  } else if (forwardingStored.forwardingState?.status === 'done') {
    gmailForwardingBtn.textContent = '✓ Encaminhamento configurado';
  } else if (forwardingStored.forwardingState?.status === 'error') {
    showStatus(`Erro no Gmail: ${forwardingStored.forwardingState.error}`, 'error');
  }

  // -------------------------------------------------------------------------
  // Gmail forwarding trigger — delegates the full flow to background.js
  // -------------------------------------------------------------------------

  gmailForwardingBtn.addEventListener('click', async () => {
    if (!settings.token || !settings.emailID) {
      showStatus('Faça login novamente para carregar seu email de importação.', 'error');
      return;
    }

    gmailForwardingBtn.disabled = true;
    showStatus('Abrindo as configurações do Gmail...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startGmailForwarding',
        emailID: settings.emailID,
      });
      if (response?.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      gmailForwardingBtn.disabled = false;
      showStatus(`Erro no Gmail: ${error.message}`, 'error');
    }
  });

  // -------------------------------------------------------------------------
  // Sync trigger — delegates everything to background.js
  // -------------------------------------------------------------------------

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

    saveApiUrl();

    try {
      setSyncing(true);
      hideStatus();
      resultsSection.style.display = 'none';
      showProgress(0, 'Buscando aba da Amazon...');

      // Find or create an Amazon tab
      let amazonTab = null;

      const activeTabs = await chrome.tabs.query({
        url: ['https://www.amazon.com.br/*', 'https://www.amazon.com/*'],
        active: true,
        currentWindow: true
      });
      amazonTab = activeTabs[0];

      if (!amazonTab) {
        const allAmazonTabs = await chrome.tabs.query({
          url: ['https://www.amazon.com.br/*', 'https://www.amazon.com/*']
        });

        if (allAmazonTabs.length > 0) {
          amazonTab = allAmazonTabs[0];
          await chrome.tabs.update(amazonTab.id, { active: true });
        } else {
          showProgress(5, 'Abrindo Amazon...');
          const ordersUrl = `https://www.amazon.com.br/your-orders/orders?timeFilter=year-${year}`;
          amazonTab = await chrome.tabs.create({ url: ordersUrl, active: true });
        }
      }

      showProgress(10, 'Iniciando sincronização...');
      console.log('[Celeiro] Delegating sync to background — month:', month, 'year:', year);

      // Fire-and-forget to the background service worker
      chrome.runtime.sendMessage({
        action: 'startSync',
        tabId: amazonTab.id,
        month,
        year,
        apiUrl,
        token
      });

      // Popup can now close — background handles the rest

    } catch (error) {
      console.error('[Celeiro] Error starting sync:', error);
      showStatus(`Erro: ${error.message}`, 'error');
      hideProgress();
      setSyncing(false);
    }
  });
});
