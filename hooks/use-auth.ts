'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  refreshAccessToken,
  fetchAccounts,
  getWebSocketOTP,
  logout as coreLogout,
  getAuthInfo,
  getDerivAccounts,
  getActiveLoginId,
  setActiveLoginId,
  setAccountType,
  clearAllAuthData,
  parseReferralLink,
} from '@deriv/core';

import type {
  AuthInfo,
  DerivAccount,
  AuthState,
  AuthConfig,
} from '@deriv/core';

function getAuthConfig(): AuthConfig {
  const config: AuthConfig = {
    clientId: process.env.NEXT_PUBLIC_DERIV_APP_ID ?? '',
    redirectUri:
      process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI ??
      (typeof window !== 'undefined' ? window.location.origin : ''),
  };

  const scopesEnv = process.env.NEXT_PUBLIC_DERIV_OAUTH_SCOPES ?? 'trade,account_manage';

  config.scopes = scopesEnv
    .split(',')
    .map((s) => s.trim())
    .join(' ');

  const referralLink = process.env.NEXT_PUBLIC_DERIV_REFERRAL_LINK ?? '';

  if (referralLink) {
    const referral = parseReferralLink(referralLink);

    if (referral) {
      config.affiliateToken = referral.affiliateToken;
      config.affiliateTokenParam = referral.affiliateTokenParam;
      config.utmCampaign = referral.utmCampaign;
      config.utmSource = referral.utmSource;
      config.utmMedium = referral.utmMedium;
    }
  }

  return config;
}

function randomString(length = 96): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

  const values = new Uint8Array(length);
  crypto.getRandomValues(values);

  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function readStoredValue(key: string): string | null {
  const raw = localStorage.getItem(key) || sessionStorage.getItem(key);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.value ?? raw;
  } catch {
    return raw;
  }
}

async function startDerivOAuth(
  config: AuthConfig,
  signUp = false
): Promise<void> {
  const state = randomString(32);
  const verifier = randomString(96);

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );

  const challenge = base64Url(digest);

  const storedState = JSON.stringify({
    value: state,
    createdAt: Date.now(),
  });

  const storedVerifier = JSON.stringify({
    value: verifier,
    createdAt: Date.now(),
  });

  localStorage.setItem('oauth_csrf_token', storedState);
  localStorage.setItem('oauth_code_verifier', storedVerifier);
  sessionStorage.setItem('oauth_csrf_token', storedState);
  sessionStorage.setItem('oauth_code_verifier', storedVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes ?? 'trade account_manage',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  if (signUp) {
    params.set('prompt', 'registration');
  }

  window.location.href = `https://auth.deriv.com/oauth2/auth?${params.toString()}`;
}

async function exchangeCodeManually(code: string): Promise<AuthInfo> {
  const config = getAuthConfig();

  const storedState = readStoredValue('oauth_csrf_token');
  const returnedState = new URL(window.location.href).searchParams.get('state');

  if (storedState && returnedState && storedState !== returnedState) {
    throw new Error('OAuth state mismatch');
  }

  const verifier = readStoredValue('oauth_code_verifier');

  if (!verifier) {
    throw new Error('Missing PKCE code verifier');
  }

  const response = await fetch('https://auth.deriv.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_verifier: verifier,
    }),
  });

  const tokenData = await response.json();

  console.log('MarketEye token response:', tokenData);

  if (!response.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
  }

  const authInfo: AuthInfo = {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type ?? 'Bearer',
    expires_in: tokenData.expires_in ?? 3600,
    expires_at:
      tokenData.expires_at ??
      Math.floor(Date.now() / 1000) + (tokenData.expires_in ?? 3600),
    scope: tokenData.scope ?? config.scopes ?? 'trade account_manage',
    refresh_token: tokenData.refresh_token ?? '',
  };

  localStorage.setItem('auth_info', JSON.stringify(authInfo));
  localStorage.removeItem('oauth_csrf_token');
  localStorage.removeItem('oauth_code_verifier');
  sessionStorage.removeItem('oauth_csrf_token');
  sessionStorage.removeItem('oauth_code_verifier');

  return authInfo;
}

