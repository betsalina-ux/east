'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useDerivWS, getAuthInfo } from '@deriv/core';
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
    let cancelled = false;

    async function authorizeSocket() {
      setIsAuthorized(false);

      if (!ws || !isConnected || auth.authState !== 'authenticated') return;

      const authInfo = getAuthInfo() as any;

      const token =
        authInfo?.access_token ||
        authInfo?.token ||
        authInfo?.oauth_token ||
        authInfo?.accounts?.[0]?.token;

      if (!token) {
        console.error('Authorize failed: token missing from getAuthInfo()', authInfo);
        return;
      }

      try {
        const response = await ws.send({
          authorize: token,
        });

        if (!cancelled) {
          console.log('Authorize success:', response);
          setIsAuthorized(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Authorize failed:', err);
          setIsAuthorized(false);
        }
      }
    }

    authorizeSocket();

    return () => {
      cancelled = true;
    };
  }, [ws, isConnected, auth.authState, auth.activeAccountId]);

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
