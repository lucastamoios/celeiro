export interface Transaction {
  TransactionID: number;
  AccountID: number;
  CategoryID: number | null;
  Description: string;
  Amount: string;
  TransactionDate: string;
  TransactionType: 'debit' | 'credit';
  OFXFitID: string | null;
  OFXCheckNum: string | null;
  OFXMemo: string | null;
  RawOFXData: string | null;
  IsClassified: boolean;
  ClassificationRuleID: number | null;
  Notes: string | null;
  Tags: string[] | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
}
