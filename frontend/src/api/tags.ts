import type { Tag, CreateTagRequest, UpdateTagRequest } from '../types/tag';
import type { ApiResponse } from '../types/transaction';
import { API_CONFIG } from '../config/api';

interface RequestOptions {
  token: string;
  organizationId?: string;
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
 * Get all tags for the current user
 */
export async function getTags(options: RequestOptions): Promise<Tag[]> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/tags`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao buscar tags: ${error}`);
  }

  const result: ApiResponse<Tag[]> = await response.json();
  return result.data;
}

/**
 * Create a new tag
 */
export async function createTag(
  data: CreateTagRequest,
  options: RequestOptions
): Promise<Tag> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/tags`,
    {
      method: 'POST',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao criar tag: ${error}`);
  }

  const result: ApiResponse<Tag> = await response.json();
  return result.data;
}

/**
 * Update an existing tag
 */
export async function updateTag(
  tagId: number,
  data: UpdateTagRequest,
  options: RequestOptions
): Promise<Tag> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/tags/${tagId}`,
    {
      method: 'PATCH',
      headers: createHeaders(options),
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao atualizar tag: ${error}`);
  }

  const result: ApiResponse<Tag> = await response.json();
  return result.data;
}

/**
 * Delete a tag
 */
export async function deleteTag(
  tagId: number,
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/tags/${tagId}`,
    {
      method: 'DELETE',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao excluir tag: ${error}`);
  }
}

/**
 * Get tags for a specific transaction
 */
export async function getTransactionTags(
  transactionId: number,
  options: RequestOptions
): Promise<Tag[]> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/transactions/${transactionId}/tags`,
    {
      method: 'GET',
      headers: createHeaders(options),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao buscar tags da transacao: ${error}`);
  }

  const result: ApiResponse<Tag[]> = await response.json();
  return result.data;
}

/**
 * Set tags for a transaction (replaces all existing tags)
 */
export async function setTransactionTags(
  transactionId: number,
  tagIds: number[],
  options: RequestOptions
): Promise<void> {
  const response = await fetch(
    `${API_CONFIG.baseURL}/financial/transactions/${transactionId}/tags`,
    {
      method: 'PUT',
      headers: createHeaders(options),
      body: JSON.stringify({ tag_ids: tagIds }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao atualizar tags da transacao: ${error}`);
  }
}
