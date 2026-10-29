export interface FieldError {
  field: string;
  message: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Notifications list only. */
  unread?: number;
}

export interface Envelope<T> {
  success: true;
  message: string;
  data: T;
  meta: PageMeta | null;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code: string;
  errors?: FieldError[];
  requestId?: string;
}

export interface ApiResult<T> {
  data: T;
  meta: PageMeta | null;
  message: string;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}
