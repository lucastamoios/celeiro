export function isSessionAuthorizationFailure(status: number): boolean {
  return status === 401 || status === 403;
}

export function buildSessionBootstrapHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}
