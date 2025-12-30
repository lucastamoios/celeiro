import type { Transaction, ApiResponse } from '../types/transaction';
import { API_CONFIG } from '../config/api';

interface RequestOptions {
  token: string;
  organizationId?: string;
}

export interface CreateTransactionRequest {
  description: string;
  amount: number;
  transaction_date: string;
  transaction_type: 'debit' | 'credit';
  category_id?: number;
  notes?: string;
}

/**
 * Helper function to create headers for API requests
 */
function createHeaders(options: RequestOptions): HeadersInit {
  return {
    'Authorization': `Bearer ${options.token}`,
    'X-Active-Organization': options.organizationId || '1',
    'Content-Type': 'application/json',
  };
}

/**
 * Create a new transaction manually
 */
export async function createTransaction(
  accountId: number,
  data: CreateTransactionRequest,
  options: RequestOptions
): Promise<Transaction> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/accounts/${accountId}/transactions`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao criar transação: ${error}`);
  }

  const result: ApiResponse<Transaction> = await response.json();
  return result.data;
}
