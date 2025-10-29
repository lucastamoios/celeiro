export type APIResponse<T> = {
  message: string
  code: string
  status: number
  error: Error
  data?: T
}
