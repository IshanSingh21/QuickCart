export interface RedirectLocationState {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
  sessionExpired?: boolean;
}

export function resolvePostAuthRedirect(state: unknown): string {
  const typedState = state as RedirectLocationState | null | undefined;
  const from = typedState?.from;

  if (!from?.pathname) {
    return '/';
  }

  // Never redirect back onto authentication screens
  if (from.pathname === '/login' || from.pathname === '/register') {
    return '/';
  }

  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
}
