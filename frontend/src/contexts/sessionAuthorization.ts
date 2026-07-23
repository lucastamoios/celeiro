export function isSessionAuthorizationFailure(status: number): boolean {
  return status === 401 || status === 403;
}
