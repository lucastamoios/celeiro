export interface Category {
  CategoryID: number;
  Name: string;
  Icon: string;
  IsSystem: boolean;
  UserID: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}
