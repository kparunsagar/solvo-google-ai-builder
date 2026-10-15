import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
  meta?: Record<string, any>;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export function sendSuccess<T = any>(
  res: Response,
  data: T,
  status = 200,
  pagination?: PaginationMeta,
  meta?: Record<string, any>
): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(pagination ? { pagination } : {}),
    ...(meta ? { meta } : {})
  };
  return res.status(status).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: any
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {})
    }
  };
  return res.status(status).json(body);
}

export function paginate<T>(items: T[], pageInput: any = 1, limitInput: any = 20): {
  data: T[];
  pagination: PaginationMeta;
} {
  const page = Math.max(1, parseInt(pageInput as string, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(limitInput as string, 10) || 20));
  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
}
