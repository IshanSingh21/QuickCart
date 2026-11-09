/**
 * Standard QuickCart Backend API Envelopes
 * Strictly reflects ApiResponse.success and ApiResponse.error implementations.
 */

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
  rule?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: ApiErrorPayload;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
