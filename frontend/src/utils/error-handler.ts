import axios, { AxiosError } from 'axios';
import { ApiErrorResponse } from '../types/api';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Array<{ field: string; message: string; rule?: string }>;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: Array<{ field: string; message: string; rule?: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Type guard for QuickCart standard API error payload
 */
export function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as { success: unknown }).success === false &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'object'
  );
}

/**
 * Extracts the standardized backend error code (e.g., TOKEN_EXPIRED, VALIDATION_ERROR) if present
 */
export function getApiErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const responseData = (error as AxiosError<ApiErrorResponse>).response?.data;
    if (responseData && isApiErrorResponse(responseData)) {
      return responseData.error.code;
    }
  }
  return null;
}

/**
 * Maps backend Zod validation error details (e.g. "body.email") to form field names (e.g. "email")
 */
export function getFieldValidationErrors(error: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!axios.isAxiosError(error)) {
    return fieldErrors;
  }

  const responseData = (error as AxiosError<ApiErrorResponse>).response?.data;
  if (!responseData || !isApiErrorResponse(responseData) || !responseData.error.details) {
    return fieldErrors;
  }

  for (const detail of responseData.error.details) {
    const cleanField = detail.field.replace(/^(body|query|params)\./, '');
    if (cleanField && !fieldErrors[cleanField]) {
      fieldErrors[cleanField] = detail.message;
    }
  }

  return fieldErrors;
}

/**
 * Extracts a human-friendly error message from any caught exception
 */
export function formatErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const responseData = axiosError.response?.data;

    if (responseData && isApiErrorResponse(responseData)) {
      if (responseData.error.details && responseData.error.details.length > 0) {
        return `${responseData.error.message}: ${responseData.error.details[0].message}`;
      }
      return responseData.error.message;
    }

    if (axiosError.response?.status === 429) {
      return 'Too many requests. Please wait a few moments before trying again.';
    }

    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      return 'Request timed out. Please check your network connection.';
    }

    if (!axiosError.response) {
      return 'Cannot connect to QuickCart backend server. Please ensure the backend is running.';
    }

    return axiosError.message || 'An unexpected network error occurred.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
