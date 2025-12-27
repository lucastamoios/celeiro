export interface Transaction {
  transaction_id: number;
  account_id: number;
  category_id: number | null;
  description: string;
  original_description: string | null; // Immutable OFX description for pattern matching
  amount: string;
  transaction_date: string;
  transaction_type: 'debit' | 'credit';
  ofx_fitid: string | null;
  ofx_check_number: string | null;
  ofx_memo: string | null;
  raw_ofx_data: string | null;
  is_classified: boolean;
  classification_rule_id: number | null;
  is_ignored: boolean;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
}