export interface UseAuthReturn {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  activeAccountId: string | null;
  wsUrl: string | undefined;
  login: () => Promise<void>;
  signUp: () => Promise<void>;
  logout: () => void;
  switchAccount: (accountId: string) => Promise<void>;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] =
    useState<AuthState>(() =>
      typeof window !== 'undefined' && getAuthInfo()
        ? 'authenticated'
        : 'unauthenticated'
    );

  const [accounts, setAccounts] =
    useState<DerivAccount[]>(() => {
      if (typeof window === 'undefined') return [];
      return getDerivAccounts() ?? [];
    });

  const [activeAccountId, setActiveAccountIdState] =
    useState<string | null>(() => {
      if (typeof window === 'undefined') return null;
      return getActiveLoginId() ?? null;
    });

  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const initRef = useRef(false);
  const activeAccountIdRef = useRef<string | null>(null);
  const tabHiddenAtRef = useRef<number | null>(null);

  const fetchOTPUrl = useCallback(
    async (
      accountId: string,
      authInfo: AuthInfo
    ): Promise<string> => {
      return getWebSocketOTP(
        accountId,
        authInfo,
        getAuthConfig().clientId
      );
    },
    []
  );

  const completeAuth = useCallback(
    async (authInfo: AuthInfo) => {
      try {
        const fetchedAccounts = await fetchAccounts(
          authInfo,
          getAuthConfig().clientId
        );

        setAccounts(fetchedAccounts);
        localStorage.setItem('deriv_accounts', JSON.stringify(fetchedAccounts));

        if (fetchedAccounts.length > 0) {
          const firstAccount = fetchedAccounts[0];

          setActiveLoginId(firstAccount.account_id);
          setActiveAccountIdState(firstAccount.account_id);

          const otpUrl = await fetchOTPUrl(
            firstAccount.account_id,
            authInfo
          );

          setWsUrl(otpUrl);
        }

        setAuthState('authenticated');
        setError(null);
      } catch (err) {
        console.error('completeAuth failed, but token is saved:', err);
        setAuthState('authenticated');
        setError(err instanceof Error ? err.message : 'Account fetch failed');
      }
    },
    [fetchOTPUrl]
  );

  useEffect(() => {
    if (initRef.current) return;

    initRef.current = true;

    const init = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      const oauthError = url.searchParams.get('error');
      const oauthErrorDescription = url.searchParams.get('error_description');

      if (oauthError) {
        setError(oauthErrorDescription || oauthError);
        setAuthState('error');
        return;
      }

      if (code) {
        setAuthState('authenticating');

        try {
          const authInfo = await exchangeCodeManually(code);

          console.log('MarketEye auth success:', authInfo);

          await completeAuth(authInfo);

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } catch (err) {
          console.error('MarketEye auth failed:', err);

          setError(
            err instanceof Error
              ? err.message
              : 'Authentication failed'
          );

          setAuthState('error');
        }

        return;
      }

      const storedAuth = getAuthInfo();

      if (storedAuth) {
        if (
          storedAuth.expires_at &&
          Date.now() / 1000 > storedAuth.expires_at
        ) {
          try {
            const refreshed =
              await refreshAccessToken(
                storedAuth.refresh_token,
                getAuthConfig().clientId
              );

            await completeAuth(refreshed);
          } catch {
            clearAllAuthData();
            setAuthState('unauthenticated');
          }

          return;
        }

        const storedAccounts = getDerivAccounts();

        if (storedAccounts && storedAccounts.length > 0) {
          setAccounts(storedAccounts);

          const loginId =
            getActiveLoginId() ??
            storedAccounts[0].account_id;

          setActiveAccountIdState(loginId);

          try {
            const otpUrl =
              await fetchOTPUrl(
                loginId,
                storedAuth
              );

            setWsUrl(otpUrl);
            setAuthState('authenticated');
          } catch {
            setAuthState('authenticated');
          }
        } else {
          await completeAuth(storedAuth);
        }
      }
    };

    init();
  }, [completeAuth, fetchOTPUrl]);

  useEffect(() => {
    activeAccountIdRef.current = activeAccountId;
  }, [activeAccountId]);

  useEffect(() => {
    if (authState !== 'authenticated') return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        tabHiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = tabHiddenAtRef.current;

      if (!hiddenAt || Date.now() - hiddenAt < 30000) return;

      tabHiddenAtRef.current = null;

      const accountId = activeAccountIdRef.current;
      const authInfo = getAuthInfo();

      if (!authInfo || !accountId) return;

      try {
        const otpUrl = await fetchOTPUrl(accountId, authInfo);
        setWsUrl(otpUrl);
      } catch {
        setWsUrl(undefined);
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () =>
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
  }, [authState, fetchOTPUrl]);

  const login = useCallback(async () => {
    await startDerivOAuth(getAuthConfig(), false);
  }, []);

  const signUp = useCallback(async () => {
    await startDerivOAuth(getAuthConfig(), true);
  }, []);

  const logout = useCallback(() => {
    coreLogout();

    setAccounts([]);
    setActiveAccountIdState(null);
    setWsUrl(undefined);
    setAuthState('unauthenticated');
    setError(null);
  }, []);

  const switchAccount =
    useCallback(
      async (accountId: string) => {
        const authInfo = getAuthInfo();

        if (!authInfo) return;

        try {
          const account =
            accounts.find(
              (a) => a.account_id === accountId
            );

          if (account) {
            setAccountType(account.account_type);
          }

          const otpUrl =
            await fetchOTPUrl(
              accountId,
              authInfo
            );

          setActiveLoginId(accountId);
          setActiveAccountIdState(accountId);
          setWsUrl(otpUrl);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Account switch failed'
          );
        }
      },
      [fetchOTPUrl, accounts]
    );

  const activeAccount =
    accounts.find(
      (acc) => acc.account_id === activeAccountId
    ) ??
    accounts[0] ??
    null;

  return {
    authState,
    accounts,
    activeAccount,
    activeAccountId,
    wsUrl,
    login,
    signUp,
    logout,
    switchAccount,
    error,
  };
}
