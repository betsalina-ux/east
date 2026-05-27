'use client';

import { createContext, useContext, useEffect } from 'react';
import { useDerivWS, getAuthInfo } from '@deriv/core';
import { useAuth } from '@/hooks/use-auth';
import type { DerivWS } from '@deriv/core';
import type { UseAuthReturn } from '@/hooks/use-auth';

interface DerivWSContextValue {
  ws: DerivWS | null;
  isConnected: boolean;
  isExhausted: boolean;
  auth: UseAuthReturn;
}

const DerivWSContext = createContext<DerivWSContextValue | null>(null);

export function DerivWSProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  const { ws, isConnected, isExhausted } = useDerivWS({
    accountId: auth.activeAccountId ?? undefined,
  });

  useEffect(() => {
    if (!ws || !isConnected || auth.authState !== 'authenticated') return;

    const authInfo = getAuthInfo();

    if (!authInfo?.access_token) return;

    ws.send({
      authorize: authInfo.access_token,
    }).catch((err) => {
      console.error('Authorize failed:', err);
    });
  }, [ws, isConnected, auth.authState]);

  return (
    <DerivWSContext.Provider value={{ ws, isConnected, isExhausted, auth }}>
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
