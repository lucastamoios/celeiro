export interface Tag {
  tag_id: number;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagRequest {
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateTagRequest {
  name?: string;
  icon?: string;
  color?: string;
}
