import { useCallback, useState } from 'react';
import { Link2, XCircle } from 'lucide-react';
import { PluggyConnect } from 'react-pluggy-connect';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { financialUrl } from '../config/api';
import type { ApiResponse } from '../types/transaction';
import { formatDateBR } from '../utils/date';

interface PluggyConnectTokenResponse {
  accessToken: string;
}

interface PluggyItemPayload {
  item: {
    id: string;
    [key: string]: unknown;
  };
}

interface PluggyAccount {
  id: string;
  name?: string;
  type?: string;
  subtype?: string;
  balance?: number;
  currencyCode?: string;
}

interface PluggyTransactionPreview {
  id: string;
  description?: string;
  amount?: number;
  date?: string;
  type?: string;
  status?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getNestedValue = (source: unknown, path: string[]): unknown => {
  let current: unknown = source;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
};

const getNestedString = (source: unknown, path: string[]): string | undefined => {
  const value = getNestedValue(source, path);
  return typeof value === 'string' ? value : undefined;
};

const getNestedNumber = (source: unknown, path: string[]): number | undefined => {
  const value = getNestedValue(source, path);
  return typeof value === 'number' ? value : undefined;
};

const extractPluggyResults = (payload: unknown): Record<string, unknown>[] => {
  const candidates = [
    getNestedValue(payload, ['data', 'results']),
    getNestedValue(payload, ['data']),
    getNestedValue(payload, ['results']),
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
};

export default function PluggyConnectionCard() {
  const { token } = useAuth();
  const { activeOrganization } = useOrganization();
  const activeOrganizationId = activeOrganization?.organization_id?.toString() || '1';

  const [pluggyConnectToken, setPluggyConnectToken] = useState<string | null>(null);
  const [isPluggyOpen, setIsPluggyOpen] = useState(false);
  const [pluggyLoading, setPluggyLoading] = useState(false);
  const [pluggyPreviewLoading, setPluggyPreviewLoading] = useState(false);
  const [pluggyItemId, setPluggyItemId] = useState<string | null>(null);
  const [pluggyAccountsPreview, setPluggyAccountsPreview] = useState<PluggyAccount[]>([]);
  const [pluggyTransactionsPreview, setPluggyTransactionsPreview] = useState<PluggyTransactionPreview[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const readErrorMessage = async (response: Response, fallback: string) => {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const maybeJson = await response.json().catch(() => null);
      if (typeof maybeJson?.message === 'string' && maybeJson.message.trim() !== '') {
        return maybeJson.message;
      }
    }

    const maybeText = await response.text().catch(() => '');
    if (maybeText.trim() !== '') {
      return maybeText.trim();
    }

    return fallback;
  };

  const formatPluggyCurrency = (amount?: number, currencyCode = 'BRL') => {
    if (typeof amount !== 'number') {
      return 'Saldo indisponivel';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const formatPluggyDate = (value?: string) => {
    if (!value) {
      return 'Data indisponivel';
    }

    return formatDateBR(value);
  };

  const handleOpenPluggy = useCallback(async () => {
    if (!token) return;

    try {
      setPluggyLoading(true);
      setActionError(null);
      setSuccessMessage(null);

      const response = await fetch(financialUrl('integrations/pluggy/connect-token'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Active-Organization': activeOrganizationId,
        },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Falha ao criar token do Pluggy'));
      }

      const result: ApiResponse<PluggyConnectTokenResponse> = await response.json();
      const accessToken = result.data?.accessToken;
      if (!accessToken) {
        throw new Error('Resposta do Pluggy sem accessToken');
      }

      setPluggyConnectToken(accessToken);
      setIsPluggyOpen(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao abrir Pluggy Connect');
    } finally {
      setPluggyLoading(false);
    }
  }, [activeOrganizationId, token]);

  const handlePluggySuccess = useCallback(async (payload: PluggyItemPayload) => {
    if (!token) return;

    const itemId = payload?.item?.id;
    setIsPluggyOpen(false);
    setPluggyConnectToken(null);

    if (!itemId) {
      setActionError('Pluggy conectou a conta, mas nao retornou o item.');
      return;
    }

    try {
      setPluggyPreviewLoading(true);
      setActionError(null);
      setPluggyItemId(itemId);

      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-Active-Organization': activeOrganizationId,
      };

      const accountsResponse = await fetch(
        financialUrl(`integrations/pluggy/items/${itemId}/accounts`),
        { headers },
      );
      if (!accountsResponse.ok) {
        throw new Error(await readErrorMessage(accountsResponse, 'Falha ao buscar contas conectadas'));
      }

      const accountsPayload = await accountsResponse.json().catch(() => null);
      const accounts = extractPluggyResults(accountsPayload).map((account) => ({
        id: getNestedString(account, ['id']) || '',
        name: getNestedString(account, ['name']) || getNestedString(account, ['marketingName']),
        type: getNestedString(account, ['type']),
        subtype: getNestedString(account, ['subtype']),
        balance: getNestedNumber(account, ['balance']),
        currencyCode: getNestedString(account, ['currencyCode']) || 'BRL',
      })).filter((account) => account.id);

      setPluggyAccountsPreview(accounts);

      const firstAccountId = accounts[0]?.id;
      if (!firstAccountId) {
        setSuccessMessage('Conta conectada via Pluggy, mas nenhuma conta bancaria foi retornada.');
        return;
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const from = monthStart.toISOString().slice(0, 10);
      const to = monthEnd.toISOString().slice(0, 10);

      const transactionsResponse = await fetch(
        `${financialUrl(`integrations/pluggy/accounts/${firstAccountId}/transactions`)}?from=${from}&to=${to}`,
        { headers },
      );
      if (!transactionsResponse.ok) {
        throw new Error(await readErrorMessage(transactionsResponse, 'Falha ao buscar transacoes da conta conectada'));
      }

      const transactionsPayload = await transactionsResponse.json().catch(() => null);
      const previewTransactions = extractPluggyResults(transactionsPayload).map((transaction) => ({
        id: getNestedString(transaction, ['id']) || '',
        description: getNestedString(transaction, ['description']) || getNestedString(transaction, ['merchant', 'name']),
        amount: getNestedNumber(transaction, ['amount']),
        date: getNestedString(transaction, ['date']),
        type: getNestedString(transaction, ['type']),
        status: getNestedString(transaction, ['status']),
      })).filter((transaction) => transaction.id);

      setPluggyTransactionsPreview(previewTransactions);
      setSuccessMessage(`Conta conectada via Pluggy. ${accounts.length} conta(s) encontrada(s).`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Falha ao carregar dados da conta conectada');
      setPluggyAccountsPreview([]);
      setPluggyTransactionsPreview([]);
    } finally {
      setPluggyPreviewLoading(false);
    }
  }, [activeOrganizationId, token]);

  return (
    <div className="bg-stone-50 rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden">
      <div className="p-6 border-b border-stone-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-stone-900">Open Finance</h2>
            <p className="text-sm text-stone-500 mt-1">
              Conecte sua conta bancaria pelo Pluggy para validar a integracao.
            </p>
          </div>

          <button
            onClick={handleOpenPluggy}
            disabled={pluggyLoading}
            className="btn-secondary text-sm self-start"
          >
            <Link2 className="w-4 h-4" />
            {pluggyLoading ? 'Abrindo Pluggy...' : 'Conectar Banco'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {successMessage && (
          <div className="p-3 bg-sage-50 border border-sage-200 text-sage-700 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {actionError && (
          <div className="p-3 bg-rust-50 border border-rust-200 text-rust-700 rounded-lg text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {actionError}
          </div>
        )}

        {(pluggyPreviewLoading || pluggyItemId || pluggyAccountsPreview.length > 0) && (
          <div className="border border-wheat-200 bg-wheat-50/60 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-stone-900">Conexao concluida</h3>
                <p className="text-sm text-stone-600">
                  {pluggyPreviewLoading
                    ? 'Carregando contas e transacoes da conexao recente.'
                    : 'Preview temporario da conexao concluida.'}
                </p>
              </div>
              {pluggyItemId && (
                <span className="inline-flex items-center self-start rounded-full bg-stone-100 text-stone-700 px-3 py-1 text-xs font-medium">
                  item {pluggyItemId}
                </span>
              )}
            </div>

            {pluggyAccountsPreview.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide text-stone-500 mb-2">Contas encontradas</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pluggyAccountsPreview.map((account) => (
                    <div key={account.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-stone-900">{account.name || 'Conta sem nome'}</div>
                          <div className="text-sm text-stone-500">
                            {[account.type, account.subtype].filter(Boolean).join(' • ') || 'Tipo indisponivel'}
                          </div>
                        </div>
                        <div className="text-right text-sm font-medium text-stone-700">
                          {formatPluggyCurrency(account.balance, account.currencyCode)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wide text-stone-500 mb-2">Transacoes da primeira conta</div>
              {pluggyTransactionsPreview.length > 0 ? (
                <div className="space-y-2">
                  {pluggyTransactionsPreview.slice(0, 8).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-stone-900 truncate">
                          {transaction.description || 'Transacao sem descricao'}
                        </div>
                        <div className="text-xs text-stone-500">
                          {[formatPluggyDate(transaction.date), transaction.status].filter(Boolean).join(' • ')}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold whitespace-nowrap ${
                        transaction.type === 'CREDIT' ? 'text-sage-600' : 'text-rust-600'
                      }`}>
                        {formatPluggyCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-sm text-stone-500">
                  {pluggyPreviewLoading
                    ? 'Buscando transacoes...'
                    : 'Nenhuma transacao encontrada para a primeira conta no periodo atual.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isPluggyOpen && pluggyConnectToken && (
        <PluggyConnect
          connectToken={pluggyConnectToken}
          includeSandbox
          onClose={() => setIsPluggyOpen(false)}
          onSuccess={handlePluggySuccess}
          onError={() => {
            setActionError('Falha ao conectar conta via Pluggy');
            setIsPluggyOpen(false);
          }}
        />
      )}
    </div>
  );
}
