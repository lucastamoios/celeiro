export interface Category {
  category_id: number;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}
