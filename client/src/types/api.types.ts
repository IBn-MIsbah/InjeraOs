export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiErrorDetail {
  field?: string
  message: string
  code?: string
}

export interface ApiErrorResponse {
  success: false
  error?: string
  message?: string
  code?: string
  details?: ApiErrorDetail[]
  statusCode?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}
