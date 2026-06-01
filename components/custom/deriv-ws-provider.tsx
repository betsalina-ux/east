'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useDerivWS } from '@deriv/core';
import { useAuth } from '@/hooks/use-auth';
import type { DerivWS } from '@deriv/core';
import type { UseAuthReturn } from '@/hooks/use-auth';

interface DerivWSContextValue {
  ws: DerivWS | null;
  isConnected: boolean;
  isExhausted: boolean;
  isAuthorized: boolean;
  auth: UseAuthReturn;
}

const DerivWSContext = createContext<DerivWSContextValue | null>(null);

export function DerivWSProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const { ws, isConnected, isExhausted } = useDerivWS({
    url: auth.wsUrl,
    accountId: auth.activeAccountId ?? undefined,
  });

  useEffect(() => {
    // IMPORTANT:
    // auth.wsUrl is already an authenticated Deriv OTP WebSocket URL.
    // Do NOT send { authorize: token } on this connection. The Options WS rejects
    // that request with: "Input validation failed: authorize".
    const ready =
      auth.authState === 'authenticated' &&
      !!auth.wsUrl &&
      !!auth.activeAccountId &&
      !!ws &&
      isConnected;

    setIsAuthorized(ready);
  }, [auth.authState, auth.wsUrl, auth.activeAccountId, ws, isConnected]);

  return (
    <DerivWSContext.Provider value={{ ws, isConnected, isExhausted, isAuthorized, auth }}>
      {children}
    </DerivWSContext.Provider>
  );
}

export function useDerivWSContext(): DerivWSContextValue {
  const ctx = useContext(DerivWSContext);

  if (!ctx) {
    throw new Error('useDerivWSContext must be used within a DerivWSProvider');
  }

  return ctx;
}
